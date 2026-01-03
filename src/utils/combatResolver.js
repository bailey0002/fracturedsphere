// Combat resolution system for The Fractured Sphere

import { UNITS, DOCTRINES, VETERANCY_LEVELS, getVeterancyLevel } from '../data/units'
import { TERRAIN_TYPES, calculateTerrainBonus } from '../data/terrain'
import { FACTIONS } from '../data/factions'

/**
 * Calculate the effective combat strength of a unit
 */
export function calculateUnitStrength(unit, doctrine = null, terrain = null, isAttacker = true) {
  const unitDef = UNITS[unit.type]
  if (!unitDef) return { attack: 0, defense: 0 }
  
  // Base stats
  let attack = unitDef.stats.attack
  let defense = unitDef.stats.defense
  
  // Apply veterancy multiplier
  const vetLevel = getVeterancyLevel(unit.experience || 0)
  const vetMultiplier = vetLevel.multiplier
  attack *= vetMultiplier
  defense *= vetMultiplier
  
  // Apply health scaling (damaged units fight worse)
  const healthPercent = (unit.health || 100) / 100
  attack *= healthPercent
  defense *= healthPercent
  
  // Apply doctrine modifiers
  if (doctrine) {
    const doc = DOCTRINES[doctrine]
    if (doc) {
      attack *= (1 + doc.attackModifier)
      defense *= (1 + doc.defenseModifier)
    }
  }
  
  // Apply terrain modifiers (only for defender typically)
  if (terrain && !isAttacker) {
    const terrainDef = TERRAIN_TYPES[terrain]
    if (terrainDef) {
      // Base terrain defense modifier
      defense *= (1 + terrainDef.defenseModifier)
      
      // Branch-specific terrain modifiers
      if (terrainDef.combatModifiers && terrainDef.combatModifiers[unitDef.branch]) {
        const branchBonus = terrainDef.combatModifiers[unitDef.branch]
        if (branchBonus.defense) defense *= (1 + branchBonus.defense)
        if (branchBonus.attack) attack *= (1 + branchBonus.attack)
      }
    }
  }
  
  // Apply faction bonuses
  const faction = FACTIONS[unit.owner]
  if (faction) {
    if (faction.bonuses.attackBonus && isAttacker) {
      attack *= (1 + faction.bonuses.attackBonus)
    }
    if (faction.bonuses.defenseBonus && !isAttacker) {
      defense *= (1 + faction.bonuses.defenseBonus)
    }
  }
  
  return {
    attack: Math.round(attack * 10) / 10,
    defense: Math.round(defense * 10) / 10,
  }
}

/**
 * Calculate doctrine effectiveness (rock-paper-scissors)
 */
export function calculateDoctrineAdvantage(attackerDoctrine, defenderDoctrine) {
  if (!attackerDoctrine || !defenderDoctrine) return 0
  
  const attDoc = DOCTRINES[attackerDoctrine]
  const defDoc = DOCTRINES[defenderDoctrine]
  
  if (!attDoc || !defDoc) return 0
  
  // Check if attacker has advantage
  if (attDoc.bestAgainst?.includes(defenderDoctrine)) {
    return 0.2 // 20% bonus
  }
  
  // Check if attacker has disadvantage
  if (attDoc.weakAgainst?.includes(defenderDoctrine)) {
    return -0.2 // 20% penalty
  }
  
  return 0
}

/**
 * Preview combat outcome without applying it
 */
