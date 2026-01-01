// Core game state management for The Fractured Sphere

import { useReducer, useCallback, useEffect, useRef } from 'react'
import { generateMapData, STARTING_RESOURCES, getCurrentSeason, FACTION_STARTS } from '../data/mapData'
import { FACTIONS, DIPLOMATIC_ACTIONS, RELATIONS } from '../data/factions'
import { UNITS } from '../data/units'
import { BUILDINGS } from '../data/terrain'
import { hexId, getHexNeighbors, hexDistance } from '../utils/hexMath'

// Turn phases
export const PHASES = {
  PRODUCTION: 'production',
  DIPLOMACY: 'diplomacy',
  MOVEMENT: 'movement',
  COMBAT: 'combat',
}

export const PHASE_ORDER = ['production', 'diplomacy', 'movement', 'combat']

// Action types
const ACTIONS = {
  START_GAME: 'START_GAME',
  SET_PLAYER_FACTION: 'SET_PLAYER_FACTION',
  ADVANCE_PHASE: 'ADVANCE_PHASE',
  END_TURN: 'END_TURN',
  SELECT_HEX: 'SELECT_HEX',
  SELECT_UNIT: 'SELECT_UNIT',
  MOVE_UNIT: 'MOVE_UNIT',
  ATTACK: 'ATTACK',
  BUILD_UNIT: 'BUILD_UNIT',
  BUILD_STRUCTURE: 'BUILD_STRUCTURE',
  CAPTURE_HEX: 'CAPTURE_HEX',
  UPDATE_RESOURCES: 'UPDATE_RESOURCES',
  UPDATE_DIPLOMACY: 'UPDATE_DIPLOMACY',
  ADD_NOTIFICATION: 'ADD_NOTIFICATION',
  DISMISS_NOTIFICATION: 'DISMISS_NOTIFICATION',
  SET_COMBAT_PREVIEW: 'SET_COMBAT_PREVIEW',
  RESOLVE_COMBAT: 'RESOLVE_COMBAT',
  CLEAR_SELECTION: 'CLEAR_SELECTION',
  START_BUILDING: 'START_BUILDING',
  CANCEL_BUILDING: 'CANCEL_BUILDING',
  START_TRAINING: 'START_TRAINING',
  CANCEL_TRAINING: 'CANCEL_TRAINING',
  DIPLOMATIC_ACTION: 'DIPLOMATIC_ACTION',
}

// Generate initial unit ID
let unitIdCounter = 0
const generateUnitId = () => `unit_${++unitIdCounter}`

// Create initial units for a faction
function createStartingUnits(factionId) {
  const faction = FACTIONS[factionId]
  const startPos = FACTION_STARTS[factionId]
  
  return faction.startingUnits.map((unitType, index) => {
    const unitDef = UNITS[unitType]
    return {
      id: generateUnitId(),
      type: unitType,
      owner: factionId,
      q: startPos.q,
      r: startPos.r,
      stats: { ...unitDef.stats },
      experience: 0,
      veterancy: 'green',
      movedThisTurn: false,
      attackedThisTurn: false,
      health: 100,
    }
  })
}

// Create initial game state
function createInitialState() {
  return {
    // Game status
    gameStarted: false,
    gameOver: false,
    winner: null,
    
    // Player info
    playerFaction: null,
    
    // Turn tracking
    turn: 1,
    phase: PHASES.PRODUCTION,
    phaseIndex: 0,
    
    // Map data
    mapData: {},
    
    // Units by faction
    units: [],
    
    // Resources by faction
    factionResources: {},
    
    // Diplomacy
    relations: {}, // { factionId: { otherFactionId: 'neutral' } }
    
    // Selection state
    selectedHex: null,
    selectedUnit: null,
    validMoves: [],
    validAttacks: [],
    
    // Combat
    combatPreview: null,
    pendingCombat: null,
    
    // Building queue
    buildingQueue: [], // [{ hexId, buildingType, turnsRemaining, owner }]
    
    // Training queue
    trainingQueue: [], // [{ hexId, unitType, turnsRemaining, owner }]
    
    // UI state
    notifications: [],
    showDiplomacy: false,
    showBuildMenu: false,
  }
}

