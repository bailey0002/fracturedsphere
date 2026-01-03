// useGameState.js - Complete game state management
// Includes building queue, training queue, combat, and diplomacy

import { useReducer, useCallback, useMemo } from 'react'
import { generateMapData, STARTING_RESOURCES, getCurrentSeason, FACTION_STARTS } from '../data/mapData'
import { FACTIONS } from '../data/factions'
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
  ADVANCE_PHASE: 'ADVANCE_PHASE',
  END_TURN: 'END_TURN',
  SELECT_HEX: 'SELECT_HEX',
  MOVE_UNIT: 'MOVE_UNIT',
  CLEAR_SELECTION: 'CLEAR_SELECTION',
  // Building & Training
  START_BUILDING: 'START_BUILDING',
  START_TRAINING: 'START_TRAINING',
  CANCEL_BUILDING: 'CANCEL_BUILDING',
  CANCEL_TRAINING: 'CANCEL_TRAINING',
  // Combat
  INITIATE_ATTACK: 'INITIATE_ATTACK',
  RESOLVE_COMBAT: 'RESOLVE_COMBAT',
  CANCEL_COMBAT: 'CANCEL_COMBAT',
  // Diplomacy
  DIPLOMATIC_ACTION: 'DIPLOMATIC_ACTION',
}

// Generate unique IDs
let unitIdCounter = 0
const generateUnitId = () => `unit_${++unitIdCounter}_${Date.now()}`

// Create initial units for a faction
function createStartingUnits(factionId) {
  const faction = FACTIONS[factionId]
  const startPos = FACTION_STARTS[factionId]
  if (!faction || !startPos) return []
  
  return (faction.startingUnits || ['infantry', 'infantry']).map(unitType => {
    const unitDef = UNITS[unitType]
    if (!unitDef) return null
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
  }).filter(Boolean)
}

// Create initial game state
function createInitialState() {
  return {
    gameStarted: false,
    gameOver: false,
    winner: null,
    playerFaction: null,
    turn: 1,
    phase: PHASES.PRODUCTION,
    phaseIndex: 0,
    mapData: {},
    units: [],
    factionResources: {},
    relations: {},
    selectedHex: null,
    selectedUnit: null,
    validMoves: [],
    validAttacks: [],
    pendingCombat: null,
    // Queues
    buildingQueue: [],
    trainingQueue: [],
    // Diplomacy
    lastDiplomaticResult: null,
  }
}

