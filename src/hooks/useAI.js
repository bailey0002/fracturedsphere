// AI System for The Fractured Sphere
// Handles automated decision-making for non-player factions

import { useCallback, useRef } from 'react'
import { FACTIONS } from '../data/factions'
import { UNITS } from '../data/units'
import { TERRAIN_TYPES } from '../data/terrain'
import { hexId, getHexNeighbors, hexDistance } from '../utils/hexMath'
import { previewCombat, getRecommendedDoctrine, resolveCombat } from '../utils/combatResolver'

/**
 * Calculate strategic value of a hex
 */
function evaluateHexValue(hex, mapData, factionId) {
  let value = 0
  
  // Resource value
  value += (hex.resources.gold || 0) * 2
  value += (hex.resources.iron || 0) * 1.5
  value += (hex.resources.grain || 0) * 1
  
  // Capital bonus
  if (hex.isCapital) {
    value += 50
  }
  
  // Strategic position (central hexes worth more)
  const distFromCenter = hexDistance(hex.q, hex.r, 0, 0)
  value += Math.max(0, 10 - distFromCenter * 2)
  
  // Terrain value
  const terrain = TERRAIN_TYPES[hex.terrain]
  if (terrain) {
    value += terrain.defenseModifier * 10
  }
  
  // Building value
  if (hex.buildings?.length > 0) {
    value += hex.buildings.length * 15
  }
  
  // Adjacent to own territory bonus
  const neighbors = getHexNeighbors(hex.q, hex.r)
  const adjacentOwned = neighbors.filter(n => {
    const nHex = mapData[hexId(n.q, n.r)]
    return nHex && nHex.owner === factionId
  }).length
  value += adjacentOwned * 3
  
  return value
}

/**
 * Evaluate threat level of an enemy unit
 */
function evaluateThreat(enemyUnit, ownUnits, mapData) {
  const unitDef = UNITS[enemyUnit.type]
  if (!unitDef) return 0
  
  let threat = unitDef.stats.attack * 2 + unitDef.stats.defense
  
  // Health modifier
  threat *= (enemyUnit.health || 100) / 100
  
  // Proximity to own units/territory
  let minDist = Infinity
  ownUnits.forEach(unit => {
    const dist = hexDistance(enemyUnit.q, enemyUnit.r, unit.q, unit.r)
    minDist = Math.min(minDist, dist)
  })
  
  if (minDist <= 2) threat *= 1.5
  if (minDist <= 1) threat *= 2
  
  return threat
}

/**
 * Find best move for a unit based on AI personality
 */
function findBestMove(unit, validMoves, state, faction) {
  const { mapData, units } = state
  const traits = faction.aiTraits
  
  let bestMove = null
  let bestScore = -Infinity
  
  validMoves.forEach(move => {
    let score = 0
    const targetHex = mapData[hexId(move.q, move.r)]
    if (!targetHex) return
    
    // Value of capturing/claiming territory
    if (targetHex.owner !== faction.id) {
      score += evaluateHexValue(targetHex, mapData, faction.id) * traits.expansion
    }
    
    // Proximity to enemies (aggression)
    const enemyUnits = units.filter(u => u.owner !== faction.id)
    enemyUnits.forEach(enemy => {
      const dist = hexDistance(move.q, move.r, enemy.q, enemy.r)
      if (dist <= 1) {
        // Can attack from here - value based on aggression
        const attackValue = traits.aggression * 20
        score += attackValue
      }
    })
    
    // Defensive value of position
    const terrain = TERRAIN_TYPES[targetHex.terrain]
    if (terrain) {
      score += terrain.defenseModifier * 10 * (1 - traits.riskTolerance)
    }
    
    // Proximity to own capital (defensive)
    const ownCapital = Object.values(mapData).find(
      h => h.isCapital && h.owner === faction.id
    )
    if (ownCapital) {
      const distToCapital = hexDistance(move.q, move.r, ownCapital.q, ownCapital.r)
      score += (5 - distToCapital) * (1 - traits.aggression)
    }
    
    if (score > bestScore) {
      bestScore = score
      bestMove = move
    }
  })
  
  return bestMove
}

/**
 * Find best attack target for a unit
 */
function findBestTarget(unit, validAttacks, state, faction) {
  const { units, mapData } = state
  const traits = faction.aiTraits
  
  let bestTarget = null
  let bestScore = -Infinity
  
  validAttacks.forEach(attack => {
    const target = units.find(u => u.id === attack.targetId)
    if (!target) return
    
    const targetHex = mapData[hexId(target.q, target.r)]
    const terrain = targetHex?.terrain || 'plains'
    const hexBuildings = targetHex?.buildings || []
    
    // Preview combat
    const attackerDoc = getRecommendedDoctrine(unit, target, terrain, true)
    const defenderDoc = getRecommendedDoctrine(target, unit, terrain, false)
    const preview = previewCombat(unit, target, attackerDoc, defenderDoc, terrain, hexBuildings)
    
    let score = 0
    
    // Win probability
    score += preview.winProbability * traits.riskTolerance
    
    // Value of destroying target
    if (preview.defender.destroyed) {
      score += 30
      // Extra value for capturing territory
      if (targetHex) {
        score += evaluateHexValue(targetHex, mapData, faction.id)
      }
    }
    
    // Risk of losing own unit
    if (preview.attacker.destroyed) {
      score -= 40 * (1 - traits.riskTolerance)
    }
    
    // Target priority (attack damaged units, high-value targets)
    const targetDef = UNITS[target.type]
    if (targetDef) {
      score += (100 - (target.health || 100)) * 0.3 // Damaged targets
      score += targetDef.cost.gold * 0.1 // High value targets
    }
    
    if (score > bestScore) {
      bestScore = score
      bestTarget = { attack, preview, score }
    }
  })
  
  // Only attack if score meets threshold based on risk tolerance
  const threshold = 20 * (1 - traits.riskTolerance)
  if (bestTarget && bestTarget.score >= threshold) {
    return bestTarget
  }
  
  return null
}