// Initialize game with all factions
function initializeGame(state, playerFactionId) {
  const mapData = generateMapData(42)
  const allUnits = []
  const factionResources = {}
  const relations = {}
  
  // Initialize each faction
  Object.keys(FACTIONS).forEach(factionId => {
    // Starting resources
    factionResources[factionId] = { ...STARTING_RESOURCES }
    
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
  
  return {
    ...state,
    gameStarted: true,
    playerFaction: playerFactionId,
    mapData,
    units: allUnits,
    factionResources,
    relations,
  }
}

// Calculate valid moves for a unit
function calculateValidMoves(state, unit) {
  if (!unit || unit.movedThisTurn) return []
  
  const { mapData, units } = state
  const movement = unit.stats.movement
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
      
      // Check if hex has enemy units
      const enemyUnit = units.find(u => 
        u.q === neighbor.q && 
        u.r === neighbor.r && 
        u.owner !== unit.owner
      )
      if (enemyUnit) continue
      
      // Check if hex has friendly units (can't stack)
      const friendlyUnit = units.find(u =>
        u.q === neighbor.q &&
        u.r === neighbor.r &&
        u.owner === unit.owner &&
        u.id !== unit.id
      )
      if (friendlyUnit) continue
      
      // Get terrain info (simplified - would use terrain.movementCost)
      const moveCost = 1
      
      if (current.remaining >= moveCost) {
        visited.add(nId)
        validMoves.push({ q: neighbor.q, r: neighbor.r })
        
        if (current.remaining > moveCost) {
          queue.push({ 
            q: neighbor.q, 
            r: neighbor.r, 
            remaining: current.remaining - moveCost 
          })
        }
      }
    }
  }
  
  return validMoves
}

// Calculate valid attack targets for a unit
function calculateValidAttacks(state, unit) {
  if (!unit || unit.attackedThisTurn) return []
  
  const { units, relations, playerFaction } = state
  const range = unit.stats.range || 1
  const validAttacks = []
  
  // Find enemy units in range
  units.forEach(target => {
    if (target.owner === unit.owner) return
    
    // Check relations - can't attack allied factions
    const relation = relations[unit.owner]?.[target.owner] || 'neutral'
    if (relation === 'allied') return
    
    const dist = hexDistance(unit.q, unit.r, target.q, target.r)
    if (dist <= range) {
      validAttacks.push({ q: target.q, r: target.r, targetId: target.id })
    }
  })
  
  return validAttacks
}

// Process building queue at start of turn
function processBuildingQueue(state) {
  const { buildingQueue, mapData } = state
  const completedBuildings = []
  const remainingQueue = []
  
  buildingQueue.forEach(item => {
    const remaining = item.turnsRemaining - 1
    
    if (remaining <= 0) {
      // Building complete
      completedBuildings.push(item)
    } else {
      remainingQueue.push({ ...item, turnsRemaining: remaining })
    }
  })
  
  // Add completed buildings to hexes
  const updatedMapData = { ...mapData }
  completedBuildings.forEach(item => {
    const hex = updatedMapData[item.hexId]
    if (hex) {
      updatedMapData[item.hexId] = {
        ...hex,
        buildings: [...(hex.buildings || []), item.buildingType]
      }
    }
  })
  
  return {
    buildingQueue: remainingQueue,
    mapData: updatedMapData,
    completedBuildings,
  }
}

