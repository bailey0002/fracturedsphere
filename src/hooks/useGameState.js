// Core game state management for The Fractured Sphere
// Fresh implementation with 3-phase turn structure: Command → Conflict → Maneuver

import { useReducer, useCallback, useMemo } from 'react'
import { generateMapData, STARTING_RESOURCES, FACTION_STARTS, getTerritoryCount } from '../data/mapData'
import { FACTIONS } from '../data/factions'
import { UNITS, getVeterancyLevel, VETERANCY_LEVELS, EXPERIENCE_THRESHOLDS } from '../data/units'
import { hexId, getHexNeighbors, hexDistance, parseHexId } from '../utils/hexMath'
import { TERRAIN_TYPES, BUILDINGS } from '../data/terrain'

// =============================================================================
// PHASE DEFINITIONS
// =============================================================================

export const PHASES = {
  COMMAND: 'command',     // Buy, build, plan
  CONFLICT: 'conflict',   // Attack declarations + resolution
  MANEUVER: 'maneuver',   // Non-combat movement + income
}

export const PHASE_ORDER = ['command', 'conflict', 'maneuver']

export const PHASE_INFO = {
  command: {
    name: 'Command',
    description: 'Issue production orders and construct buildings.',
    icon: '⚙',
  },
  conflict: {
    name: 'Conflict',
    description: 'Declare attacks and resolve combat.',
    icon: '⚔',
  },
  maneuver: {
    name: 'Maneuver',
    description: 'Move units and collect income.',
    icon: '→',
  },
}

// =============================================================================
// ACTION TYPES
// =============================================================================

const ACTIONS = {
  // Game flow
  START_GAME: 'START_GAME',
  ADVANCE_PHASE: 'ADVANCE_PHASE',
  END_TURN: 'END_TURN',
  
  // Selection
  SELECT_HEX: 'SELECT_HEX',
  SELECT_UNIT: 'SELECT_UNIT',
  CLEAR_SELECTION: 'CLEAR_SELECTION',
  
  // Movement
  MOVE_UNIT: 'MOVE_UNIT',
  
  // Combat
  INITIATE_COMBAT: 'INITIATE_COMBAT',
  SELECT_DOCTRINE: 'SELECT_DOCTRINE',
  RESOLVE_COMBAT: 'RESOLVE_COMBAT',
  CANCEL_COMBAT: 'CANCEL_COMBAT',
  
  // Production
  QUEUE_BUILDING: 'QUEUE_BUILDING',
  QUEUE_UNIT: 'QUEUE_UNIT',
  CANCEL_QUEUE: 'CANCEL_QUEUE',
  
  // Diplomacy
  UPDATE_DIPLOMACY: 'UPDATE_DIPLOMACY',
  
  // Map
  CAPTURE_HEX: 'CAPTURE_HEX',
  UPDATE_VISIBILITY: 'UPDATE_VISIBILITY',
  
  // Resources
  UPDATE_RESOURCES: 'UPDATE_RESOURCES',
  
  // AI
  SET_AI_THINKING: 'SET_AI_THINKING',
  AI_ACTION: 'AI_ACTION',
}

// =============================================================================
// UNIT ID GENERATION
// =============================================================================

let unitIdCounter = 0
const generateUnitId = () => `unit_${++unitIdCounter}`

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

// Create starting units for a faction
function createStartingUnits(factionId) {
  const faction = FACTIONS[factionId]
  const startPos = FACTION_STARTS[factionId]
  
  if (!faction || !startPos) return []
  
  return faction.startingUnits.map((unitType) => {
    const unitDef = UNITS[unitType]
    if (!unitDef) return null
    
    return {
      id: generateUnitId(),
      type: unitType,
      owner: factionId,
      q: startPos.q,
      r: startPos.r,
      health: 100,
      experience: 0,
      veterancy: 'green',
      movedThisTurn: false,
      attackedThisTurn: false,
    }
  }).filter(Boolean)
}

