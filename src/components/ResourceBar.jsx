// ResourceBar - Compact resource display for The Fractured Sphere
// Shows gold, iron, grain, influence with territory count

import { useMemo } from 'react'

export default function ResourceBar({ resources, territories }) {
  if (!resources) {
    return (
      <div className="resource-bar flex items-center gap-3 text-xs text-steel-light/40">
        <span>Loading...</span>
      </div>
    )
  }
  
  const { gold = 0, iron = 0, grain = 0, influence = 0, lastIncome } = resources
  
  return (
    <div className="resource-bar flex items-center gap-2 sm:gap-4 text-xs sm:text-sm">
      {/* Gold */}
      <ResourceItem
        icon="◈"
        value={gold}
        income={lastIncome?.gold}
        color="text-amber-400"
        label="Gold"
      />
      
      {/* Iron */}
      <ResourceItem
        icon="⬡"
        value={iron}
        income={lastIncome?.iron}
        color="text-steel-light"
        label="Iron"
      />
      
      {/* Grain */}
      <ResourceItem
        icon="❋"
        value={grain}
        income={lastIncome?.grain}
        color="text-green-400"
        label="Grain"
      />
      
      {/* Influence */}
      <ResourceItem
        icon="✧"
        value={influence}
        income={lastIncome?.influence}
        color="text-purple-400"
        label="Influence"
        hideOnMobile
      />
      
      {/* Territory count */}
      {territories !== undefined && (
        <div className="hidden sm:flex items-center gap-1 text-steel-light/60 border-l border-steel-light/20 pl-3 ml-1">
          <span>⬢</span>
          <span className="font-mono">{territories}</span>
        </div>
      )}
    </div>
  )
}

// Individual resource display
function ResourceItem({ icon, value, income, color, label, hideOnMobile }) {
  // Format large numbers
  const displayValue = useMemo(() => {
    if (value >= 1000) {
      return (value / 1000).toFixed(1) + 'k'
    }
    return value.toString()
  }, [value])
  
  return (
    <div 
      className={`flex items-center gap-1 ${hideOnMobile ? 'hidden sm:flex' : ''}`}
      title={`${label}: ${value}${income ? ` (+${income}/turn)` : ''}`}
    >
      <span className={color}>{icon}</span>
      <span className={`font-mono ${color}`}>{displayValue}</span>
      {income > 0 && (
        <span className="text-[10px] text-green-500/70 hidden lg:inline">
          +{income}
        </span>
      )}
    </div>
  )
}

// Expanded resource panel (for modals or detailed view)
export function ResourcePanel({ resources, className = '' }) {
  if (!resources) return null
  
  const { gold = 0, iron = 0, grain = 0, influence = 0, lastIncome } = resources
  
  return (
    <div className={`resource-panel grid grid-cols-2 gap-2 ${className}`}>
      <div className="flex items-center justify-between p-2 bg-void-900/50 rounded">
        <div className="flex items-center gap-2">
          <span className="text-amber-400 text-lg">◈</span>
          <span className="text-steel-light/60 text-xs">Gold</span>
        </div>
        <div className="text-right">
          <div className="text-amber-400 font-mono">{gold}</div>
          {lastIncome?.gold > 0 && (
            <div className="text-xs text-green-500/70">+{lastIncome.gold}/turn</div>
          )}
        </div>
      </div>
      
      <div className="flex items-center justify-between p-2 bg-void-900/50 rounded">
        <div className="flex items-center gap-2">
          <span className="text-steel-light text-lg">⬡</span>
          <span className="text-steel-light/60 text-xs">Iron</span>
        </div>
        <div className="text-right">
          <div className="text-steel-light font-mono">{iron}</div>
          {lastIncome?.iron > 0 && (
            <div className="text-xs text-green-500/70">+{lastIncome.iron}/turn</div>
          )}
        </div>
      </div>
      
      <div className="flex items-center justify-between p-2 bg-void-900/50 rounded">
        <div className="flex items-center gap-2">
          <span className="text-green-400 text-lg">❋</span>
          <span className="text-steel-light/60 text-xs">Grain</span>
        </div>
        <div className="text-right">
          <div className="text-green-400 font-mono">{grain}</div>
          {lastIncome?.grain > 0 && (
            <div className="text-xs text-green-500/70">+{lastIncome.grain}/turn</div>
          )}
        </div>
      </div>
      
      <div className="flex items-center justify-between p-2 bg-void-900/50 rounded">
        <div className="flex items-center gap-2">
          <span className="text-purple-400 text-lg">✧</span>
          <span className="text-steel-light/60 text-xs">Influence</span>
        </div>
        <div className="text-right">
          <div className="text-purple-400 font-mono">{influence}</div>
          {lastIncome?.influence > 0 && (
            <div className="text-xs text-green-500/70">+{lastIncome.influence}/turn</div>
          )}
        </div>
      </div>
    </div>
  )
}
