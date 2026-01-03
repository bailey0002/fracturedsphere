// BuildMenu - Building construction popup for The Fractured Sphere
// Shows available buildings for selected hex with costs and effects

import { useMemo } from 'react'
import { BUILDINGS, TERRAIN_TYPES, canBuildOnTerrain } from '../data/terrain'
import { FACTIONS } from '../data/factions'

export default function BuildMenu({
  hex,
  resources,
  playerFaction,
  buildingQueue = [],
  onBuild,
  onClose,
}) {
  // Get terrain type
  const terrain = hex ? TERRAIN_TYPES[hex.terrain] : null
  const faction = playerFaction ? FACTIONS[playerFaction] : null
  
  // Calculate available buildings for this terrain
  const availableBuildings = useMemo(() => {
    if (!terrain || !terrain.canBuild) return []
    
    return terrain.canBuild
      .map(id => BUILDINGS[id])
      .filter(Boolean)
      .map(building => {
        // Check if already built on this hex
        const alreadyBuilt = hex.buildings?.includes(building.id)
        
        // Check if at max for this territory
        const builtCount = hex.buildings?.filter(b => b === building.id).length || 0
        const atMax = building.maxPerTerritory && builtCount >= building.maxPerTerritory
        
        // Check if in queue for this hex
        const inQueue = buildingQueue.some(
          q => q.buildingId === building.id && q.q === hex.q && q.r === hex.r
        )
        
        // Check resources
        const canAffordGold = resources.gold >= building.cost.gold
        const canAffordIron = resources.iron >= building.cost.iron
        const canAfford = canAffordGold && canAffordIron
        
        // Determine availability
        const available = canAfford && !alreadyBuilt && !atMax && !inQueue
        const reason = alreadyBuilt ? 'Already built' :
                       atMax ? 'Max reached' :
                       inQueue ? 'In queue' :
                       !canAffordGold ? 'Need gold' :
                       !canAffordIron ? 'Need iron' : null
        
        return {
          ...building,
          available,
          reason,
          canAfford,
        }
      })
  }, [terrain, hex, resources, buildingQueue])
  
  // Handle build selection
  const handleBuild = (building) => {
    if (!building.available) return
    onBuild(building.id, hex.q, hex.r, playerFaction)
    onClose()
  }
  
  if (!hex || !terrain) return null
  
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-void-950/80 backdrop-blur-sm"
      onPointerUp={(e) => e.target === e.currentTarget && onClose()}
      style={{ touchAction: 'manipulation' }}
    >
      <div 
        className="w-full max-w-md mx-4 bg-void-900 border border-steel-light/20 rounded-lg shadow-2xl overflow-hidden"
        style={{ maxHeight: '80vh' }}
      >
        {/* Header */}
        <div 
          className="px-4 py-3 border-b border-steel-light/20"
          style={{ backgroundColor: faction?.color + '20' }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-display tracking-wider text-steel-bright">
                Build Structure
              </h2>
              <p className="text-xs text-steel-light/60">
                {terrain.name} • Grid {hex.q},{hex.r}
              </p>
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
        </div>
        
        {/* Building list */}
        <div 
          className="p-3 space-y-2 overflow-y-auto"
          style={{ 
            maxHeight: '60vh',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {availableBuildings.length === 0 ? (
            <div className="text-center py-8 text-steel-light/50">
              <p>No buildings available for this terrain</p>
            </div>
          ) : (
            availableBuildings.map((building) => (
              <BuildingCard
                key={building.id}
                building={building}
                onSelect={() => handleBuild(building)}
              />
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

// Individual building card
function BuildingCard({ building, onSelect }) {
  const { available, reason, canAfford } = building
  
  return (
    <div
      className={`
        p-3 rounded border transition-all duration-200
        ${available 
          ? 'border-steel-light/30 hover:border-amber-500/50 hover:bg-amber-500/5 cursor-pointer' 
          : 'border-steel-light/10 opacity-60'}
      `}
      onPointerUp={available ? onSelect : undefined}
      style={{ touchAction: 'manipulation' }}
    >
      <div className="flex items-start gap-3">
        {/* Building icon */}
        <div className="flex-shrink-0 w-12 h-12 bg-void-950/50 rounded flex items-center justify-center">
          <svg viewBox="0 0 100 100" className="w-8 h-8">
            <path 
              d={building.svgPath} 
              fill={available ? '#c4a35a' : '#4a4a5a'}
              opacity={available ? 1 : 0.5}
            />
          </svg>
        </div>
        
        {/* Building info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-display text-steel-bright truncate">
              {building.name}
            </h3>
            {!available && reason && (
              <span className="text-xs text-red-400/80 ml-2">
                {reason}
              </span>
            )}
          </div>
          
          <p className="text-xs text-steel-light/60 mt-0.5 line-clamp-2">
            {building.description}
          </p>
          
          {/* Cost and time */}
          <div className="flex items-center gap-4 mt-2">
            {/* Cost */}
            <div className="flex items-center gap-2 text-xs">
              <span className={canAfford ? 'text-amber-400' : 'text-red-400'}>
                ◈ {building.cost.gold}
              </span>
              <span className={canAfford ? 'text-steel-light' : 'text-red-400'}>
                ⬡ {building.cost.iron}
              </span>
            </div>
            
            {/* Build time */}
            <div className="text-xs text-steel-light/50">
              ⏱ {building.buildTime} {building.buildTime === 1 ? 'turn' : 'turns'}
            </div>
          </div>
          
          {/* Production output */}
          {building.production && Object.keys(building.production).length > 0 && (
            <div className="flex items-center gap-2 mt-1.5 text-xs text-green-400/80">
              <span>Produces:</span>
              {building.production.gold > 0 && <span>+{building.production.gold}◈</span>}
              {building.production.iron > 0 && <span>+{building.production.iron}⬡</span>}
              {building.production.grain > 0 && <span>+{building.production.grain}❋</span>}
              {building.production.influence > 0 && <span>+{building.production.influence}✦</span>}
            </div>
          )}
          
          {/* Effects */}
          {building.effects && Object.keys(building.effects).length > 0 && (
            <div className="text-xs text-blue-400/70 mt-1">
              {building.effects.defenseBonus && (
                <span>+{Math.round(building.effects.defenseBonus * 100)}% defense</span>
              )}
              {building.effects.veterancyBonus && (
                <span>+{Math.round(building.effects.veterancyBonus * 100)}% XP gain</span>
              )}
              {building.effects.trainTimeReduction && (
                <span>-{Math.round(building.effects.trainTimeReduction * 100)}% train time</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