// Calculate valid moves for a unit
function calculateValidMoves(state, unit) {
  if (!unit || unit.movedThisTurn) return []
  
  const { mapData, units } = state
  const unitDef = UNITS[unit.type]
  if (!unitDef) return []
  
  const movement = unitDef.stats.movement
  const validMoves = []
  
  // BFS to find all reachable hexes
  const visited = new Set()
  const queue = [{ q: unit.q, r: unit.r, remaining: movement }]
  visited.add(hexId(unit.q, unit.r))
  
  while (queue.length > 0) {
    const current = queue.shift()
    const neighbors = getHexNeighbors(current.q, current.r)
    
    for (const neighbor of neighbors) {
      const nId = hexId(neighbor.q, neighbor.r)
      if (visited.has(nId)) continue
      
      const hex = mapData[nId]
      if (!hex) continue
      
      // Get terrain movement cost
      const terrain = TERRAIN_TYPES[hex.terrain]
      const moveCost = terrain?.movementCost || 1
      
      // Check if we have enough movement
      if (current.remaining < moveCost) continue
      
      // Check for enemy units (can't move through)
      const enemyUnit = units.find(u => 
        u.q === neighbor.q && 
        u.r === neighbor.r && 
        u.owner !== unit.owner
      )
      if (enemyUnit) continue
      
      // Check for friendly units (can't stack)
      const friendlyUnit = units.find(u =>
        u.q === neighbor.q &&
        u.r === neighbor.r &&
        u.owner === unit.owner &&
        u.id !== unit.id
      )
      if (friendlyUnit) continue
      
      visited.add(nId)
      validMoves.push({ q: neighbor.q, r: neighbor.r })
      
      // Continue BFS if movement remaining
      if (current.remaining > moveCost) {
        queue.push({ 
          q: neighbor.q, 
          r: neighbor.r, 
          remaining: current.remaining - moveCost 
        })
      }
    }
  }
  
  return validMoves
}

// Calculate valid attack targets for a unit
function calculateValidAttacks(state, unit) {
  if (!unit || unit.attackedThisTurn) return []
  
  const { units } = state
  const unitDef = UNITS[unit.type]
  if (!unitDef) return []
  
  const range = unitDef.stats.range || 1
  const validAttacks = []
  
  // Find enemy units in range
  units.forEach(target => {
    if (target.owner === unit.owner) return
    if (target.health <= 0) return
    
    const dist = hexDistance(unit.q, unit.r, target.q, target.r)
    if (dist <= range) {
      validAttacks.push({ 
        q: target.q, 
        r: target.r, 
        targetId: target.id,
        targetOwner: target.owner,
      })
    }
  })
  
  return validAttacks
}

// Process production (income collection)
function collectIncome(state) {
  const { mapData, factionResources } = state
  const newResources = {}
  
  Object.keys(FACTIONS).forEach(factionId => {
    const current = factionResources[factionId] || { gold: 0, iron: 0, grain: 0, influence: 0 }
    const income = { gold: 0, iron: 0, grain: 0, influence: 0 }
    
    // Income from territories
    Object.values(mapData).forEach(hex => {
      if (hex.owner === factionId) {
        const terrain = TERRAIN_TYPES[hex.terrain]
        if (terrain?.resourceYield) {
          income.gold += terrain.resourceYield.gold || 0
          income.iron += terrain.resourceYield.iron || 0
          income.grain += terrain.resourceYield.grain || 0
        }
        
        // Income from buildings
        hex.buildings?.forEach(buildingId => {
          const building = BUILDINGS[buildingId]
          if (building?.production) {
            income.gold += building.production.gold || 0
            income.iron += building.production.iron || 0
            income.grain += building.production.grain || 0
            income.influence += building.production.influence || 0
          }
        })
      }
    })
    
    // Apply faction bonuses
    const faction = FACTIONS[factionId]
    if (faction?.bonuses?.territoryIncomeBonus) {
      income.gold = Math.floor(income.gold * (1 + faction.bonuses.territoryIncomeBonus))
    }
    
    newResources[factionId] = {
      gold: current.gold + income.gold,
      iron: current.iron + income.iron,
      grain: current.grain + income.grain,
      influence: current.influence + income.influence,
      lastIncome: income,
    }
  })
  
  return newResources
}

