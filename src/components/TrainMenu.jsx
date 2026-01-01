// Unit training menu for production phase

import { useMemo } from 'react'
import { UNITS, UNIT_BRANCHES, getBranchColor } from '../data/units'
import { BUILDINGS } from '../data/terrain'
import { getResourceColor } from '../data/terrain'
import { getBranchImage, getResourceImage } from '../assets'

export default function TrainMenu({ 
  hex, 
  playerResources, 
  trainingQueue, 
  onTrain, 
  onClose 
}) {
  if (!hex) return null
  
  const existingBuildings = hex.buildings || []
  const queuedHere = trainingQueue.filter(t => t.hexId === `${hex.q},${hex.r}`)
  
  // Determine which units can be trained based on buildings
  const availableUnits = useMemo(() => {
    return Object.entries(UNITS).map(([id, unit]) => {
      // Check resource costs
      const canAfford = Object.entries(unit.cost).every(
        ([resource, amount]) => (playerResources[resource] || 0) >= amount
      )
      
      // Check building requirements
      const requiresAcademy = unit.trainTime > 2 || 
        unit.stats.attack > 15 || 
        ['elite_infantry', 'commando', 'artillery'].includes(id)
      
      const hasAcademy = existingBuildings.includes('academy')
      const meetsRequirements = !requiresAcademy || hasAcademy
      
      // Check if hex has units (one unit per hex for simplicity)
      // We could expand this with garrison capacity later
      
      const available = canAfford && meetsRequirements
      
      let reason = null
      if (!meetsRequirements) reason = 'Requires War Academy'
      else if (!canAfford) reason = 'Insufficient resources'
      
      return {
        id,
        ...unit,
        available,
        reason,
        canAfford,
        requiresAcademy,
      }
    })
  }, [hex, playerResources, existingBuildings])
  
  // Group by branch
  const unitsByBranch = useMemo(() => {
    const grouped = {}
    availableUnits.forEach(unit => {
      const branch = unit.branch || 'ground'
      if (!grouped[branch]) grouped[branch] = []
      grouped[branch].push(unit)
    })
    return grouped
  }, [availableUnits])
  
  const trainableCount = availableUnits.filter(u => u.available).length
  
  return (
    <div className="bg-steel-darker border border-steel-light/20 rounded-lg p-4 w-80">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-sm tracking-wider uppercase text-steel-bright">
          Train Units
        </h3>
        <button 
          onClick={onClose}
          className="text-steel-light/50 hover:text-steel-light transition-colors text-lg"
        >
          ×
        </button>
      </div>
      
      {/* Training queue for this hex */}
      {queuedHere.length > 0 && (
        <div className="mb-4">
          <div className="text-xs text-steel-light/50 uppercase tracking-wider mb-2">
            In Training
          </div>
          {queuedHere.map((q, i) => {
            const u = UNITS[q.unitType]
            const branchImage = getBranchImage(u?.branch)
            return (
              <div 
                key={i}
                className="flex items-center justify-between p-2 bg-primary/10 border border-primary/30 rounded mb-1"
              >
                <span className="text-sm text-primary flex items-center gap-2">
                  {branchImage && <img src={branchImage} alt="" className="w-5 h-5 object-contain" />}
                  {u?.name || q.unitType}
                </span>
                <span className="text-xs text-steel-light/70">
                  {q.turnsRemaining} turn{q.turnsRemaining !== 1 ? 's' : ''} left
                </span>
              </div>
            )
          })}
        </div>
      )}
      
      {/* Units by branch */}
      {Object.entries(unitsByBranch).map(([branch, units]) => {
        const branchImage = getBranchImage(branch)
        return (
          <div key={branch} className="mb-4">
            <div 
              className="text-xs uppercase tracking-wider mb-2 flex items-center gap-2"
              style={{ color: getBranchColor(branch) }}
            >
              {branchImage ? (
                <img src={branchImage} alt={branch} className="w-5 h-5 object-contain" />
              ) : (
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getBranchColor(branch) }} />
              )}
              {branch}
            </div>
            
            <div className="space-y-2">
              {units.map(unit => (
                <UnitOption
                  key={unit.id}
                  unit={unit}
                  onTrain={() => onTrain(unit.id)}
                />
              ))}
            </div>
          </div>
        )
      })}
      
      {trainableCount === 0 && (
        <div className="text-sm text-steel-light/50 italic text-center py-4">
          No units available for training.
          {!existingBuildings.includes('academy') && (
            <div className="mt-2 text-xs">
              Build a War Academy for advanced units.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Individual unit option
function UnitOption({ unit, onTrain }) {
  const disabled = !unit.available
  const branchImage = getBranchImage(unit.branch)
  
  return (
    <div 
      className={`
        group p-3 rounded border transition-all
        ${disabled 
          ? 'bg-steel/10 border-steel-light/5 opacity-50 cursor-not-allowed' 
          : 'bg-steel/20 hover:bg-steel/30 border-steel-light/10 hover:border-primary/30 cursor-pointer'
        }
      `}
      onClick={disabled ? undefined : onTrain}
    >
      {/* Name and train time */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          {branchImage && (
            <img src={branchImage} alt={unit.branch} className="w-6 h-6 object-contain" />
          )}
          <span className={`font-display text-sm ${disabled ? 'text-steel-light/50' : 'text-steel-bright group-hover:text-primary'} transition-colors`}>
            {unit.name}
          </span>
        </div>
        <span className="text-xs text-steel-light/50">
          {unit.trainTime} turn{unit.trainTime !== 1 ? 's' : ''}
        </span>
      </div>
      
      {/* Stats */}
      <div className="flex items-center gap-3 text-[10px] font-mono text-steel-light/70 mb-2">
        <span>ATK: {unit.stats.attack}</span>
        <span>DEF: {unit.stats.defense}</span>
        <span>MOV: {unit.stats.movement}</span>
      </div>
      
      {/* Description */}
      <p className="text-xs text-steel-light/60 mb-2">
        {unit.description}
      </p>
      
      {/* Costs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {Object.entries(unit.cost).map(([resource, amount]) => (
            <ResourceCost key={resource} resource={resource} amount={amount} />
          ))}
        </div>
        
        {unit.reason && (
          <span className="text-[10px] text-danger">{unit.reason}</span>
        )}
      </div>
      
      {/* Requirements indicator */}
      {unit.requiresAcademy && (
        <div className="mt-2 text-[10px] text-accent/70">
          ★ Requires War Academy
        </div>
      )}
    </div>
  )
}

// Resource cost display
function ResourceCost({ resource, amount }) {
  const color = getResourceColor(resource)
  const image = getResourceImage(resource)
  const icons = {
    gold: '●',
    iron: '◆',
    grain: '▲',
    influence: '★',
  }
  
  return (
    <span 
      className="text-xs font-mono flex items-center gap-1"
      style={{ color }}
    >
      {image ? (
        <img src={image} alt={resource} className="w-4 h-4 object-contain" />
      ) : (
        <span>{icons[resource] || '•'}</span>
      )}
      {amount}
    </span>
  )
}
