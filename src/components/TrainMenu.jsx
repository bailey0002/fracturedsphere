// Unit training menu for production phase (capital hexes)

import { useMemo } from 'react'
import { UNITS } from '../data/units'
import { FACTIONS } from '../data/factions'
import { getResourceColor } from '../data/terrain'
import { hexId as makeHexId } from '../utils/hexMath'

export default function TrainMenu({ 
  hex, 
  resources,
  trainingQueue = [], 
  faction,
  onTrain,
  compact = false,
}) {
  if (!hex) {
    return (
      <div className="text-sm text-steel-light/50 text-center py-4">
        Select your capital to train units
      </div>
    )
  }
  
  if (!hex.isCapital) {
    return (
      <div className="text-sm text-steel-light/50 text-center py-4">
        Units can only be trained at your capital
      </div>
    )
  }
  
  const factionData = FACTIONS[faction]
  const hexKey = makeHexId(hex.q, hex.r)
  const queuedHere = trainingQueue.filter(t => t.hexId === hexKey)
  const existingBuildings = hex.buildings || []
  const hasAcademy = existingBuildings.includes('academy')
  
  // Get trainable units
  const availableUnits = useMemo(() => {
    // Build list from UNITS data
    const unitList = Object.entries(UNITS || {}).map(([id, unit]) => ({ id, ...unit }))
    
    return unitList.map(unit => {
      const unitData = unit
      
      // Check if already in queue (limit concurrent training)
      const inQueue = queuedHere.some(q => q.unitType === unit.id)
      const queueFull = queuedHere.length >= 3 // Max 3 units training at once
      
      // Check resource costs
      const canAfford = Object.entries(unitData.cost || {}).every(
        ([resource, amount]) => (resources?.[resource] || 0) >= amount
      )
      
      // Check building requirements
      const requiresAcademy = unitData.requiresAcademy || unitData.tier === 'elite'
      const meetsRequirements = !requiresAcademy || hasAcademy
      
      const available = !inQueue && !queueFull && canAfford && meetsRequirements
      
      let reason = null
      if (inQueue) reason = 'Training...'
      else if (queueFull) reason = 'Queue full (3 max)'
      else if (!meetsRequirements) reason = 'Needs Academy'
      else if (!canAfford) reason = 'Need resources'
      
      return {
        id: unit.id,
        ...unitData,
        available,
        reason,
        canAfford,
        requiresAcademy,
      }
    })
  }, [hex, resources, queuedHere, faction, hasAcademy])
  
  const handleTrain = (unitId) => {
    if (onTrain) {
      onTrain(hexKey, unitId, faction)
    }
  }
  
  const trainable = availableUnits.filter(u => u.available)
  const unavailable = availableUnits.filter(u => !u.available)
  
  return (
    <div className={compact ? '' : 'p-2'}>
      {/* Currently training */}
      {queuedHere.length > 0 && (
        <div className="mb-3 p-2 bg-blue-900/20 border border-blue-500/30 rounded text-xs">
          <div className="text-blue-400 font-display uppercase tracking-wider mb-1">
            Training ({queuedHere.length}/3)
          </div>
          {queuedHere.map((item, i) => (
            <div key={i} className="text-steel-light">
              {UNITS[item.unitType]?.name || item.unitType}
              <span className="text-steel-light/50"> ({item.turnsRemaining} turn{item.turnsRemaining !== 1 ? 's' : ''})</span>
            </div>
          ))}
        </div>
      )}
      
      {/* Faction bonus hint */}
      {factionData?.combatBonus && (
        <div className="mb-2 text-xs text-steel-light/50">
          Faction bonus: {factionData.combatBonus.description || 'Active'}
        </div>
      )}
      
      {/* Trainable units */}
      {trainable.length > 0 ? (
        <div className="space-y-2">
          {trainable.map(unit => (
            <button
              key={unit.id}
              onClick={() => handleTrain(unit.id)}
              className="w-full p-2 rounded border border-steel-light/20 bg-steel/10 
                         text-left active:bg-steel/30 transition-colors"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-display text-sm text-steel-bright">
                  {unit.name}
                </span>
                <span className="text-xs text-steel-light/50">
                  {unit.trainTime || 1} turn{(unit.trainTime || 1) !== 1 ? 's' : ''}
                </span>
              </div>
              
              {/* Stats */}
              <div className="flex items-center gap-3 text-xs text-steel-light/60 mb-1">
                <span>ATK: {unit.stats?.attack || '?'}</span>
                <span>DEF: {unit.stats?.defense || '?'}</span>
                <span>MOV: {unit.stats?.movement || '?'}</span>
              </div>
              
              {/* Description */}
              {unit.description && (
                <p className="text-xs text-steel-light/50 mb-1">
                  {unit.description}
                </p>
              )}
              
              {/* Costs */}
              <div className="flex items-center gap-2 text-xs">
                {Object.entries(unit.cost || {}).map(([resource, amount]) => (
                  <span 
                    key={resource}
                    style={{ color: getResourceColor(resource) }}
                  >
                    {amount} {resource}
                  </span>
                ))}
              </div>
              
              {/* Academy requirement indicator */}
              {unit.requiresAcademy && (
                <div className="mt-1 text-xs text-purple-400">
                  ★ Elite unit
                </div>
              )}
            </button>
          ))}
        </div>
      ) : (
        <div className="text-sm text-steel-light/50 text-center py-2">
          {queuedHere.length >= 3 
            ? 'Training queue full (3 max)'
            : unavailable.length > 0
              ? 'Check resources or build Academy for elite units'
              : 'No units available'}
        </div>
      )}
      
      {/* Unavailable units */}
      {unavailable.length > 0 && trainable.length > 0 && (
        <div className="mt-3 pt-2 border-t border-steel-light/10">
          <div className="text-xs text-steel-light/40 mb-1">Unavailable:</div>
          <div className="text-xs text-steel-light/30">
            {unavailable.map(u => `${u.name} (${u.reason})`).join(', ')}
          </div>
        </div>
      )}
      
      {/* Academy hint if not built */}
      {!hasAcademy && (
        <div className="mt-3 pt-2 border-t border-steel-light/10 text-xs text-steel-light/40">
          💡 Build an Academy to unlock elite units
        </div>
      )}
    </div>
  )
}