// Process queued buildings and units
function processQueues(state) {
  let { mapData, units, buildingQueue, trainingQueue, factionResources } = state
  const completedBuildings = []
  const completedUnits = []
  
  // Process building queue
  const newBuildingQueue = buildingQueue.map(item => ({
    ...item,
    turnsRemaining: item.turnsRemaining - 1,
  })).filter(item => {
    if (item.turnsRemaining <= 0) {
      // Complete the building
      const hexKey = hexId(item.q, item.r)
      if (mapData[hexKey]) {
        mapData = {
          ...mapData,
          [hexKey]: {
            ...mapData[hexKey],
            buildings: [...(mapData[hexKey].buildings || []), item.buildingId],
          },
        }
        completedBuildings.push(item)
      }
      return false
    }
    return true
  })
  
  // Process training queue
  const newUnits = [...units]
  const newTrainingQueue = trainingQueue.map(item => ({
    ...item,
    turnsRemaining: item.turnsRemaining - 1,
  })).filter(item => {
    if (item.turnsRemaining <= 0) {
      // Spawn the unit
      const unitDef = UNITS[item.unitType]
      if (unitDef) {
        newUnits.push({
          id: generateUnitId(),
          type: item.unitType,
          owner: item.owner,
          q: item.q,
          r: item.r,
          health: 100,
          experience: 0,
          veterancy: 'green',
          movedThisTurn: true, // Can't move on spawn turn
          attackedThisTurn: true,
        })
        completedUnits.push(item)
      }
      return false
    }
    return true
  })
  
  return {
    mapData,
    units: newUnits,
    buildingQueue: newBuildingQueue,
    trainingQueue: newTrainingQueue,
    completedBuildings,
    completedUnits,
  }
}

// Update visibility for all factions
function updateAllVisibility(mapData, units) {
  const newMapData = { ...mapData }
  
  // Reset visibility (keep explored)
  Object.keys(newMapData).forEach(key => {
    newMapData[key] = {
      ...newMapData[key],
      visible: {},
    }
  })
  
  // Set visibility from owned territories and units
  Object.keys(FACTIONS).forEach(factionId => {
    // Owned hexes and their neighbors are visible
    Object.values(newMapData).forEach(hex => {
      if (hex.owner === factionId) {
        newMapData[hex.id].visible[factionId] = true
        newMapData[hex.id].explored[factionId] = true
        
        const neighbors = getHexNeighbors(hex.q, hex.r)
        neighbors.forEach(n => {
          const nId = hexId(n.q, n.r)
          if (newMapData[nId]) {
            newMapData[nId].visible[factionId] = true
            newMapData[nId].explored[factionId] = true
          }
        })
      }
    })
    
    // Unit sight ranges
    units.filter(u => u.owner === factionId && u.health > 0).forEach(unit => {
      const unitDef = UNITS[unit.type]
      const sightRange = unitDef?.stats?.sight || 2
      
      Object.values(newMapData).forEach(hex => {
        if (hexDistance(unit.q, unit.r, hex.q, hex.r) <= sightRange) {
          newMapData[hex.id].visible[factionId] = true
          newMapData[hex.id].explored[factionId] = true
        }
      })
    })
  })
  
  return newMapData
}

// Check victory conditions
function checkVictory(mapData, factionId) {
  const totalHexes = Object.keys(mapData).length
  const ownedHexes = getTerritoryCount(mapData, factionId)
  
  // Domination: 75% of territories
  if (ownedHexes / totalHexes >= 0.75) {
    return { type: 'domination', faction: factionId }
  }
  
  // Elimination: all capitals captured
  const otherCapitals = Object.values(mapData).filter(
    hex => hex.isCapital && hex.owner !== factionId && hex.owner !== null
  )
  if (otherCapitals.length === 0 && ownedHexes > 1) {
    return { type: 'elimination', faction: factionId }
  }
  
  return null
}