// Process training queue at start of turn
function processTrainingQueue(state) {
  const { trainingQueue, units, mapData } = state
  const completedUnits = []
  const remainingQueue = []
  
  trainingQueue.forEach(item => {
    const remaining = item.turnsRemaining - 1
    
    if (remaining <= 0) {
      // Training complete
      completedUnits.push(item)
    } else {
      remainingQueue.push({ ...item, turnsRemaining: remaining })
    }
  })
  
  // Create new units
  const newUnits = [...units]
  completedUnits.forEach(item => {
    const [q, r] = item.hexId.split(',').map(Number)
    const unitDef = UNITS[item.unitType]
    if (unitDef) {
      newUnits.push({
        id: `unit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: item.unitType,
        owner: item.owner,
        q,
        r,
        stats: { ...unitDef.stats },
        experience: 0,
        veterancy: 'green',
        movedThisTurn: false,
        attackedThisTurn: false,
        health: 100,
      })
    }
  })
  
  return {
    trainingQueue: remainingQueue,
    units: newUnits,
    completedUnits,
  }
}

// Production phase - collect resources
function processProduction(state) {
  const { mapData, factionResources } = state
  const season = getCurrentSeason(state.turn)
  const newResources = { ...factionResources }
  
  Object.keys(FACTIONS).forEach(factionId => {
    const resources = { ...newResources[factionId] }
    
    // Base income from territories
    Object.values(mapData).forEach(hex => {
      if (hex.owner === factionId) {
        resources.gold += hex.resources.gold || 0
        resources.iron += hex.resources.iron || 0
        resources.grain += (hex.resources.grain || 0) * (season.effects.grainProduction || 1)
        
        // Building production
        if (hex.buildings && hex.buildings.length > 0) {
          hex.buildings.forEach(buildingId => {
            const building = BUILDINGS[buildingId]
            if (building?.production) {
              Object.entries(building.production).forEach(([res, amount]) => {
                resources[res] = (resources[res] || 0) + amount
              })
            }
          })
        }
      }
    })
    
    // Apply faction bonuses
    const faction = FACTIONS[factionId]
    if (faction.bonuses.territoryIncomeBonus) {
      resources.gold *= (1 + faction.bonuses.territoryIncomeBonus)
    }
    
    newResources[factionId] = resources
  })
  
  return newResources
}

// Game reducer
function gameReducer(state, action) {
  switch (action.type) {
    case ACTIONS.START_GAME: {
      return initializeGame(state, action.factionId)
    }
    
    case ACTIONS.SET_PLAYER_FACTION: {
      return { ...state, playerFaction: action.factionId }
    }
    
    case ACTIONS.ADVANCE_PHASE: {
      const nextPhaseIndex = (state.phaseIndex + 1) % PHASE_ORDER.length
      const nextPhase = PHASE_ORDER[nextPhaseIndex]
      
      // If wrapping to production, it's a new turn
      if (nextPhaseIndex === 0) {
        return gameReducer(state, { type: ACTIONS.END_TURN })
      }
      
      return {
        ...state,
        phase: nextPhase,
        phaseIndex: nextPhaseIndex,
      }
    }
    
    case ACTIONS.END_TURN: {
      // Process building queue first
      const buildingResult = processBuildingQueue(state)
      
      // Process training queue
      const trainingResult = processTrainingQueue({
        ...state,
        mapData: buildingResult.mapData,
      })
      
      // Reset unit movement/attack flags (include newly trained units)
      const resetUnits = trainingResult.units.map(u => ({
        ...u,
        movedThisTurn: false,
        attackedThisTurn: false,
      }))
      
      // Process production for new turn (with updated map from completed buildings)
      const stateForProduction = { 
        ...state, 
        units: resetUnits,
        mapData: buildingResult.mapData 
      }
      const newResources = processProduction(stateForProduction)
      
      return {
        ...state,
        turn: state.turn + 1,
        phase: PHASES.PRODUCTION,
        phaseIndex: 0,
        units: resetUnits,
        factionResources: newResources,
        mapData: buildingResult.mapData,
        buildingQueue: buildingResult.buildingQueue,
        trainingQueue: trainingResult.trainingQueue,
        selectedHex: null,
        selectedUnit: null,
        validMoves: [],
        validAttacks: [],
      }
    }
    
    case ACTIONS.SELECT_HEX: {
      const { q, r } = action
      const hexKey = hexId(q, r)
      
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
      
      // Check if there's a unit on this hex owned by player
      const unitOnHex = state.units.find(
        u => u.q === q && u.r === r && u.owner === state.playerFaction
      )
      
      if (unitOnHex && state.phase === PHASES.MOVEMENT) {
        const validMoves = calculateValidMoves(state, unitOnHex)
        const validAttacks = calculateValidAttacks(state, unitOnHex)
        
        return {
          ...state,
          selectedHex: hexKey,
          selectedUnit: unitOnHex.id,
          validMoves,
          validAttacks,
        }
      }
      
      return {
        ...state,
        selectedHex: hexKey,
        selectedUnit: null,
        validMoves: [],
        validAttacks: [],
      }
    }
    
    case ACTIONS.SELECT_UNIT: {
      const unit = state.units.find(u => u.id === action.unitId)
      if (!unit || unit.owner !== state.playerFaction) return state
      
      const validMoves = calculateValidMoves(state, unit)
      const validAttacks = calculateValidAttacks(state, unit)
      
      return {
        ...state,
        selectedHex: hexId(unit.q, unit.r),
        selectedUnit: unit.id,
        validMoves,
        validAttacks,
      }
    }
    
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
      
      // Check if capturing enemy territory
      const targetHex = state.mapData[hexId(toQ, toR)]
      let updatedMapData = state.mapData
      
      if (targetHex && targetHex.owner !== unit.owner && targetHex.owner !== null) {
        // Capture hex if no defenders
        const defenders = state.units.filter(
          u => u.q === toQ && u.r === toR && u.owner === targetHex.owner
        )
        
        if (defenders.length === 0) {
          updatedMapData = {
            ...state.mapData,
            [hexId(toQ, toR)]: {
              ...targetHex,
              owner: unit.owner,
            },
          }
        }
      }
      
      // Recalculate valid moves for the unit at new position
      const movedUnit = { ...unit, q: toQ, r: toR, movedThisTurn: true }
      const newValidAttacks = calculateValidAttacks({ ...state, units: updatedUnits }, movedUnit)
      
      return {
        ...state,
        units: updatedUnits,
        mapData: updatedMapData,
        validMoves: [],
        validAttacks: newValidAttacks,
      }
    }
    
    case ACTIONS.CAPTURE_HEX: {
      const { q, r, newOwner } = action
      const key = hexId(q, r)
      
      return {
        ...state,
        mapData: {
          ...state.mapData,
          [key]: {
            ...state.mapData[key],
            owner: newOwner,
          },
        },
      }
    }
    
    case ACTIONS.CLEAR_SELECTION: {
      return {
        ...state,
        selectedHex: null,
        selectedUnit: null,
        validMoves: [],
        validAttacks: [],
        combatPreview: null,
      }
    }
    
    case ACTIONS.ADD_NOTIFICATION: {
      return {
        ...state,
        notifications: [
          ...state.notifications,
          { id: Date.now(), ...action.notification },
        ],
      }
    }
    
    case ACTIONS.DISMISS_NOTIFICATION: {
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.id),
      }
    }
    
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
    
    case 'INITIATE_ATTACK': {
      const { attackerId, defenderId } = action
      const attacker = state.units.find(u => u.id === attackerId)
      const defender = state.units.find(u => u.id === defenderId)
      
      if (!attacker || !defender) return state
      
      const defenderHex = state.mapData[hexId(defender.q, defender.r)]
      
      return {
        ...state,
        pendingCombat: {
          attacker,
          defender,
          terrain: defenderHex?.terrain || 'plains',
          hexBuildings: defenderHex?.buildings || [],
        },
      }
    }
    
    case 'RESOLVE_COMBAT': {
      const { result } = action
      const { pendingCombat } = state
      
      if (!pendingCombat) return state
      
      const { attacker, defender } = pendingCombat
      
      let updatedUnits = state.units.map(u => {
        if (u.id === attacker.id) {
          if (result.attackerDestroyed) return null
          return {
            ...u,
            health: result.attackerHealth,
            experience: (u.experience || 0) + (result.attackerXPGain || 5),
            attackedThisTurn: true,
          }
        }
        if (u.id === defender.id) {
          if (result.defenderDestroyed) return null
          return {
            ...u,
            health: result.defenderHealth,
            experience: (u.experience || 0) + (result.defenderXPGain || 5),
          }
        }
        return u
      }).filter(Boolean)
      
      // Update veterancy based on XP thresholds
      updatedUnits = updatedUnits.map(u => {
        const xp = u.experience || 0
        let veterancy = 'green'
        if (xp >= 200) veterancy = 'legendary'
        else if (xp >= 100) veterancy = 'elite'
        else if (xp >= 50) veterancy = 'veteran'
        else if (xp >= 20) veterancy = 'trained'
        return { ...u, veterancy }
      })
      
      // Capture hex if defender destroyed
      let updatedMapData = state.mapData
      if (result.defenderDestroyed || result.hexCaptured) {
        const hexKey = hexId(defender.q, defender.r)
        updatedMapData = {
          ...state.mapData,
          [hexKey]: {
            ...state.mapData[hexKey],
            owner: attacker.owner,
          },
        }
        
        // Move attacker to captured hex
        updatedUnits = updatedUnits.map(u => {
          if (u.id === attacker.id) {
            return { ...u, q: defender.q, r: defender.r }
          }
          return u
        })
      }
      
      return {
        ...state,
        units: updatedUnits,
        mapData: updatedMapData,
        pendingCombat: null,
        selectedUnit: null,
        validMoves: [],
        validAttacks: [],
      }
    }
    
    case 'CANCEL_COMBAT': {
      return {
        ...state,
        pendingCombat: null,
      }
    }
    
    case 'AI_RESOLVE_COMBAT': {
      // AI combat resolution that doesn't rely on pendingCombat
      const { attackerId, defenderId, result } = action
      const attacker = state.units.find(u => u.id === attackerId)
      const defender = state.units.find(u => u.id === defenderId)
      
      if (!attacker || !defender) return state
      
      let updatedUnits = state.units.map(u => {
        if (u.id === attackerId) {
          if (result.attackerDestroyed) return null
          return {
            ...u,
            health: result.attackerHealth,
            experience: (u.experience || 0) + (result.attackerXPGain || 5),
            attackedThisTurn: true,
          }
        }
        if (u.id === defenderId) {
          if (result.defenderDestroyed) return null
          return {
            ...u,
            health: result.defenderHealth,
            experience: (u.experience || 0) + (result.defenderXPGain || 5),
          }
        }
        return u
      }).filter(Boolean)
      
      // Update veterancy
      updatedUnits = updatedUnits.map(u => {
        const xp = u.experience || 0
        let veterancy = 'green'
        if (xp >= 200) veterancy = 'legendary'
        else if (xp >= 100) veterancy = 'elite'
        else if (xp >= 50) veterancy = 'veteran'
        else if (xp >= 20) veterancy = 'trained'
        return { ...u, veterancy }
      })
      
      // Capture hex if defender destroyed
      let updatedMapData = state.mapData
      if (result.defenderDestroyed || result.hexCaptured) {
        const hexKey = hexId(defender.q, defender.r)
        updatedMapData = {
          ...state.mapData,
          [hexKey]: {
            ...state.mapData[hexKey],
            owner: attacker.owner,
          },
        }
        
        // Move attacker to captured hex
        updatedUnits = updatedUnits.map(u => {
          if (u.id === attackerId) {
            return { ...u, q: defender.q, r: defender.r }
          }
          return u
        })
      }
      
      return {
        ...state,
        units: updatedUnits,
        mapData: updatedMapData,
      }
    }
    
    case ACTIONS.START_BUILDING: {
      const { hexId: targetHexId, buildingType, owner } = action
      const building = BUILDINGS[buildingType]
      
      if (!building) return state
      
      // Deduct resources
      const resources = { ...state.factionResources[owner] }
      let canAfford = true
      
      Object.entries(building.cost).forEach(([res, amount]) => {
        if ((resources[res] || 0) < amount) canAfford = false
        resources[res] = (resources[res] || 0) - amount
      })
      
      if (!canAfford) return state
      
      // Add to queue
      const newQueueItem = {
        hexId: targetHexId,
        buildingType,
        turnsRemaining: building.buildTime,
        owner,
      }
      
      return {
        ...state,
        buildingQueue: [...state.buildingQueue, newQueueItem],
        factionResources: {
          ...state.factionResources,
          [owner]: resources,
        },
      }
    }
    
    case ACTIONS.CANCEL_BUILDING: {
      const { hexId: targetHexId, buildingType, owner } = action
      const building = BUILDINGS[buildingType]
      
      // Find and remove from queue
      const queueIndex = state.buildingQueue.findIndex(
        item => item.hexId === targetHexId && 
                item.buildingType === buildingType && 
                item.owner === owner
      )
      
      if (queueIndex === -1) return state
      
      // Refund 50% of resources
      const resources = { ...state.factionResources[owner] }
      if (building) {
        Object.entries(building.cost).forEach(([res, amount]) => {
          resources[res] = (resources[res] || 0) + Math.floor(amount * 0.5)
        })
      }
      
      const newQueue = [...state.buildingQueue]
      newQueue.splice(queueIndex, 1)
      
      return {
        ...state,
        buildingQueue: newQueue,
        factionResources: {
          ...state.factionResources,
          [owner]: resources,
        },
      }
    }
    
    case ACTIONS.START_TRAINING: {
      const { hexId: targetHexId, unitType, owner } = action
      const unit = UNITS[unitType]
      
      if (!unit) return state
      
      // Deduct resources
      const resources = { ...state.factionResources[owner] }
      let canAfford = true
      
      Object.entries(unit.cost).forEach(([res, amount]) => {
        if ((resources[res] || 0) < amount) canAfford = false
        resources[res] = (resources[res] || 0) - amount
      })
      
      if (!canAfford) return state
      
      // Check for academy bonus
      const hex = state.mapData[targetHexId]
      let trainTime = unit.trainTime
      if (hex?.buildings?.includes('academy')) {
        trainTime = Math.max(1, Math.ceil(trainTime * 0.75)) // 25% reduction
      }
      
      // Add to queue
      const newQueueItem = {
        hexId: targetHexId,
        unitType,
        turnsRemaining: trainTime,
        owner,
      }
      
      return {
        ...state,
        trainingQueue: [...state.trainingQueue, newQueueItem],
        factionResources: {
          ...state.factionResources,
          [owner]: resources,
        },
      }
    }
    
    case ACTIONS.CANCEL_TRAINING: {
      const { hexId: targetHexId, unitType, owner } = action
      const unit = UNITS[unitType]
      
      // Find and remove from queue
      const queueIndex = state.trainingQueue.findIndex(
        item => item.hexId === targetHexId && 
                item.unitType === unitType && 
                item.owner === owner
      )
      
      if (queueIndex === -1) return state
      
      // Refund 50% of resources
      const resources = { ...state.factionResources[owner] }
      if (unit) {
        Object.entries(unit.cost).forEach(([res, amount]) => {
          resources[res] = (resources[res] || 0) + Math.floor(amount * 0.5)
        })
      }
      
      const newQueue = [...state.trainingQueue]
      newQueue.splice(queueIndex, 1)
      
      return {
        ...state,
        trainingQueue: newQueue,
        factionResources: {
          ...state.factionResources,
          [owner]: resources,
        },
      }
    }
    
    case ACTIONS.DIPLOMATIC_ACTION: {
      const { targetFaction, actionKey, playerFaction } = action
      const diplomaticAction = DIPLOMATIC_ACTIONS[actionKey]
      
      if (!diplomaticAction) return state
      
      // Deduct resources
      const resources = { ...state.factionResources[playerFaction] }
      let canAfford = true
      
      Object.entries(diplomaticAction.cost).forEach(([res, amount]) => {
        if ((resources[res] || 0) < amount) canAfford = false
        resources[res] = (resources[res] || 0) - amount
      })
      
      if (!canAfford) return state
      
      // Determine success
      let success = true
      if (diplomaticAction.successChance) {
        success = Math.random() < diplomaticAction.successChance
      }
      
      // Update relations if successful
      let newRelations = { ...state.relations }
      
      if (success) {
        const RELATION_ORDER = ['war', 'hostile', 'neutral', 'cordial', 'allied']
        const currentRelation = newRelations[playerFaction]?.[targetFaction] || 'neutral'
        let newRelation = currentRelation
        
        if (diplomaticAction.resultRelation === '+1') {
          // Improve by one level
          const currentIndex = RELATION_ORDER.indexOf(currentRelation)
          if (currentIndex < RELATION_ORDER.length - 1) {
            newRelation = RELATION_ORDER[currentIndex + 1]
          }
        } else {
          newRelation = diplomaticAction.resultRelation
        }
        
        // Update both directions
        newRelations = {
          ...newRelations,
          [playerFaction]: {
            ...newRelations[playerFaction],
            [targetFaction]: newRelation
          },
          [targetFaction]: {
            ...newRelations[targetFaction],
            [playerFaction]: newRelation
          }
        }
      }
      
      return {
        ...state,
        factionResources: {
          ...state.factionResources,
          [playerFaction]: resources,
        },
        relations: newRelations,
        lastDiplomaticResult: {
          success,
          action: actionKey,
          target: targetFaction,
        }
      }
    }
    
    default:
      return state
  }
}

// Custom hook for game state
export function useGameState() {
  const [state, dispatch] = useReducer(gameReducer, null, createInitialState)
  
  // Start game with selected faction
  const startGame = useCallback((factionId) => {
    dispatch({ type: ACTIONS.START_GAME, factionId })
  }, [])
  
  // Select a hex on the map
  const selectHex = useCallback((q, r) => {
    dispatch({ type: ACTIONS.SELECT_HEX, q, r })
  }, [])
  
  // Select a specific unit
  const selectUnit = useCallback((unitId) => {
    dispatch({ type: ACTIONS.SELECT_UNIT, unitId })
  }, [])
  
  // Move selected unit
  const moveUnit = useCallback((toQ, toR) => {
    if (!state.selectedUnit) return
    dispatch({ type: ACTIONS.MOVE_UNIT, unitId: state.selectedUnit, toQ, toR })
  }, [state.selectedUnit])
  
  // Advance to next phase
  const advancePhase = useCallback(() => {
    dispatch({ type: ACTIONS.ADVANCE_PHASE })
  }, [])
  
  // End turn (skip remaining phases)
  const endTurn = useCallback(() => {
    dispatch({ type: ACTIONS.END_TURN })
  }, [])
  
  // Clear selection
  const clearSelection = useCallback(() => {
    dispatch({ type: ACTIONS.CLEAR_SELECTION })
  }, [])
  
  // Add notification
  const addNotification = useCallback((notification) => {
    dispatch({ type: ACTIONS.ADD_NOTIFICATION, notification })
    
    // Auto-dismiss after duration
    if (notification.duration) {
      setTimeout(() => {
        dispatch({ type: ACTIONS.DISMISS_NOTIFICATION, id: Date.now() })
      }, notification.duration)
    }
  }, [])
  
  // Dismiss notification
  const dismissNotification = useCallback((id) => {
    dispatch({ type: ACTIONS.DISMISS_NOTIFICATION, id })
  }, [])
  
  // Combat actions
  const initiateAttack = useCallback((attackerId, defenderId) => {
    dispatch({ type: 'INITIATE_ATTACK', attackerId, defenderId })
  }, [])
  
  const resolveCombat = useCallback((result) => {
    dispatch({ type: 'RESOLVE_COMBAT', result })
  }, [])
  
  const cancelCombat = useCallback(() => {
    dispatch({ type: 'CANCEL_COMBAT' })
  }, [])
  
  // Building actions
  const startBuilding = useCallback((hexId, buildingType, owner) => {
    dispatch({ type: ACTIONS.START_BUILDING, hexId, buildingType, owner })
  }, [])
  
  const cancelBuilding = useCallback((hexId, buildingType, owner) => {
    dispatch({ type: ACTIONS.CANCEL_BUILDING, hexId, buildingType, owner })
  }, [])
  
  // Training actions
  const startTraining = useCallback((hexId, unitType, owner) => {
    dispatch({ type: ACTIONS.START_TRAINING, hexId, unitType, owner })
  }, [])
  
  const cancelTraining = useCallback((hexId, unitType, owner) => {
    dispatch({ type: ACTIONS.CANCEL_TRAINING, hexId, unitType, owner })
  }, [])
  
  // Diplomatic action
  const performDiplomaticAction = useCallback((targetFaction, actionKey) => {
    dispatch({ 
      type: ACTIONS.DIPLOMATIC_ACTION, 
      targetFaction, 
      actionKey, 
      playerFaction: state.playerFaction 
    })
  }, [state.playerFaction])
  
  return {
    state,
    dispatch, // Expose for AI
    actions: {
      startGame,
      selectHex,
      selectUnit,
      moveUnit,
      advancePhase,
      endTurn,
      clearSelection,
      addNotification,
      dismissNotification,
      initiateAttack,
      resolveCombat,
      cancelCombat,
      startBuilding,
      cancelBuilding,
      startTraining,
      cancelTraining,
      performDiplomaticAction,
    },
  }
}

export { ACTIONS }