/**
 * Main AI hook
 */
export function useAI(state, dispatch) {
  const processingRef = useRef(false)
  
  /**
   * Process a single AI faction's turn
   */
  const processAITurn = useCallback((factionId) => {
    if (processingRef.current) return Promise.resolve()
    if (factionId === state.playerFaction) return Promise.resolve()
    
    processingRef.current = true
    
    const faction = FACTIONS[factionId]
    if (!faction) {
      processingRef.current = false
      return Promise.resolve()
    }
    
    const factionUnits = state.units.filter(u => u.owner === factionId)
    
    return new Promise((resolve) => {
      let actionIndex = 0
      
      const processNextUnit = () => {
        if (actionIndex >= factionUnits.length) {
          processingRef.current = false
          resolve()
          return
        }
        
        const unit = factionUnits[actionIndex]
        
        // Skip if already moved/attacked
        if (unit.movedThisTurn && unit.attackedThisTurn) {
          actionIndex++
          setTimeout(processNextUnit, 100)
          return
        }
        
        // Get valid moves and attacks
        const validMoves = calculateValidMovesForAI(state, unit)
        const validAttacks = calculateValidAttacksForAI(state, unit)
        
        // Try to find best action
        const bestAttack = findBestTarget(unit, validAttacks, state, faction)
        const bestMove = findBestMove(unit, validMoves, state, faction)
        
        // Execute action
        if (bestAttack && !unit.attackedThisTurn) {
          // Attack - resolve immediately for AI
          const combatResult = resolveCombat(bestAttack.preview)
          const target = state.units.find(u => u.id === bestAttack.attack.targetId)
          
          // Use AI_RESOLVE_COMBAT which includes attacker/defender info directly
          dispatch({
            type: 'AI_RESOLVE_COMBAT',
            attackerId: unit.id,
            defenderId: bestAttack.attack.targetId,
            result: {
              attackerHealth: combatResult.attacker.newHealth,
              defenderHealth: combatResult.defender.newHealth,
              attackerDestroyed: combatResult.attacker.destroyed,
              defenderDestroyed: combatResult.defender.destroyed,
              attackerXPGain: combatResult.attacker.expGain || 5,
              defenderXPGain: combatResult.defender.expGain || 5,
              hexCaptured: combatResult.hexCaptured,
            }
          })
          actionIndex++
          setTimeout(processNextUnit, 500)
        } else if (bestMove && !unit.movedThisTurn) {
          // Move
          dispatch({
            type: 'MOVE_UNIT',
            unitId: unit.id,
            toQ: bestMove.q,
            toR: bestMove.r,
          })
          actionIndex++
          setTimeout(processNextUnit, 300)
        } else {
          // No action available
          actionIndex++
          setTimeout(processNextUnit, 100)
        }
      }
      
      // Start processing
      setTimeout(processNextUnit, 500)
    })
  }, [state, dispatch])
  
  /**
   * Process all AI factions
   */
  const processAllAI = useCallback(async () => {
    const aiFactions = Object.keys(FACTIONS).filter(id => id !== state.playerFaction)
    
    for (const factionId of aiFactions) {
      await processAITurn(factionId)
    }
  }, [state.playerFaction, processAITurn])
  
  /**
   * Get AI recommendation for a unit (for player hints)
   */
  const getRecommendation = useCallback((unit) => {
    const faction = FACTIONS[unit.owner]
    if (!faction) return null
    
    const validMoves = calculateValidMovesForAI(state, unit)
    const validAttacks = calculateValidAttacksForAI(state, unit)
    
    const recommendations = {
      move: null,
      attack: null,
    }
    
    if (validMoves.length > 0) {
      recommendations.move = findBestMove(unit, validMoves, state, faction)
    }
    
    if (validAttacks.length > 0) {
      recommendations.attack = findBestTarget(unit, validAttacks, state, faction)
    }
    
    return recommendations
  }, [state])
  
  return {
    processAITurn,
    processAllAI,
    getRecommendation,
    isProcessing: processingRef.current,
  }
}

// Helper functions for AI calculations
function calculateValidMovesForAI(state, unit) {
  if (!unit || unit.movedThisTurn) return []
  
  const { mapData, units } = state
  const movement = unit.stats.movement
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
      
      const hasUnit = units.find(u => 
        u.q === neighbor.q && u.r === neighbor.r && u.id !== unit.id
      )
      if (hasUnit) continue
      
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

function calculateValidAttacksForAI(state, unit) {
  if (!unit || unit.attackedThisTurn) return []
  
  const { units, relations } = state
  const range = unit.stats.range || 1
  const validAttacks = []
  
  units.forEach(target => {
    if (target.owner === unit.owner) return
    
    // Check relations - can't attack allied factions
    const relation = relations[unit.owner]?.[target.owner] || 'neutral'
    if (relation === 'allied') return
    
    const dist = hexDistance(unit.q, unit.r, target.q, target.r)
    if (dist <= range) {
      validAttacks.push({ 
        q: target.q, 
        r: target.r, 
        targetId: target.id,
        distance: dist
      })
    }
  })
  
  return validAttacks
}

export default useAI
