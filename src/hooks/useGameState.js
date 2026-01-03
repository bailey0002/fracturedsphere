// Core game state management for The Fractured Sphere

import { useReducer, useCallback, useEffect, useRef } from 'react'
import { generateMapData, STARTING_RESOURCES, getCurrentSeason, FACTION_STARTS } from '../data/mapData'
import { FACTIONS } from '../data/factions'
import { UNITS } from '../data/units'
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
    
    // UI state
    notifications: [],
    showDiplomacy: false,
    showBuildMenu: false,
    
    // Building and training queues
    buildingQueue: [],  // [{ hexId, buildingType, turnsRemaining, owner }]
    trainingQueue: [],  // [{ hexId, unitType, turnsRemaining, owner }]
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
  
  const { units } = state
  const range = unit.stats.range || 1
  const validAttacks = []
  
  // Find enemy units in range
  units.forEach(target => {
    if (target.owner === unit.owner) return
    
    const dist = hexDistance(unit.q, unit.r, target.q, target.r)
    if (dist <= range) {
      validAttacks.push({ q: target.q, r: target.r, targetId: target.id })
    }
  })
  
  return validAttacks
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
      // Reset unit movement/attack flags
      const resetUnits = state.units.map(u => ({
        ...u,
        movedThisTurn: false,
        attackedThisTurn: false,
      }))
      
      // Process production for new turn
      const newResources = processProduction({ ...state, units: resetUnits })
      
      return {
        ...state,
        turn: state.turn + 1,
        phase: PHASES.PRODUCTION,
        phaseIndex: 0,
        units: resetUnits,
        factionResources: newResources,
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
    
    case ACTIONS.START_BUILDING: {
      const { hexId: targetHexId, buildingType, owner } = action
      
      // Import BUILDINGS inline to avoid circular deps
      const BUILDINGS = {
        farm: { cost: { gold: 60, iron: 20 }, buildTime: 2 },
        mine: { cost: { gold: 80, iron: 30 }, buildTime: 2 },
        market: { cost: { gold: 100, iron: 40 }, buildTime: 2 },
        fortress: { cost: { gold: 150, iron: 100 }, buildTime: 3 },
        academy: { cost: { gold: 120, iron: 60 }, buildTime: 3 },
        port: { cost: { gold: 120, iron: 60 }, buildTime: 2 },
        relay: { cost: { gold: 80, iron: 50 }, buildTime: 1 },
      }
      
      const building = BUILDINGS[buildingType]
      if (!building) return state
      
      // Check and deduct resources
      const resources = { ...state.factionResources[owner] }
      for (const [res, amount] of Object.entries(building.cost)) {
        if ((resources[res] || 0) < amount) return state
        resources[res] -= amount
      }
      
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
    
    case ACTIONS.START_TRAINING: {
      const { hexId: targetHexId, unitType, owner } = action
      
      // Basic unit costs
      const UNIT_COSTS = {
        infantry: { cost: { gold: 30, grain: 10 }, trainTime: 1 },
        garrison: { cost: { gold: 40, grain: 15 }, trainTime: 1 },
        cavalry: { cost: { gold: 60, grain: 20 }, trainTime: 2 },
        armor: { cost: { gold: 100, iron: 50, grain: 20 }, trainTime: 3 },
        artillery: { cost: { gold: 80, iron: 40, grain: 15 }, trainTime: 2 },
        elite: { cost: { gold: 120, iron: 30, grain: 25 }, trainTime: 3 },
      }
      
      const unit = UNIT_COSTS[unitType]
      if (!unit) return state
      
      // Check and deduct resources
      const resources = { ...state.factionResources[owner] }
      for (const [res, amount] of Object.entries(unit.cost)) {
        if ((resources[res] || 0) < amount) return state
        resources[res] -= amount
      }
      
      // Add to queue
      const newQueueItem = {
        hexId: targetHexId,
        unitType,
        turnsRemaining: unit.trainTime,
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
    
    case ACTIONS.DIPLOMATIC_ACTION: {
      const { targetFaction, actionType, playerFaction } = action
      // Simplified diplomacy - just update relations
      const currentRelation = state.relations[playerFaction]?.[targetFaction] || 'neutral'
      
      let newRelation = currentRelation
      if (actionType === 'IMPROVE_RELATIONS') {
        const order = ['war', 'hostile', 'unfriendly', 'neutral', 'cordial', 'friendly', 'allied']
        const idx = order.indexOf(currentRelation)
        if (idx < order.length - 1) newRelation = order[idx + 1]
      } else if (actionType === 'DECLARE_WAR') {
        newRelation = 'war'
      }
      
      return {
        ...state,
        relations: {
          ...state.relations,
          [playerFaction]: {
            ...state.relations[playerFaction],
            [targetFaction]: newRelation,
          },
          [targetFaction]: {
            ...state.relations[targetFaction],
            [playerFaction]: newRelation,
          },
        },
        lastDiplomaticResult: { success: true, message: `Relations changed to ${newRelation}` },
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
  
  // Building actions
  const startBuilding = useCallback((hexId, buildingType, owner) => {
    dispatch({ type: ACTIONS.START_BUILDING, hexId, buildingType, owner })
  }, [])
  
  // Training actions  
  const startTraining = useCallback((hexId, unitType, owner) => {
    dispatch({ type: ACTIONS.START_TRAINING, hexId, unitType, owner })
  }, [])
  
  // Diplomacy actions
  const performDiplomaticAction = useCallback((targetFaction, actionType) => {
    dispatch({ type: ACTIONS.DIPLOMATIC_ACTION, targetFaction, actionType, playerFaction: state.playerFaction })
    return { success: true, message: 'Diplomatic action performed' }
  }, [state.playerFaction])
  
  return {
    state,
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
      startBuilding,
      startTraining,
      performDiplomaticAction,
    },
  }
}

export { ACTIONS }