// =============================================================================
// INITIAL STATE
// =============================================================================

function createInitialState() {
  return {
    // Game status
    gameStarted: false,
    gameOver: false,
    victory: null,
    
    // Player info
    playerFaction: null,
    currentFaction: null, // Whose turn it is
    
    // Turn tracking
    turn: 1,
    phase: PHASES.COMMAND,
    phaseIndex: 0,
    
    // Map data
    mapData: {},
    
    // Units
    units: [],
    
    // Resources by faction
    factionResources: {},
    
    // Production queues
    buildingQueue: [],
    trainingQueue: [],
    
    // Diplomacy
    relations: {},
    
    // Selection state
    selectedHex: null,
    selectedUnit: null,
    validMoves: [],
    validAttacks: [],
    
    // Combat state
    pendingCombat: null,
    selectedDoctrine: null,
    
    // AI state
    aiThinking: false,
    
    // Turn tracking per faction
    factionTurnOrder: ['continuity', 'ascendant', 'collective', 'reclaimers'],
    currentFactionIndex: 0,
  }
}

// =============================================================================
// GAME INITIALIZATION
// =============================================================================

function initializeGame(state, playerFactionId) {
  const mapData = generateMapData(42)
  const allUnits = []
  const factionResources = {}
  const relations = {}
  
  // Initialize each faction
  Object.keys(FACTIONS).forEach(factionId => {
    // Starting resources
    factionResources[factionId] = { 
      ...STARTING_RESOURCES,
      lastIncome: { gold: 0, iron: 0, grain: 0, influence: 0 },
    }
    
    // Starting units
    const units = createStartingUnits(factionId)
    allUnits.push(...units)
    
    // Initialize relations
    relations[factionId] = {}
    Object.keys(FACTIONS).forEach(otherId => {
      if (otherId !== factionId) {
        relations[factionId][otherId] = 'neutral'
      }
    })
  })
  
  // Update initial visibility
  const mapDataWithVisibility = updateAllVisibility(mapData, allUnits)
  
  // Determine turn order (player goes first)
  const factionTurnOrder = [
    playerFactionId,
    ...Object.keys(FACTIONS).filter(id => id !== playerFactionId),
  ]
  
  return {
    ...state,
    gameStarted: true,
    playerFaction: playerFactionId,
    currentFaction: playerFactionId,
    mapData: mapDataWithVisibility,
    units: allUnits,
    factionResources,
    relations,
    factionTurnOrder,
    currentFactionIndex: 0,
  }
}

// =============================================================================
// REDUCER
// =============================================================================

