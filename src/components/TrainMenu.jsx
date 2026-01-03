// TrainMenu - Unit training popup for The Fractured Sphere
// Shows available units to train at selected hex (requires capital or academy)

import { useMemo } from 'react'
import { UNITS, UNIT_BRANCHES, getBranchColor } from '../data/units'
import { BUILDINGS } from '../data/terrain'
import { FACTIONS } from '../data/factions'

export default function TrainMenu({
  hex,
  resources,
  playerFaction,
  trainingQueue = [],
  units = [],
  onTrain,
  onClose,
}) {
  const faction = playerFaction ? FACTIONS[playerFaction] : null
  
  // Determine training capability
  const trainingInfo = useMemo(() => {
    if (!hex) return { canTrain: false, buildings: [] }
    
    const isCapital = hex.isCapital
    const hasAcademy = hex.buildings?.includes('academy')
    const hasFortress = hex.buildings?.includes('fortress')
    
    return {
      canTrain: isCapital || hasAcademy || hasFortress,
      isCapital,
      hasAcademy,
      hasFortress,
      trainTimeBonus: hasAcademy ? 0.25 : 0, // Academy reduces train time
      veterancyBonus: hasAcademy, // Academy units start with XP bonus
    }
  }, [hex])
  
  // Calculate available units
  const availableUnits = useMemo(() => {
    if (!trainingInfo.canTrain) return []
    
    // Check if there's already a unit on this hex
    const hexHasUnit = units.some(u => u.q === hex.q && u.r === hex.r)
    
    // Check if already training at this location
    const alreadyTrainingHere = trainingQueue.some(
      q => q.q === hex.q && q.r === hex.r
    )
    
    return Object.values(UNITS).map(unit => {
      // Check resources
      const canAffordGold = resources.gold >= unit.cost.gold
      const canAffordIron = resources.iron >= unit.cost.iron
      const canAfford = canAffordGold && canAffordIron
      
      // Calculate effective train time with bonuses
      const baseTime = unit.trainTime
      const effectiveTime = trainingInfo.trainTimeBonus > 0
        ? Math.max(1, Math.ceil(baseTime * (1 - trainingInfo.trainTimeBonus)))
        : baseTime
      
      // Determine availability
      const available = canAfford && !alreadyTrainingHere
      const reason = alreadyTrainingHere ? 'Queue full' :
                     !canAffordGold ? 'Need gold' :
                     !canAffordIron ? 'Need iron' : null
      
      return {
        ...unit,
        available,
        reason,
        canAfford,
        effectiveTime,
        startsWithBonus: trainingInfo.veterancyBonus,
      }
    })
  }, [trainingInfo, resources, trainingQueue, units, hex])
  
  // Group units by branch
  const unitsByBranch = useMemo(() => {
    const grouped = {
      [UNIT_BRANCHES.GROUND]: [],
      [UNIT_BRANCHES.AIR]: [],
      [UNIT_BRANCHES.ARMOR]: [],
    }
    
    availableUnits.forEach(unit => {
      if (grouped[unit.branch]) {
        grouped[unit.branch].push(unit)
      }
    })
    
    return grouped
  }, [availableUnits])
  
  // Handle train selection
  const handleTrain = (unit) => {
    if (!unit.available) return
    onTrain(unit.id, hex.q, hex.r, playerFaction)
    onClose()
  }
  
  if (!hex) return null
  
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-void-950/80 backdrop-blur-sm"
      onPointerUp={(e) => e.target === e.currentTarget && onClose()}
      style={{ touchAction: 'manipulation' }}
    >
      <div 
        className="w-full max-w-md mx-4 bg-void-900 border border-steel-light/20 rounded-lg shadow-2xl overflow-hidden"
        style={{ maxHeight: '85vh' }}
      >
        {/* Header */}
        <div 
          className="px-4 py-3 border-b border-steel-light/20"
          style={{ backgroundColor: faction?.color + '20' }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-display tracking-wider text-steel-bright">
                Train Units
              </h2>
              <div className="flex items-center gap-2 text-xs text-steel-light/60">
                <span>Grid {hex.q},{hex.r}</span>
                {trainingInfo.isCapital && (
                  <span className="text-amber-400">★ Capital</span>
                )}
                {trainingInfo.hasAcademy && (
                  <span className="text-blue-400">⚔ Academy</span>
                )}
              </div>
            </div>
            <button
              onPointerUp={onClose}
              className="w-8 h-8 flex items-center justify-center text-steel-light/60 
                         hover:text-steel-bright hover:bg-steel-light/10 rounded"
              style={{ touchAction: 'manipulation' }}
            >
              ✕
            </button>
          </div>
          
          {/* Current resources */}
          <div className="flex items-center gap-4 mt-2 text-xs">
            <span className="text-amber-400">◈ {resources.gold}</span>
            <span className="text-steel-light">⬡ {resources.iron}</span>
            <span className="text-green-400">❋ {resources.grain}</span>
          </div>
          
          {/* Training bonuses */}
          {(trainingInfo.trainTimeBonus > 0 || trainingInfo.veterancyBonus) && (
            <div className="flex items-center gap-3 mt-2 text-xs text-blue-400/80">
              {trainingInfo.trainTimeBonus > 0 && (
                <span>🏛 -{Math.round(trainingInfo.trainTimeBonus * 100)}% train time</span>
              )}
              {trainingInfo.veterancyBonus && (
                <span>⭐ Units start trained</span>
              )}
            </div>
          )}
        </div>
        
        {/* Unit list by branch */}
        <div 
          className="p-3 space-y-4 overflow-y-auto"
          style={{ 
            maxHeight: '65vh',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {!trainingInfo.canTrain ? (
            <div className="text-center py-8 text-steel-light/50">
              <p className="mb-2">Cannot train units here</p>
              <p className="text-xs">Requires Capital, Academy, or Fortress</p>
            </div>
          ) : (
            Object.entries(unitsByBranch).map(([branch, branchUnits]) => (
              branchUnits.length > 0 && (
                <div key={branch}>
                  <div 
                    className="flex items-center gap-2 mb-2 text-xs font-display tracking-wider"
                    style={{ color: getBranchColor(branch) }}
                  >
                    <span>{getBranchIcon(branch)}</span>
                    <span>{getBranchName(branch)}</span>
                  </div>
                  <div className="space-y-2">
                    {branchUnits.map((unit) => (
                      <UnitCard
                        key={unit.id}
                        unit={unit}
                        onSelect={() => handleTrain(unit)}
                      />
                    ))}
                  </div>
                </div>
              )
            ))
          )}
        </div>
        
        {/* Footer */}
        <div className="px-4 py-3 border-t border-steel-light/20 bg-void-950/50">
          <button
            onPointerUp={onClose}
            className="w-full py-2 text-sm text-steel-light/60 hover:text-steel-light
                       border border-steel-light/20 hover:border-steel-light/40 rounded
                       transition-colors"
            style={{ touchAction: 'manipulation' }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// Individual unit card
function UnitCard({ unit, onSelect }) {
  const { available, reason, canAfford, effectiveTime, startsWithBonus } = unit
  const branchColor = getBranchColor(unit.branch)
  
  return (
    <div
      className={`
        p-3 rounded border transition-all duration-200
        ${available 
          ? 'border-steel-light/30 hover:border-green-500/50 hover:bg-green-500/5 cursor-pointer' 
          : 'border-steel-light/10 opacity-60'}
      `}
      onPointerUp={available ? onSelect : undefined}
      style={{ touchAction: 'manipulation' }}
    >
      <div className="flex items-start gap-3">
        {/* Unit icon */}
        <div 
          className="flex-shrink-0 w-12 h-12 rounded flex items-center justify-center"
          style={{ backgroundColor: branchColor + '20' }}
        >
          <svg viewBox="0 0 100 100" className="w-8 h-8">
            <path 
              d={unit.svgPath} 
              fill={available ? branchColor : '#4a4a5a'}
              opacity={available ? 1 : 0.5}
            />
          </svg>
        </div>
        
        {/* Unit info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-display text-steel-bright truncate">
              {unit.name}
            </h3>
            {!available && reason && (
              <span className="text-xs text-red-400/80 ml-2">
                {reason}
              </span>
            )}
          </div>
          
          <p className="text-xs text-steel-light/60 mt-0.5 line-clamp-1">
            {unit.description}
          </p>
          
          {/* Stats */}
          <div className="flex items-center gap-3 mt-2 text-xs">
            <span className="text-red-400">⚔ {unit.stats.attack}</span>
            <span className="text-blue-400">🛡 {unit.stats.defense}</span>
            <span className="text-green-400">→ {unit.stats.movement}</span>
            {unit.stats.range && unit.stats.range > 1 && (
              <span className="text-amber-400">◎ {unit.stats.range}</span>
            )}
          </div>
          
          {/* Cost and time */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2 text-xs">
              <span className={canAfford ? 'text-amber-400' : 'text-red-400'}>
                ◈ {unit.cost.gold}
              </span>
              <span className={canAfford ? 'text-steel-light' : 'text-red-400'}>
                ⬡ {unit.cost.iron}
              </span>
            </div>
            
            <div className="flex items-center gap-2 text-xs">
              <span className="text-steel-light/50">
                ⏱ {effectiveTime} {effectiveTime === 1 ? 'turn' : 'turns'}
              </span>
              {startsWithBonus && (
                <span className="text-amber-400" title="Starts as Trained">
                  ◐
                </span>
              )}
            </div>
          </div>
          
          {/* Upkeep */}
          <div className="text-xs text-steel-light/40 mt-1">
            Upkeep: {unit.upkeep.gold}◈/turn
          </div>
        </div>
      </div>
    </div>
  )
}

// Helper functions
function getBranchIcon(branch) {
  switch (branch) {
    case UNIT_BRANCHES.GROUND: return '🚶'
    case UNIT_BRANCHES.AIR: return '✈'
    case UNIT_BRANCHES.ARMOR: return '🛡'
    default: return '•'
  }
}

function getBranchName(branch) {
  switch (branch) {
    case UNIT_BRANCHES.GROUND: return 'GROUND FORCES'
    case UNIT_BRANCHES.AIR: return 'AIR FORCES'
    case UNIT_BRANCHES.ARMOR: return 'ARMORED FORCES'
    default: return 'UNKNOWN'
  }
}