// Initialize game with all factions
function initializeGame(state, playerFactionId) {
  const mapData = generateMapData(42)
  const allUnits = []
  const factionResources = {}
  const relations = {}
  
  Object.keys(FACTIONS).forEach(factionId => {
    factionResources[factionId] = { ...STARTING_RESOURCES }
    const units = createStartingUnits(factionId)
    allUnits.push(...units)
    
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
  const movement = unit.stats?.movement || 2
  const validMoves = []
  
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
      
      // Can't move through enemies
      const enemyUnit = units.find(u => 
        u.q === neighbor.q && u.r === neighbor.r && u.owner !== unit.owner
      )
      if (enemyUnit) continue
      
      // Can't stack with friendlies
      const friendlyUnit = units.find(u =>
        u.q === neighbor.q && u.r === neighbor.r && 
        u.owner === unit.owner && u.id !== unit.id
      )
      if (friendlyUnit) continue
      
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
  const range = unit.stats?.range || 1
  const validAttacks = []
  
  units.forEach(target => {
    if (target.owner === unit.owner) return
    
    const dist = hexDistance(unit.q, unit.r, target.q, target.r)
    if (dist <= range) {
      validAttacks.push({ q: target.q, r: target.r, targetId: target.id })
    }
  })
  
  return validAttacks
}

// Process production
function processProduction(state) {
  const { mapData, factionResources } = state
  const season = getCurrentSeason?.(state.turn) || { effects: { grainProduction: 1 } }
  const newResources = {}
  
  Object.keys(FACTIONS).forEach(factionId => {
    const resources = { ...(factionResources[factionId] || STARTING_RESOURCES) }
    
    Object.values(mapData).forEach(hex => {
      if (hex.owner === factionId) {
        resources.gold += hex.resources?.gold || 0
        resources.iron += hex.resources?.iron || 0
        resources.grain += (hex.resources?.grain || 0) * (season.effects.grainProduction || 1)
        
        // Building production
        (hex.buildings || []).forEach(buildingId => {
          const building = BUILDINGS[buildingId]
          if (building?.production) {
            Object.entries(building.production).forEach(([res, amt]) => {
              resources[res] = (resources[res] || 0) + amt
            })
          }
        })
      }
    })
    
    // Faction bonuses
    const faction = FACTIONS[factionId]
    if (faction?.bonuses?.territoryIncomeBonus) {
      resources.gold *= (1 + faction.bonuses.territoryIncomeBonus)
    }
    
    newResources[factionId] = {
      gold: Math.floor(resources.gold),
      iron: Math.floor(resources.iron),
      grain: Math.floor(resources.grain),
    }
  })
  
  return newResources
}

// Process building queue
function processBuildingQueue(state) {
  const { buildingQueue, mapData } = state
  const completedBuildings = []
  const remainingQueue = []
  
  buildingQueue.forEach(item => {
    const remaining = item.turnsRemaining - 1
    if (remaining <= 0) {
      completedBuildings.push(item)
    } else {
      remainingQueue.push({ ...item, turnsRemaining: remaining })
    }
  })
  
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
  
  return { buildingQueue: remainingQueue, mapData: updatedMapData }
}

// Process training queue
function processTrainingQueue(state) {
  const { trainingQueue, units } = state
  const completedUnits = []
  const remainingQueue = []
  
  trainingQueue.forEach(item => {
    const remaining = item.turnsRemaining - 1
    if (remaining <= 0) {
      completedUnits.push(item)
    } else {
      remainingQueue.push({ ...item, turnsRemaining: remaining })
    }
  })
  
  const newUnits = [...units]
  completedUnits.forEach(item => {
    const [q, r] = item.hexId.split(',').map(Number)
    const unitDef = UNITS[item.unitType]
    if (unitDef) {
      newUnits.push({
        id: generateUnitId(),
        type: item.unitType,
        owner: item.owner,
        q, r,
        stats: { ...unitDef.stats },
        experience: 0,
        veterancy: 'green',
        movedThisTurn: true,
        attackedThisTurn: true,
        health: 100,
      })
    }
  })
  
  return { trainingQueue: remainingQueue, units: newUnits }
}

// Game reducer
function gameReducer(state, action) {
  switch (action.type) {
    case ACTIONS.START_GAME:
      return initializeGame(state, action.factionId)
    
    case ACTIONS.ADVANCE_PHASE: {
      const nextPhaseIndex = (state.phaseIndex + 1) % PHASE_ORDER.length
      if (nextPhaseIndex === 0) {
        return gameReducer(state, { type: ACTIONS.END_TURN })
      }
      return {
        ...state,
        phase: PHASE_ORDER[nextPhaseIndex],
        phaseIndex: nextPhaseIndex,
      }
    }
    
    case ACTIONS.END_TURN: {
      const buildingResult = processBuildingQueue(state)
      const trainingResult = processTrainingQueue({ ...state, ...buildingResult })
      
      const resetUnits = trainingResult.units.map(u => ({
        ...u,
        movedThisTurn: false,
        attackedThisTurn: false,
      }))
      
      const newResources = processProduction({ 
        ...state, 
        units: resetUnits,
        mapData: buildingResult.mapData 
      })
      
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
      
      if (state.selectedHex === hexKey) {
        return { ...state, selectedHex: null, selectedUnit: null, validMoves: [], validAttacks: [] }
      }
      
      const unitOnHex = state.units.find(
        u => u.q === q && u.r === r && u.owner === state.playerFaction
      )
      
      if (unitOnHex && (state.phase === PHASES.MOVEMENT || state.phase === PHASES.COMBAT)) {
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
      
      return { ...state, selectedHex: hexKey, selectedUnit: null, validMoves: [], validAttacks: [] }
    }
    
    case ACTIONS.MOVE_UNIT: {
      const { unitId, toQ, toR } = action
      const unit = state.units.find(u => u.id === unitId)
      if (!unit) return state
      
      const isValid = state.validMoves.some(m => m.q === toQ && m.r === toR)
      if (!isValid) return state
      
      const updatedUnits = state.units.map(u => {
        if (u.id === unitId) {
          return { ...u, q: toQ, r: toR, movedThisTurn: true }
        }
        return u
      })
      
      // Capture territory
      const targetHex = state.mapData[hexId(toQ, toR)]
      let updatedMapData = state.mapData
      
      if (targetHex && targetHex.owner !== unit.owner) {
        const defenders = state.units.filter(
          u => u.q === toQ && u.r === toR && u.owner === targetHex.owner
        )
        
        if (defenders.length === 0) {
          updatedMapData = {
            ...state.mapData,
            [hexId(toQ, toR)]: { ...targetHex, owner: unit.owner },
          }
        }
      }
      
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
    
    case ACTIONS.CLEAR_SELECTION:
      return { ...state, selectedHex: null, selectedUnit: null, validMoves: [], validAttacks: [] }
    
    // ============ BUILDING ============
    case ACTIONS.START_BUILDING: {
      const { hexId: targetHexId, buildingType, owner } = action
      const building = BUILDINGS[buildingType]
      if (!building) return state
      
      const resources = { ...state.factionResources[owner] }
      const canAfford = Object.entries(building.cost || {}).every(
        ([res, amount]) => (resources[res] || 0) >= amount
      )
      if (!canAfford) return state
      
      // Deduct cost
      Object.entries(building.cost || {}).forEach(([res, amount]) => {
        resources[res] -= amount
      })
      
      const newQueueItem = {
        hexId: targetHexId,
        buildingType,
        turnsRemaining: building.buildTime || 2,
        owner,
      }
      
      return {
        ...state,
        buildingQueue: [...state.buildingQueue, newQueueItem],
        factionResources: { ...state.factionResources, [owner]: resources },
      }
    }
    
    case ACTIONS.CANCEL_BUILDING: {
      const { hexId: targetHexId, buildingType, owner } = action
      const building = BUILDINGS[buildingType]
      
      const queueIndex = state.buildingQueue.findIndex(
        item => item.hexId === targetHexId && item.buildingType === buildingType && item.owner === owner
      )
      if (queueIndex === -1) return state
      
      // Refund 50%
      const resources = { ...state.factionResources[owner] }
      if (building) {
        Object.entries(building.cost || {}).forEach(([res, amount]) => {
          resources[res] = (resources[res] || 0) + Math.floor(amount * 0.5)
        })
      }
      
      const newQueue = [...state.buildingQueue]
      newQueue.splice(queueIndex, 1)
      
      return {
        ...state,
        buildingQueue: newQueue,
        factionResources: { ...state.factionResources, [owner]: resources },
      }
    }
    
    // ============ TRAINING ============
    case ACTIONS.START_TRAINING: {
      const { hexId: targetHexId, unitType, owner } = action
      const unit = UNITS[unitType]
      if (!unit) return state
      
      const resources = { ...state.factionResources[owner] }
      const canAfford = Object.entries(unit.cost || {}).every(
        ([res, amount]) => (resources[res] || 0) >= amount
      )
      if (!canAfford) return state
      
      // Check queue limit (3 per hex)
      const hexQueueCount = state.trainingQueue.filter(q => q.hexId === targetHexId).length
      if (hexQueueCount >= 3) return state
      
      // Deduct cost
      Object.entries(unit.cost || {}).forEach(([res, amount]) => {
        resources[res] -= amount
      })
      
      // Academy reduces train time
      const hex = state.mapData[targetHexId]
      let trainTime = unit.trainTime || 1
      if (hex?.buildings?.includes('academy')) {
        trainTime = Math.max(1, Math.ceil(trainTime * 0.75))
      }
      
      const newQueueItem = {
        hexId: targetHexId,
        unitType,
        turnsRemaining: trainTime,
        owner,
      }
      
      return {
        ...state,
        trainingQueue: [...state.trainingQueue, newQueueItem],
        factionResources: { ...state.factionResources, [owner]: resources },
      }
    }
    
    case ACTIONS.CANCEL_TRAINING: {
      const { hexId: targetHexId, unitType, owner } = action
      const unit = UNITS[unitType]
      
      const queueIndex = state.trainingQueue.findIndex(
        item => item.hexId === targetHexId && item.unitType === unitType && item.owner === owner
      )
      if (queueIndex === -1) return state
      
      // Refund 50%
      const resources = { ...state.factionResources[owner] }
      if (unit) {
        Object.entries(unit.cost || {}).forEach(([res, amount]) => {
          resources[res] = (resources[res] || 0) + Math.floor(amount * 0.5)
        })
      }
      
      const newQueue = [...state.trainingQueue]
      newQueue.splice(queueIndex, 1)
      
      return {
        ...state,
        trainingQueue: newQueue,
        factionResources: { ...state.factionResources, [owner]: resources },
      }
    }
    
    // ============ COMBAT ============
    case ACTIONS.INITIATE_ATTACK: {
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
    
    case ACTIONS.RESOLVE_COMBAT: {
      const { result } = action
      if (!state.pendingCombat) return state
      
      const { attacker, defender } = state.pendingCombat
      
      let updatedUnits = state.units.map(u => {
        if (u.id === attacker.id) {
          return { ...u, attackedThisTurn: true, health: result.attackerHealth || u.health }
        }
        if (u.id === defender.id) {
          return { ...u, health: result.defenderHealth || u.health }
        }
        return u
      })
      
      // Remove dead units
      if (result.attackerDestroyed) {
        updatedUnits = updatedUnits.filter(u => u.id !== attacker.id)
      }
      if (result.defenderDestroyed) {
        updatedUnits = updatedUnits.filter(u => u.id !== defender.id)
      }
      
      return {
        ...state,
        units: updatedUnits,
        pendingCombat: null,
        validAttacks: [],
      }
    }
    
    case ACTIONS.CANCEL_COMBAT:
      return { ...state, pendingCombat: null }
    
    // ============ DIPLOMACY ============
    case ACTIONS.DIPLOMATIC_ACTION: {
      const { targetFaction, actionType } = action
      const { playerFaction, relations, factionResources } = state
      
      const newRelations = { ...relations }
      let result = { success: false, message: '' }
      
      // Simplified diplomacy
      if (actionType === 'improve') {
        const current = relations[playerFaction]?.[targetFaction] || 'neutral'
        if (current === 'hostile') {
          newRelations[playerFaction] = { ...newRelations[playerFaction], [targetFaction]: 'neutral' }
          newRelations[targetFaction] = { ...newRelations[targetFaction], [playerFaction]: 'neutral' }
          result = { success: true, message: 'Relations improved to neutral' }
        } else if (current === 'neutral') {
          newRelations[playerFaction] = { ...newRelations[playerFaction], [targetFaction]: 'friendly' }
          newRelations[targetFaction] = { ...newRelations[targetFaction], [playerFaction]: 'friendly' }
          result = { success: true, message: 'Relations improved to friendly' }
        } else {
          result = { success: false, message: 'Relations already at maximum' }
        }
      } else if (actionType === 'declare_war') {
        newRelations[playerFaction] = { ...newRelations[playerFaction], [targetFaction]: 'hostile' }
        newRelations[targetFaction] = { ...newRelations[targetFaction], [playerFaction]: 'hostile' }
        result = { success: true, message: 'War declared!' }
      }
      
      return {
        ...state,
        relations: newRelations,
        lastDiplomaticResult: result,
      }
    }
    
    default:
      return state
  }
}

// ============ HOOK ============
export function useGameState() {
  const [state, dispatch] = useReducer(gameReducer, null, createInitialState)
  
  const startGame = useCallback((factionId) => {
    dispatch({ type: ACTIONS.START_GAME, factionId })
  }, [])
  
  const selectHex = useCallback((q, r) => {
    dispatch({ type: ACTIONS.SELECT_HEX, q, r })
  }, [])
  
  const moveUnit = useCallback((toQ, toR) => {
    if (!state.selectedUnit) return
    dispatch({ type: ACTIONS.MOVE_UNIT, unitId: state.selectedUnit, toQ, toR })
  }, [state.selectedUnit])
  
  const advancePhase = useCallback(() => {
    dispatch({ type: ACTIONS.ADVANCE_PHASE })
  }, [])
  
  const endTurn = useCallback(() => {
    dispatch({ type: ACTIONS.END_TURN })
  }, [])
  
  const clearSelection = useCallback(() => {
    dispatch({ type: ACTIONS.CLEAR_SELECTION })
  }, [])
  
  // Building
  const startBuilding = useCallback((hexId, buildingType, owner) => {
    dispatch({ type: ACTIONS.START_BUILDING, hexId, buildingType, owner })
  }, [])
  
  const cancelBuilding = useCallback((hexId, buildingType, owner) => {
    dispatch({ type: ACTIONS.CANCEL_BUILDING, hexId, buildingType, owner })
  }, [])
  
  // Training
  const startTraining = useCallback((hexId, unitType, owner) => {
    dispatch({ type: ACTIONS.START_TRAINING, hexId, unitType, owner })
  }, [])
  
  const cancelTraining = useCallback((hexId, unitType, owner) => {
    dispatch({ type: ACTIONS.CANCEL_TRAINING, hexId, unitType, owner })
  }, [])
  
  // Combat
  const initiateAttack = useCallback((attackerId, defenderId) => {
    dispatch({ type: ACTIONS.INITIATE_ATTACK, attackerId, defenderId })
  }, [])
  
  const resolveCombat = useCallback((result) => {
    dispatch({ type: ACTIONS.RESOLVE_COMBAT, result })
  }, [])
  
  const cancelCombat = useCallback(() => {
    dispatch({ type: ACTIONS.CANCEL_COMBAT })
  }, [])
  
  // Diplomacy
  const performDiplomaticAction = useCallback((targetFaction, actionType) => {
    dispatch({ type: ACTIONS.DIPLOMATIC_ACTION, targetFaction, actionType })
  }, [])
  
  const actions = useMemo(() => ({
    startGame,
    selectHex,
    moveUnit,
    advancePhase,
    endTurn,
    clearSelection,
    startBuilding,
    cancelBuilding,
    startTraining,
    cancelTraining,
    initiateAttack,
    resolveCombat,
    cancelCombat,
    performDiplomaticAction,
  }), [
    startGame, selectHex, moveUnit, advancePhase, endTurn, clearSelection,
    startBuilding, cancelBuilding, startTraining, cancelTraining,
    initiateAttack, resolveCombat, cancelCombat, performDiplomaticAction
  ])
  
  return { state, actions, dispatch }
}

export { ACTIONS }