export function previewCombat(attacker, defender, attackerDoctrine, defenderDoctrine, terrain) {
  // Calculate effective strengths
  const attackerStrength = calculateUnitStrength(attacker, attackerDoctrine, terrain, true)
  const defenderStrength = calculateUnitStrength(defender, defenderDoctrine, terrain, false)
  
  // Calculate doctrine advantage
  const doctrineAdvantage = calculateDoctrineAdvantage(attackerDoctrine, defenderDoctrine)
  
  // Calculate total force values
  const attackForce = attackerStrength.attack * (1 + doctrineAdvantage)
  const defendForce = defenderStrength.defense
  
  // Calculate damage ratio (Lanchester-style)
  const totalForce = attackForce + defendForce
  const attackerDamageRatio = defendForce / totalForce
  const defenderDamageRatio = attackForce / totalForce
  
  // Base damage calculation
  const baseDamage = 30 // Base damage dealt per combat
  
  // Calculate expected damage
  let attackerDamage = Math.round(baseDamage * attackerDamageRatio)
  let defenderDamage = Math.round(baseDamage * defenderDamageRatio)
  
  // Apply casualty modifiers from doctrines
  const attDoc = DOCTRINES[attackerDoctrine]
  const defDoc = DOCTRINES[defenderDoctrine]
  
  if (attDoc?.casualtyModifier) {
    attackerDamage = Math.round(attackerDamage * (1 + attDoc.casualtyModifier))
  }
  if (defDoc?.casualtyModifier) {
    defenderDamage = Math.round(defenderDamage * (1 - defDoc.casualtyModifier))
  }
  
  // First strike bonus (blitz doctrine)
  let firstStrikeBonus = null
  if (attDoc?.firstStrike) {
    firstStrikeBonus = {
      extraDamage: Math.round(defenderDamage * 0.15),
      moraleDamage: attDoc.moraleDamage || 0,
    }
    defenderDamage += firstStrikeBonus.extraDamage
  }
  
  // Calculate resulting health
  const attackerNewHealth = Math.max(0, (attacker.health || 100) - attackerDamage)
  const defenderNewHealth = Math.max(0, (defender.health || 100) - defenderDamage)
  
  // Determine outcome
  const attackerDestroyed = attackerNewHealth <= 0
  const defenderDestroyed = defenderNewHealth <= 0
  
  // Calculate win probability (simplified)
  const attackerAdvantage = attackForce / defendForce
  const winProbability = Math.min(0.95, Math.max(0.05, 0.5 + (attackerAdvantage - 1) * 0.25))
  
  // Experience gained
  const expGain = {
    attacker: defenderDestroyed ? 15 : 5,
    defender: attackerDestroyed ? 15 : 5,
  }
  
  return {
    attacker: {
      unit: attacker,
      doctrine: attackerDoctrine,
      strength: attackerStrength,
      force: Math.round(attackForce * 10) / 10,
      damageTaken: attackerDamage,
      newHealth: attackerNewHealth,
      destroyed: attackerDestroyed,
      expGain: attackerDestroyed ? 0 : expGain.attacker,
    },
    defender: {
      unit: defender,
      doctrine: defenderDoctrine,
      strength: defenderStrength,
      force: Math.round(defendForce * 10) / 10,
      damageTaken: defenderDamage,
      newHealth: defenderNewHealth,
      destroyed: defenderDestroyed,
      expGain: defenderDestroyed ? 0 : expGain.defender,
    },
    doctrineAdvantage,
    terrain,
    winProbability: Math.round(winProbability * 100),
    firstStrikeBonus,
  }
}

/**
 * Resolve combat and return the result
 */