function gameReducer(state, action) {
  switch (action.type) {
    
    // -------------------------------------------------------------------------
    // GAME FLOW
    // -------------------------------------------------------------------------
    
    case ACTIONS.START_GAME: {
      return initializeGame(state, action.factionId)
    }
    
    case ACTIONS.ADVANCE_PHASE: {
      const nextPhaseIndex = state.phaseIndex + 1
      
      // If we've completed all phases, advance to next faction or new turn
      if (nextPhaseIndex >= PHASE_ORDER.length) {
        // Move to next faction
        const nextFactionIndex = state.currentFactionIndex + 1
        
        if (nextFactionIndex >= state.factionTurnOrder.length) {
          // All factions have gone - new turn
          return gameReducer(state, { type: ACTIONS.END_TURN })
        }
        
        // Next faction's turn
        const nextFaction = state.factionTurnOrder[nextFactionIndex]
        return {
          ...state,
          currentFaction: nextFaction,
          currentFactionIndex: nextFactionIndex,
          phase: PHASES.COMMAND,
          phaseIndex: 0,
          selectedHex: null,
          selectedUnit: null,
          validMoves: [],
          validAttacks: [],
          aiThinking: nextFaction !== state.playerFaction,
        }
      }
      
      // Just advance phase
      return {
        ...state,
        phase: PHASE_ORDER[nextPhaseIndex],
        phaseIndex: nextPhaseIndex,
        selectedHex: null,
        selectedUnit: null,
        validMoves: [],
        validAttacks: [],
      }
    }
    
    case ACTIONS.END_TURN: {
      // Process queues
      const queueResults = processQueues(state)
      
      // Reset unit movement/attack flags
      const resetUnits = queueResults.units.map(u => ({
        ...u,
        movedThisTurn: false,
        attackedThisTurn: false,
      }))
      
      // Collect income
      const newResources = collectIncome({
        ...state,
        mapData: queueResults.mapData,
      })
      
      // Update visibility
      const newMapData = updateAllVisibility(queueResults.mapData, resetUnits)
      
      // Check victory conditions
      let victory = null
      for (const factionId of Object.keys(FACTIONS)) {
        victory = checkVictory(newMapData, factionId)
        if (victory) break
      }
      
      return {
        ...state,
        turn: state.turn + 1,
        phase: PHASES.COMMAND,
        phaseIndex: 0,
        currentFaction: state.factionTurnOrder[0],
        currentFactionIndex: 0,
        units: resetUnits,
        mapData: newMapData,
        factionResources: newResources,
        buildingQueue: queueResults.buildingQueue,
        trainingQueue: queueResults.trainingQueue,
        selectedHex: null,
        selectedUnit: null,
        validMoves: [],
        validAttacks: [],
        pendingCombat: null,
        gameOver: victory !== null,
        victory,
        aiThinking: state.factionTurnOrder[0] !== state.playerFaction,
      }
    }
    
    // -------------------------------------------------------------------------
    // SELECTION
    // -------------------------------------------------------------------------
    
    case ACTIONS.SELECT_HEX: {
      const { q, r } = action
      const hexKey = hexId(q, r)
      const hex = state.mapData[hexKey]
      
      if (!hex) return state
      
      // If clicking same hex, deselect
      if (state.selectedHex === hexKey) {
        return {
          ...state,
          selectedHex: null,
          selectedUnit: null,
          validMoves: [],
          validAttacks: [],
        }
      }
      
      // In CONFLICT phase, clicking valid attack target initiates combat
      if (state.phase === PHASES.CONFLICT && state.selectedUnit) {
        const isValidAttack = state.validAttacks.some(a => a.q === q && a.r === r)
        if (isValidAttack) {
          const attacker = state.units.find(u => u.id === state.selectedUnit)
          const defenders = state.units.filter(u => 
            u.q === q && u.r === r && u.owner !== state.currentFaction
          )
          
          if (attacker && defenders.length > 0) {
            return {
              ...state,
              pendingCombat: {
                attackerIds: [attacker.id],
                defenderIds: defenders.map(d => d.id),
                hexId: hexKey,
                hex,
              },
              selectedDoctrine: null,
            }
          }
        }
      }
      
      // In MANEUVER phase, clicking valid move target moves the unit
      if (state.phase === PHASES.MANEUVER && state.selectedUnit) {
        const isValidMove = state.validMoves.some(m => m.q === q && m.r === r)
        if (isValidMove) {
          return gameReducer(state, { 
            type: ACTIONS.MOVE_UNIT, 
            unitId: state.selectedUnit, 
            toQ: q, 
            toR: r,
          })
        }
      }
      
      // Check if there's a unit on this hex owned by current faction
      const unitOnHex = state.units.find(
        u => u.q === q && u.r === r && u.owner === state.currentFaction && u.health > 0
      )
      
      if (unitOnHex) {
        // In CONFLICT phase, calculate attack targets
        if (state.phase === PHASES.CONFLICT) {
          const validAttacks = calculateValidAttacks(state, unitOnHex)
          return {
            ...state,
            selectedHex: hexKey,
            selectedUnit: unitOnHex.id,
            validMoves: [],
            validAttacks,
          }
        }
        
        // In MANEUVER phase, calculate move targets
        if (state.phase === PHASES.MANEUVER) {
          const validMoves = calculateValidMoves(state, unitOnHex)
          return {
            ...state,
            selectedHex: hexKey,
            selectedUnit: unitOnHex.id,
            validMoves,
            validAttacks: [],
          }
        }
      }
      
      // Just select the hex (for COMMAND phase building etc.)
      return {
        ...state,
        selectedHex: hexKey,
        selectedUnit: unitOnHex?.id || null,
        validMoves: [],
        validAttacks: [],
      }
    }
    
    case ACTIONS.CLEAR_SELECTION: {
      return {
        ...state,
        selectedHex: null,
        selectedUnit: null,
        validMoves: [],
        validAttacks: [],
      }
    }
    
    // -------------------------------------------------------------------------
    // MOVEMENT
    // -------------------------------------------------------------------------
    
    case ACTIONS.MOVE_UNIT: {
      const { unitId, toQ, toR } = action
      const unit = state.units.find(u => u.id === unitId)
      if (!unit) return state
      
      // Verify move is valid
      const isValid = state.validMoves.some(m => m.q === toQ && m.r === toR)
      if (!isValid) return state
      
      const updatedUnits = state.units.map(u => {
        if (u.id === unitId) {
          return { ...u, q: toQ, r: toR, movedThisTurn: true }
        }
        return u
      })
      
      // Check if capturing undefended territory
      const targetHexKey = hexId(toQ, toR)
      const targetHex = state.mapData[targetHexKey]
      let updatedMapData = state.mapData
      
      if (targetHex && targetHex.owner !== unit.owner) {
        // Check for defenders
        const defenders = state.units.filter(
          u => u.q === toQ && u.r === toR && u.owner === targetHex.owner && u.health > 0
        )
        
        if (defenders.length === 0) {
          updatedMapData = {
            ...state.mapData,
            [targetHexKey]: {
              ...targetHex,
              owner: unit.owner,
            },
          }
        }
      }
      
      // Update visibility
      updatedMapData = updateAllVisibility(updatedMapData, updatedUnits)
      
      return {
        ...state,
        units: updatedUnits,
        mapData: updatedMapData,
        selectedHex: targetHexKey,
        validMoves: [],
        validAttacks: [],
      }
    }
    
    // -------------------------------------------------------------------------
    // COMBAT
    // -------------------------------------------------------------------------
    
    case ACTIONS.INITIATE_COMBAT: {
      return {
        ...state,
        pendingCombat: action.combat,
        selectedDoctrine: null,
      }
    }
    
    case ACTIONS.SELECT_DOCTRINE: {
      return {
        ...state,
        selectedDoctrine: action.doctrine,
      }
    }
    
    case ACTIONS.RESOLVE_COMBAT: {
      const { result } = action
      if (!result || !state.pendingCombat) return state
      
      let updatedUnits = [...state.units]
      let updatedMapData = { ...state.mapData }
      
      // Apply damage to attackers
      result.attackerCasualties.forEach(casualty => {
        updatedUnits = updatedUnits.map(u => {
          if (u.id === casualty.id) {
            const newHealth = Math.max(0, u.health - casualty.damage)
            return { ...u, health: newHealth, attackedThisTurn: true }
          }
          return u
        })
      })
      
      // Apply damage to defenders
      result.defenderCasualties.forEach(casualty => {
        updatedUnits = updatedUnits.map(u => {
          if (u.id === casualty.id) {
            const newHealth = Math.max(0, u.health - casualty.damage)
            return { ...u, health: newHealth }
          }
          return u
        })
      })
      
      // Award experience
      const xpGain = 10
      const killXp = 20
      
      updatedUnits = updatedUnits.map(u => {
        if (state.pendingCombat.attackerIds.includes(u.id) || 
            state.pendingCombat.defenderIds.includes(u.id)) {
          if (u.health > 0) {
            const newXp = u.experience + xpGain + (result.kills?.[u.id] || 0) * killXp
            const newVeterancy = getVeterancyLevel(newXp)
            return { 
              ...u, 
              experience: newXp,
              veterancy: newVeterancy.id.toLowerCase(),
            }
          }
        }
        return u
      })
      
      // Remove dead units
      updatedUnits = updatedUnits.filter(u => u.health > 0)
      
      // If attacker won, capture the hex
      if (result.attackerWins) {
        const hex = state.pendingCombat.hex
        const attacker = state.units.find(u => state.pendingCombat.attackerIds.includes(u.id))
        if (hex && attacker) {
          // Check if any defenders remain
          const remainingDefenders = updatedUnits.filter(
            u => u.q === hex.q && u.r === hex.r && u.owner !== attacker.owner
          )
          
          if (remainingDefenders.length === 0) {
            updatedMapData = {
              ...updatedMapData,
              [hex.id]: {
                ...hex,
                owner: attacker.owner,
              },
            }
          }
        }
      }
      
      // Update visibility
      updatedMapData = updateAllVisibility(updatedMapData, updatedUnits)
      
      return {
        ...state,
        units: updatedUnits,
        mapData: updatedMapData,
        pendingCombat: null,
        selectedDoctrine: null,
        selectedUnit: null,
        validAttacks: [],
      }
    }
    
    case ACTIONS.CANCEL_COMBAT: {
      return {
        ...state,
        pendingCombat: null,
        selectedDoctrine: null,
      }
    }
    
    // -------------------------------------------------------------------------
    // PRODUCTION
    // -------------------------------------------------------------------------
    
    case ACTIONS.QUEUE_BUILDING: {
      const { buildingId, q, r, factionId } = action
      const building = BUILDINGS[buildingId]
      if (!building) return state
      
      // Check resources
      const resources = state.factionResources[factionId]
      if (!resources) return state
      if (resources.gold < building.cost.gold) return state
      if (resources.iron < building.cost.iron) return state
      
      // Deduct resources
      const newResources = {
        ...state.factionResources,
        [factionId]: {
          ...resources,
          gold: resources.gold - building.cost.gold,
          iron: resources.iron - building.cost.iron,
        },
      }
      
      // Add to queue
      const queueItem = {
        id: Date.now(),
        buildingId,
        q,
        r,
        owner: factionId,
        turnsRemaining: building.buildTime,
      }
      
      return {
        ...state,
        factionResources: newResources,
        buildingQueue: [...state.buildingQueue, queueItem],
      }
    }
    
    case ACTIONS.QUEUE_UNIT: {
      const { unitType, q, r, factionId } = action
      const unitDef = UNITS[unitType]
      if (!unitDef) return state
      
      // Check resources
      const resources = state.factionResources[factionId]
      if (!resources) return state
      if (resources.gold < unitDef.cost.gold) return state
      if (resources.iron < unitDef.cost.iron) return state
      
      // Deduct resources
      const newResources = {
        ...state.factionResources,
        [factionId]: {
          ...resources,
          gold: resources.gold - unitDef.cost.gold,
          iron: resources.iron - unitDef.cost.iron,
        },
      }
      
      // Add to queue
      const queueItem = {
        id: Date.now(),
        unitType,
        q,
        r,
        owner: factionId,
        turnsRemaining: unitDef.trainTime,
      }
      
      return {
        ...state,
        factionResources: newResources,
        trainingQueue: [...state.trainingQueue, queueItem],
      }
    }
    
    // -------------------------------------------------------------------------
    // AI
    // -------------------------------------------------------------------------
    
    case ACTIONS.SET_AI_THINKING: {
      return {
        ...state,
        aiThinking: action.thinking,
      }
    }
    
    // -------------------------------------------------------------------------
    // RESOURCES
    // -------------------------------------------------------------------------
    
    case ACTIONS.UPDATE_RESOURCES: {
      const { factionId, resources } = action
      return {
        ...state,
        factionResources: {
          ...state.factionResources,
          [factionId]: {
            ...state.factionResources[factionId],
            ...resources,
          },
        },
      }
    }
    
    default:
      return state
  }
}

