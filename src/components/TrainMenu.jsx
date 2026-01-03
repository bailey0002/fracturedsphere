// TrainMenu.jsx - Mobile-friendly unit training panel
// Shows available units with costs, requirements, and clear action buttons

import { useMemo } from 'react'
import { UNITS, UNIT_BRANCHES, getBranchColor } from '../data/units'
import { getResourceColor } from '../data/terrain'

// Max units that can be in training queue per hex
const MAX_QUEUE_PER_HEX = 3

export default function TrainMenu({ hex, resources, trainingQueue = [], faction, onTrain }) {
  // Get trainable units for this hex
  const trainOptions = useMemo(() => {
    if (!hex) return []
    
    // Check for academy (unlocks elite units)
    const hasAcademy = hex.buildings?.includes('academy')
    
    // Queue count for this hex
    const hexQueueCount = trainingQueue.filter(q => q.hexId === `${hex.q},${hex.r}`).length
    const queueFull = hexQueueCount >= MAX_QUEUE_PER_HEX
    
    return Object.entries(UNITS).map(([id, unit]) => {
      // Check resource costs
      const canAfford = Object.entries(unit.cost || {}).every(
        ([res, amount]) => (resources[res] || 0) >= amount
      )
      
      // Elite units require academy
      const isElite = ['tank', 'walker', 'bomber', 'artillery'].includes(id)
      const needsAcademy = isElite && !hasAcademy
      
      // Determine availability
      let unavailableReason = null
      if (queueFull) unavailableReason = 'Queue full (3 max)'
      else if (needsAcademy) unavailableReason = 'Requires Academy'
      else if (!canAfford) unavailableReason = 'Not enough resources'
      
      return {
        id,
        ...unit,
        canTrain: !unavailableReason,
        unavailableReason,
        canAfford,
        isElite,
      }
    })
  }, [hex, resources, trainingQueue])
  
  // Group by branch
  const byBranch = useMemo(() => {
    const groups = {
      [UNIT_BRANCHES.GROUND]: [],
      [UNIT_BRANCHES.AIR]: [],
      [UNIT_BRANCHES.ARMOR]: [],
    }
    trainOptions.forEach(unit => {
      const branch = unit.branch || UNIT_BRANCHES.GROUND
      if (groups[branch]) groups[branch].push(unit)
    })
    return groups
  }, [trainOptions])
  
  const available = trainOptions.filter(u => u.canTrain)
  const hasAcademy = hex?.buildings?.includes('academy')
  
  if (!hex) {
    return (
      <div className="text-center py-4">
        <p className="text-steel-light/50 text-sm">Select one of your territories first</p>
      </div>
    )
  }
  
  return (
    <div className="space-y-3">
      {/* Header with hint */}
      <div className="text-xs text-steel-light/70">
        {available.length > 0 
          ? `${available.length} unit type${available.length > 1 ? 's' : ''} available. Tap to recruit.`
          : 'Cannot train units here. Check resources or build Academy.'
        }
      </div>
      
      {/* Units by branch */}
      {Object.entries(byBranch).map(([branch, units]) => {
        if (units.length === 0) return null
        const branchName = branch === 'ground' ? 'Infantry' : branch === 'air' ? 'Air' : 'Armor'
        
        return (
          <div key={branch}>
            <div 
              className="text-xs font-display uppercase tracking-wider mb-1.5 flex items-center gap-2"
              style={{ color: getBranchColor(branch) }}
            >
              <span>{branchName}</span>
              <div className="flex-1 h-px bg-current opacity-30" />
            </div>
            
            <div className="space-y-2">
              {units.map(unit => (
                <UnitCard 
                  key={unit.id}
                  unit={unit}
                  resources={resources}
                  onTrain={() => unit.canTrain && onTrain(unit.id)}
                />
              ))}
            </div>
          </div>
        )
      })}
      
      {/* Queue status */}
      {trainingQueue.length > 0 && (
        <div className="pt-2 border-t border-steel-light/10">
          <div className="text-xs text-steel-light/50 mb-1">Training:</div>
          {trainingQueue
            .filter(q => q.hexId === `${hex.q},${hex.r}`)
            .map((item, i) => (
              <div key={i} className="text-xs flex justify-between text-yellow-400/70">
                <span>{UNITS[item.unitType]?.name || item.unitType}</span>
                <span>{item.turnsRemaining} turn{item.turnsRemaining > 1 ? 's' : ''}</span>
              </div>
            ))
          }
        </div>
      )}
      
      {/* Academy hint */}
      {!hasAcademy && (
        <div className="text-xs text-steel-light/40 pt-2 border-t border-steel-light/10">
          💡 Build an Academy to unlock elite units (Tank, Walker, Bomber, Artillery)
        </div>
      )}
    </div>
  )
}

function UnitCard({ unit, resources, onTrain }) {
  const branchColor = getBranchColor(unit.branch)
  
  return (
    <div 
      className={`bg-void-800 border rounded p-2 ${
        unit.canTrain 
          ? 'border-steel-light/20' 
          : 'border-steel-light/10 opacity-50'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-display text-sm text-steel-bright">{unit.name}</span>
            {unit.isElite && (
              <span className="text-xs px-1 py-0.5 bg-purple-900/50 text-purple-400 rounded">Elite</span>
            )}
          </div>
          
          {/* Stats */}
          <div className="flex gap-3 mt-1 text-xs font-mono">
            <span className="text-red-400">ATK:{unit.stats?.attack}</span>
            <span className="text-blue-400">DEF:{unit.stats?.defense}</span>
            <span className="text-green-400">MOV:{unit.stats?.movement}</span>
          </div>
          
          {/* Cost */}
          <div className="flex flex-wrap gap-2 mt-1.5">
            {Object.entries(unit.cost || {}).map(([res, amount]) => {
              const hasEnough = (resources[res] || 0) >= amount
              return (
                <span 
                  key={res}
                  className={`text-xs font-mono ${hasEnough ? '' : 'text-red-400'}`}
                  style={{ color: hasEnough ? getResourceColor(res) : undefined }}
                >
                  {amount} {res}
                </span>
              )
            })}
            <span className="text-xs text-steel-light/40">
              • {unit.trainTime} turn{unit.trainTime > 1 ? 's' : ''}
            </span>
          </div>
          
          {/* Unavailable reason */}
          {!unit.canTrain && unit.unavailableReason && (
            <div className="text-xs text-yellow-500/70 mt-1">
              ⚠ {unit.unavailableReason}
            </div>
          )}
        </div>
        
        {/* Train button */}
        <button
          onClick={onTrain}
          disabled={!unit.canTrain}
          className={`flex-none px-3 py-2 text-xs font-display uppercase tracking-wider rounded
                     transition-transform ${
                       unit.canTrain
                         ? 'bg-blue-900/50 text-blue-400 border border-blue-500/50 active:bg-blue-800 active:scale-95'
                         : 'bg-steel/20 text-steel-light/30 border border-steel-light/10 cursor-not-allowed'
                     }`}
        >
          Train
        </button>
      </div>
    </div>
  )
}