export function resolveCombat(preview, randomFactor = null) {
  // Use provided random or generate one
  const random = randomFactor !== null ? randomFactor : Math.random()
  
  // Add some variance to damage (Â±20%)
  const attackerVariance = 0.8 + (random * 0.4)
  const defenderVariance = 0.8 + ((1 - random) * 0.4)
  
  const finalAttackerDamage = Math.round(preview.attacker.damageTaken * attackerVariance)
  const finalDefenderDamage = Math.round(preview.defender.damageTaken * defenderVariance)
  
  const attackerFinalHealth = Math.max(0, (preview.attacker.unit.health || 100) - finalAttackerDamage)
  const defenderFinalHealth = Math.max(0, (preview.defender.unit.health || 100) - finalDefenderDamage)
  
  const attackerDestroyed = attackerFinalHealth <= 0
  const defenderDestroyed = defenderFinalHealth <= 0
  
  // Determine if attacker captures hex (defender destroyed, attacker survives)
  const hexCaptured = defenderDestroyed && !attackerDestroyed
  
  // Retreat logic: if defender survives but is badly damaged
  let defenderRetreats = false
  if (!defenderDestroyed && defenderFinalHealth < 30 && random > 0.5) {
    defenderRetreats = true
  }
  
  return {
    attacker: {
      ...preview.attacker,
      damageTaken: finalAttackerDamage,
      newHealth: attackerFinalHealth,
      destroyed: attackerDestroyed,
    },
    defender: {
      ...preview.defender,
      damageTaken: finalDefenderDamage,
      newHealth: defenderFinalHealth,
      destroyed: defenderDestroyed,
      retreats: defenderRetreats,
    },
    hexCaptured,
    doctrineAdvantage: preview.doctrineAdvantage,
    terrain: preview.terrain,
  }
}

/**
 * Get available doctrines for a unit
 */
export function getAvailableDoctrines(unit) {
  const unitDef = UNITS[unit.type]
  if (!unitDef) return ['assault', 'defensive']
  
  const available = ['assault', 'defensive', 'attrition']
  
  // Flanking requires mobility
  if (unitDef.stats.movement >= 3) {
    available.push('flanking')
  }
  
  // Blitz requires some mobility
  if (unitDef.stats.movement >= 2) {
    available.push('blitz')
  }
  
  // Siege for artillery and armor
  if (unitDef.branch === 'armor' || unitDef.stats.range > 1) {
    available.push('siege')
  }
  
  return available
}

/**
 * Get recommended doctrine based on situation
 */
export function getRecommendedDoctrine(unit, opponent, terrain, isAttacker) {
  const available = getAvailableDoctrines(unit)
  const unitDef = UNITS[unit.type]
  const opponentDef = UNITS[opponent.type]
  
  if (!unitDef || !opponentDef) return 'assault'
  
  // Calculate base advantage
  const attackAdvantage = unitDef.stats.attack / opponentDef.stats.defense
  const healthAdvantage = (unit.health || 100) / (opponent.health || 100)
  
  if (isAttacker) {
    // Attacker logic
    if (attackAdvantage > 1.5 && healthAdvantage > 0.8) {
      // Strong advantage - use aggressive doctrines
      if (available.includes('blitz') && unitDef.stats.movement >= 2) return 'blitz'
      return 'assault'
    }
    
    if (attackAdvantage < 0.7) {
      // Weak position - try flanking or siege
      if (available.includes('flanking')) return 'flanking'
      if (available.includes('siege')) return 'siege'
      return 'attrition'
    }
    
    // Default to assault
    return 'assault'
  } else {
    // Defender logic
    const terrainDef = TERRAIN_TYPES[terrain]
    const hasGoodTerrain = terrainDef && terrainDef.defenseModifier >= 0.2
    
    if (hasGoodTerrain || healthAdvantage < 0.7) {
      return 'defensive'
    }
    
    if (attackAdvantage > 1.2) {
      // Counter-attack
      return 'assault'
    }
    
    return 'defensive'
  }
}

/**
 * Calculate stack combat (multiple units)
 */
export function calculateStackCombat(attackers, defenders, terrain) {
  // Sum up forces for each side
  let totalAttackForce = 0
  let totalDefendForce = 0
  
  attackers.forEach(({ unit, doctrine }) => {
    const strength = calculateUnitStrength(unit, doctrine, terrain, true)
    totalAttackForce += strength.attack
  })
  
  defenders.forEach(({ unit, doctrine }) => {
    const strength = calculateUnitStrength(unit, doctrine, terrain, false)
    totalDefendForce += strength.defense
  })
  
  // Calculate overall advantage
  const advantage = totalAttackForce / (totalDefendForce || 1)
  
  return {
    attackForce: totalAttackForce,
    defendForce: totalDefendForce,
    advantage,
    attackerFavored: advantage > 1,
  }
}