// =============================================================================
// HOOK
// =============================================================================

export function useGameState() {
  const [state, dispatch] = useReducer(gameReducer, null, createInitialState)
  
  // Start game
  const startGame = useCallback((factionId) => {
    dispatch({ type: ACTIONS.START_GAME, factionId })
  }, [])
  
  // Select hex
  const selectHex = useCallback((q, r) => {
    dispatch({ type: ACTIONS.SELECT_HEX, q, r })
  }, [])
  
  // Clear selection
  const clearSelection = useCallback(() => {
    dispatch({ type: ACTIONS.CLEAR_SELECTION })
  }, [])
  
  // Move unit
  const moveUnit = useCallback((unitId, toQ, toR) => {
    dispatch({ type: ACTIONS.MOVE_UNIT, unitId, toQ, toR })
  }, [])
  
  // Advance phase
  const advancePhase = useCallback(() => {
    dispatch({ type: ACTIONS.ADVANCE_PHASE })
  }, [])
  
  // End turn
  const endTurn = useCallback(() => {
    dispatch({ type: ACTIONS.END_TURN })
  }, [])
  
  // Combat actions
  const initiateCombat = useCallback((combat) => {
    dispatch({ type: ACTIONS.INITIATE_COMBAT, combat })
  }, [])
  
  const selectDoctrine = useCallback((doctrine) => {
    dispatch({ type: ACTIONS.SELECT_DOCTRINE, doctrine })
  }, [])
  
  const resolveCombat = useCallback((result) => {
    dispatch({ type: ACTIONS.RESOLVE_COMBAT, result })
  }, [])
  
  const cancelCombat = useCallback(() => {
    dispatch({ type: ACTIONS.CANCEL_COMBAT })
  }, [])
  
  // Production actions
  const queueBuilding = useCallback((buildingId, q, r, factionId) => {
    dispatch({ type: ACTIONS.QUEUE_BUILDING, buildingId, q, r, factionId })
  }, [])
  
  const queueUnit = useCallback((unitType, q, r, factionId) => {
    dispatch({ type: ACTIONS.QUEUE_UNIT, unitType, q, r, factionId })
  }, [])
  
  // AI actions
  const setAiThinking = useCallback((thinking) => {
    dispatch({ type: ACTIONS.SET_AI_THINKING, thinking })
  }, [])
  
  // Computed values
  const isPlayerTurn = useMemo(() => 
    state.currentFaction === state.playerFaction,
    [state.currentFaction, state.playerFaction]
  )
  
  const currentFactionData = useMemo(() =>
    state.currentFaction ? FACTIONS[state.currentFaction] : null,
    [state.currentFaction]
  )
  
  const playerResources = useMemo(() =>
    state.playerFaction ? state.factionResources[state.playerFaction] : null,
    [state.playerFaction, state.factionResources]
  )
  
  const selectedHexData = useMemo(() => 
    state.selectedHex ? state.mapData[state.selectedHex] : null,
    [state.selectedHex, state.mapData]
  )
  
  const selectedUnitData = useMemo(() =>
    state.selectedUnit ? state.units.find(u => u.id === state.selectedUnit) : null,
    [state.selectedUnit, state.units]
  )
  
  return {
    state,
    dispatch,
    actions: {
      startGame,
      selectHex,
      clearSelection,
      moveUnit,
      advancePhase,
      endTurn,
      initiateCombat,
      selectDoctrine,
      resolveCombat,
      cancelCombat,
      queueBuilding,
      queueUnit,
      setAiThinking,
    },
    computed: {
      isPlayerTurn,
      currentFactionData,
      playerResources,
      selectedHexData,
      selectedUnitData,
    },
  }
}

export { ACTIONS }
export default useGameState
