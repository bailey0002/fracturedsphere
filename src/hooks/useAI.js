// AI system for The Fractured Sphere
// Handles AI faction turns with Command, Conflict, and Maneuver phases

import { useEffect, useCallback, useRef } from 'react'
import { PHASES } from './useGameState'
import { FACTIONS } from '../data/factions'
import { UNITS, DOCTRINES } from '../data/units'
import { BUILDINGS, TERRAIN_TYPES } from '../data/terrain'
import { hexId, getHexNeighbors, hexDistance } from '../utils/hexMath'
import { 
  calculateUnitStrength, 
  previewCombat, 
  resolveCombat,
  getRecommendedDoctrine,
} from '../utils/combatResolver'

// AI decision delays (ms) for visual feedback
const AI_DELAYS = {
  PHASE_START: 500,
  ACTION: 400,
  COMBAT: 800,
  PHASE_END: 300,
}

export function useAI(state, actions, chronicle) {
  const isProcessingRef = useRef(false)
  const timeoutRef = useRef(null)
  
  const {
    gameStarted,
    gameOver,
    currentFaction,
    playerFaction,
    phase,
    units,
    mapData,
    factionResources,
    buildingQueue,
    trainingQueue,
    aiThinking,
  } = state
  
  const {
    advancePhase,
    endTurn,
    selectHex,
    queueBuilding,
    queueUnit,
    resolveCombat: applyResolveCombat,
    setAiThinking,
  } = actions
  
  const { addEntry, CHRONICLE_TYPES } = chronicle || { addEntry: () => {}, CHRONICLE_TYPES: {} }
  
  // Check if current faction is AI
  const isAITurn = gameStarted && !gameOver && currentFaction && currentFaction !== playerFaction
  
  // Get faction data and resources
  const factionData = currentFaction ? FACTIONS[currentFaction] : null
  const resources = currentFaction ? factionResources[currentFaction] : null
  
  // Get AI traits
  const aiTraits = factionData?.aiTraits || {
    aggression: 0.5,
    expansion: 0.5,
    economy: 0.5,
  }
  
  // ===========================================================================
  // AI DECISION MAKING
  // ===========================================================================
  
  // Get territories owned by faction
  const getOwnedTerritories = useCallback(() => {
    return Object.values(mapData).filter(hex => hex.owner === currentFaction)
  }, [mapData, currentFaction])
  
  // Get faction's units
  const getFactionUnits = useCallback(() => {
    return units.filter(u => u.owner === currentFaction && u.health > 0)
  }, [units, currentFaction])
  
  // Get enemy units
  const getEnemyUnits = useCallback(() => {
    return units.filter(u => u.owner !== currentFaction && u.health > 0)
  }, [units, currentFaction])
  
  // Evaluate building priority
  const evaluateBuildingPriority = useCallback((hex) => {
    const terrain = TERRAIN_TYPES[hex.terrain]
    if (!terrain || !terrain.canBuild?.length) return null
    
    const existingBuildings = hex.buildings || []
    const availableBuildings = terrain.canBuild.filter(
      b => !existingBuildings.includes(b)
    )
    
    if (availableBuildings.length === 0) return null
    
    // Priority based on resources and AI traits
    let best = null
    let bestScore = -1
    
    for (const buildingId of availableBuildings) {
      const building = BUILDINGS[buildingId]
      if (!building) continue
      
      // Check if can afford
      if (resources.gold < building.cost.gold) continue
      if (resources.iron < building.cost.iron) continue
      
      // Score based on AI traits
      let score = 0
      
      // Economy-focused AI likes income buildings
      if (building.production?.gold) score += building.production.gold * aiTraits.economy
      if (building.production?.iron) score += building.production.iron * aiTraits.economy * 0.8
      if (building.production?.grain) score += building.production.grain * aiTraits.economy * 0.5
      
      // Aggressive AI likes military buildings
      if (building.effects?.defenseBonus) score += building.effects.defenseBonus * 20 * aiTraits.aggression
      if (buildingId === 'academy') score += 15 * aiTraits.aggression
      if (buildingId === 'fortress') score += 20 * aiTraits.aggression
      
      // Prefer cheaper buildings early
      score -= (building.cost.gold / 50) * (1 - aiTraits.economy)
      
      if (score > bestScore) {
        bestScore = score
        best = buildingId
      }
    }
    
    return best
  }, [resources, aiTraits])
  
  // Evaluate unit training priority
  const evaluateTrainingPriority = useCallback((hex) => {
    // Can only train at capital or with certain buildings
    const canTrain = hex.isCapital || 
                     hex.buildings?.includes('academy') || 
                     hex.buildings?.includes('fortress')
    
    if (!canTrain) return null
    
    // Check if hex already has a unit or is training
    const hasUnit = units.some(u => u.q === hex.q && u.r === hex.r)
    const isTraining = trainingQueue.some(q => q.q === hex.q && q.r === hex.r)
    
    if (hasUnit || isTraining) return null
    
    // Pick unit based on AI traits and resources
    const unitOptions = Object.entries(UNITS)
    let best = null
    let bestScore = -1
    
    for (const [unitId, unitDef] of unitOptions) {
      // Check affordability
      if (resources.gold < unitDef.cost.gold) continue
      if (resources.iron < unitDef.cost.iron) continue
      
      let score = 0
      
      // Combat power
      score += (unitDef.stats.attack + unitDef.stats.defense) * aiTraits.aggression
      
      // Mobility
      score += unitDef.stats.movement * aiTraits.expansion * 3
      
      // Cost efficiency
      const costRatio = (unitDef.stats.attack + unitDef.stats.defense) / 
                        (unitDef.cost.gold + unitDef.cost.iron)
      score += costRatio * 20 * aiTraits.economy
      
      // Prefer faster training
      score -= unitDef.trainTime * 2
      
      if (score > bestScore) {
        bestScore = score
        best = unitId
      }
    }
    
    return best
  }, [resources, units, trainingQueue, aiTraits])
  
  // Evaluate attack target
  const evaluateAttackTarget = useCallback((unit) => {
    const unitDef = UNITS[unit.type]
    if (!unitDef) return null
    
    const range = unitDef.stats.range || 1
    const enemies = getEnemyUnits()
    
    let bestTarget = null
    let bestScore = -1
    
    for (const enemy of enemies) {
      const dist = hexDistance(unit.q, unit.r, enemy.q, enemy.r)
      if (dist > range) continue
      
      const enemyDef = UNITS[enemy.type]
      if (!enemyDef) continue
      
      // Get hex for terrain
      const targetHex = mapData[hexId(enemy.q, enemy.r)]
      
      // Preview combat
      const attackerDoctrine = getRecommendedDoctrine(unit, enemy, targetHex?.terrain, true)
      const defenderDoctrine = getRecommendedDoctrine(enemy, unit, targetHex?.terrain, false)
      const preview = previewCombat(unit, enemy, attackerDoctrine, defenderDoctrine, targetHex?.terrain)
      
      // Score based on win probability and target value
      let score = preview.winProbability
      
      // Bonus for likely kills
      if (preview.defender.destroyed) score += 30
      
      // Bonus for capturing valuable hexes
      if (targetHex?.isCapital) score += 40
      if (targetHex?.buildings?.length > 0) score += 10 * targetHex.buildings.length
      
      // Penalty for likely losses
      if (preview.attacker.destroyed) score -= 50
      if (preview.attacker.newHealth < 30) score -= 20
      
      // Aggressive AI is more willing to take risks
      score *= (0.5 + aiTraits.aggression)
      
      if (score > bestScore && score > 30) { // Only attack if reasonable chance
        bestScore = score
        bestTarget = {
          enemy,
          hex: targetHex,
          preview,
          attackerDoctrine,
          defenderDoctrine,
        }
      }
    }
    
    return bestTarget
  }, [getEnemyUnits, mapData, aiTraits])
  
  // Evaluate move target
  const evaluateMoveTarget = useCallback((unit) => {
    const unitDef = UNITS[unit.type]
    if (!unitDef || unit.movedThisTurn) return null
    
    const movement = unitDef.stats.movement
    const owned = getOwnedTerritories()
    const enemies = getEnemyUnits()
    
    // Find all reachable hexes
    const visited = new Set()
    const reachable = []
    const queue = [{ q: unit.q, r: unit.r, cost: 0 }]
    visited.add(hexId(unit.q, unit.r))
    
    while (queue.length > 0) {
      const current = queue.shift()
      const neighbors = getHexNeighbors(current.q, current.r)
      
      for (const neighbor of neighbors) {
        const nId = hexId(neighbor.q, neighbor.r)
        if (visited.has(nId)) continue
        
        const hex = mapData[nId]
        if (!hex) continue
        
        const terrain = TERRAIN_TYPES[hex.terrain]
        const moveCost = terrain?.movementCost || 1
        const totalCost = current.cost + moveCost
        
        if (totalCost > movement) continue
        
        // Can't move through enemies
        const hasEnemy = units.some(u => 
          u.q === neighbor.q && u.r === neighbor.r && u.owner !== currentFaction
        )
        if (hasEnemy) continue
        
        // Can't stack with friendlies
        const hasFriendly = units.some(u =>
          u.q === neighbor.q && u.r === neighbor.r && u.owner === currentFaction
        )
        if (hasFriendly) continue
        
        visited.add(nId)
        reachable.push({ hex, cost: totalCost })
        queue.push({ q: neighbor.q, r: neighbor.r, cost: totalCost })
      }
    }
    
    if (reachable.length === 0) return null
    
    // Score each reachable hex
    let bestMove = null
    let bestScore = -1
    
    for (const { hex, cost } of reachable) {
      let score = 0
      
      // Expansion: prefer unclaimed or enemy territory
      if (!hex.owner) score += 20 * aiTraits.expansion
      if (hex.owner && hex.owner !== currentFaction) score += 30 * aiTraits.aggression
      
      // Strategic value
      if (hex.isCapital && hex.owner !== currentFaction) score += 50
      if (hex.buildings?.length > 0) score += 10 * hex.buildings.length
      
      // Distance to enemies (aggressive AI wants to be close)
      const closestEnemy = enemies.reduce((min, e) => {
        const d = hexDistance(hex.q, hex.r, e.q, e.r)
        return d < min ? d : min
      }, Infinity)
      score += (5 - closestEnemy) * 5 * aiTraits.aggression
      
      // Defensive value (terrain bonuses)
      const terrain = TERRAIN_TYPES[hex.terrain]
      score += (terrain?.defenseModifier || 0) * 20 * (1 - aiTraits.aggression)
      
      // Cost efficiency (prefer shorter moves only if better)
      score -= cost * 2
      
      if (score > bestScore) {
        bestScore = score
        bestMove = hex
      }
    }
    
    return bestMove
  }, [mapData, units, currentFaction, getOwnedTerritories, getEnemyUnits, aiTraits])
  
  // ===========================================================================
  // AI PHASE EXECUTION
  // ===========================================================================
  
  const executeCommandPhase = useCallback(async () => {
    const owned = getOwnedTerritories()
    
    // Try to build or train at each territory
    for (const hex of owned) {
      // Check building queue
      const isBuilding = buildingQueue.some(
        q => q.q === hex.q && q.r === hex.r && q.owner === currentFaction
      )
      
      if (!isBuilding) {
        const buildingChoice = evaluateBuildingPriority(hex)
        if (buildingChoice) {
          await new Promise(r => setTimeout(r, AI_DELAYS.ACTION))
          queueBuilding(buildingChoice, hex.q, hex.r, currentFaction)
          
          const building = BUILDINGS[buildingChoice]
          if (chronicle?.addEntry) {
            chronicle.addEntry('system', {
              message: `${factionData?.name} begins constructing ${building?.name}.`,
              faction: currentFaction,
            })
          }
        }
      }
      
      // Try training
      const unitChoice = evaluateTrainingPriority(hex)
      if (unitChoice) {
        await new Promise(r => setTimeout(r, AI_DELAYS.ACTION))
        queueUnit(unitChoice, hex.q, hex.r, currentFaction)
        
        const unit = UNITS[unitChoice]
        if (chronicle?.addEntry) {
          chronicle.addEntry('system', {
            message: `${factionData?.name} begins training ${unit?.name}.`,
            faction: currentFaction,
          })
        }
      }
    }
  }, [
    getOwnedTerritories, 
    evaluateBuildingPriority, 
    evaluateTrainingPriority,
    buildingQueue,
    currentFaction,
    queueBuilding,
    queueUnit,
    factionData,
    chronicle,
  ])
  
  const executeConflictPhase = useCallback(async () => {
    const myUnits = getFactionUnits()
    
    for (const unit of myUnits) {
      if (unit.attackedThisTurn) continue
      
      const target = evaluateAttackTarget(unit)
      if (target) {
        await new Promise(r => setTimeout(r, AI_DELAYS.ACTION))
        
        // Resolve combat
        const result = resolveCombat(target.preview)
        
        if (chronicle?.addEntry) {
          const attackerUnit = UNITS[unit.type]
          const defenderUnit = UNITS[target.enemy.type]
          
          chronicle.addEntry('combat_result', {
            attacker: attackerUnit?.name,
            defender: defenderUnit?.name,
            attackerDestroyed: result.attacker.destroyed,
            defenderDestroyed: result.defender.destroyed,
            hexCaptured: result.hexCaptured,
            location: target.hex?.terrain,
            winner: result.defender.destroyed ? factionData?.name : 'defenders',
            loser: result.defender.destroyed ? 'defenders' : factionData?.name,
            subtype: result.defender.destroyed ? 
              (result.attacker.damageTaken < 20 ? 'victory_decisive' : 'victory_close') : 
              'defeat',
            faction: currentFaction,
          }, { important: true })
        }
        
        // Apply result
        applyResolveCombat({
          attacker: { ...result.attacker, unitId: unit.id },
          defender: { ...result.defender, unitId: target.enemy.id },
          hexCaptured: result.hexCaptured,
          hex: target.hex,
        })
        
        await new Promise(r => setTimeout(r, AI_DELAYS.COMBAT))
      }
    }
  }, [
    getFactionUnits,
    evaluateAttackTarget,
    applyResolveCombat,
    factionData,
    currentFaction,
    chronicle,
  ])
  
  const executeManeuverPhase = useCallback(async () => {
    const myUnits = getFactionUnits()
    
    for (const unit of myUnits) {
      if (unit.movedThisTurn) continue
      
      const moveTarget = evaluateMoveTarget(unit)
      if (moveTarget) {
        await new Promise(r => setTimeout(r, AI_DELAYS.ACTION))
        selectHex(moveTarget.q, moveTarget.r)
        
        // Note: Movement is handled by selectHex in maneuver phase
        // But we need to simulate the selection first
        await new Promise(r => setTimeout(r, 100))
        selectHex(unit.q, unit.r) // Select unit first
        await new Promise(r => setTimeout(r, 100))
        selectHex(moveTarget.q, moveTarget.r) // Then move
      }
    }
  }, [getFactionUnits, evaluateMoveTarget, selectHex])
  
  // ===========================================================================
  // AI TURN EXECUTION
  // ===========================================================================
  
  const executeAITurn = useCallback(async () => {
    if (isProcessingRef.current) return
    isProcessingRef.current = true
    
    try {
      if (chronicle?.addEntry) {
        chronicle.addEntry('system', {
          message: `${factionData?.name} is taking their turn...`,
          faction: currentFaction,
        })
      }
      
      await new Promise(r => setTimeout(r, AI_DELAYS.PHASE_START))
      
      // Execute phase based on current phase
      switch (phase) {
        case PHASES.COMMAND:
          await executeCommandPhase()
          break
        case PHASES.CONFLICT:
          await executeConflictPhase()
          break
        case PHASES.MANEUVER:
          await executeManeuverPhase()
          break
      }
      
      await new Promise(r => setTimeout(r, AI_DELAYS.PHASE_END))
      
      // Advance to next phase
      advancePhase()
      
    } finally {
      isProcessingRef.current = false
    }
  }, [
    phase,
    executeCommandPhase,
    executeConflictPhase,
    executeManeuverPhase,
    advancePhase,
    factionData,
    currentFaction,
    chronicle,
  ])
  
  // ===========================================================================
  // EFFECT: Trigger AI turn
  // ===========================================================================
  
  useEffect(() => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    
    // Only run for AI turns
    if (!isAITurn || !aiThinking) return
    
    // Delay before starting AI actions
    timeoutRef.current = setTimeout(() => {
      executeAITurn()
    }, AI_DELAYS.PHASE_START)
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [isAITurn, aiThinking, phase, currentFaction, executeAITurn])
  
  return {
    isAITurn,
    factionData,
  }
}

export default useAI
