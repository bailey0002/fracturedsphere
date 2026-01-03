// BuildMenu.jsx - Mobile-friendly building construction panel
// Shows available buildings with costs, requirements, and clear action buttons

import { useMemo } from 'react'
import { BUILDINGS, TERRAIN_TYPES, canBuildOnTerrain, getResourceColor } from '../data/terrain'

export default function BuildMenu({ hex, resources, buildingQueue = [], onBuild }) {
  // Get buildable items for this hex
  const buildOptions = useMemo(() => {
    if (!hex) return []
    
    const terrain = TERRAIN_TYPES[hex.terrain]
    if (!terrain) return []
    
    return Object.entries(BUILDINGS).map(([id, building]) => {
      // Check terrain compatibility
      const canBuildHere = terrain.canBuild?.includes(id) || canBuildOnTerrain(id, hex.terrain)
      
      // Check if already built
      const alreadyBuilt = hex.buildings?.includes(id)
      
      // Check max per territory
      const buildCount = hex.buildings?.filter(b => b === id).length || 0
      const atMax = building.maxPerTerritory && buildCount >= building.maxPerTerritory
      
      // Check if in queue
      const inQueue = buildingQueue.some(q => q.hexId === `${hex.q},${hex.r}` && q.buildingType === id)
      
      // Check resource costs
      const canAfford = Object.entries(building.cost || {}).every(
        ([res, amount]) => (resources[res] || 0) >= amount
      )
      
      // Determine availability
      let unavailableReason = null
      if (!canBuildHere) unavailableReason = `Can't build on ${terrain.name}`
      else if (alreadyBuilt && building.maxPerTerritory === 1) unavailableReason = 'Already built'
      else if (atMax) unavailableReason = 'Max reached'
      else if (inQueue) unavailableReason = 'In queue'
      else if (!canAfford) unavailableReason = 'Not enough resources'
      
      return {
        id,
        ...building,
        canBuild: !unavailableReason,
        unavailableReason,
        canAfford,
      }
    })
  }, [hex, resources, buildingQueue])
  
  // Separate available vs unavailable
  const available = buildOptions.filter(b => b.canBuild)
  const unavailable = buildOptions.filter(b => !b.canBuild)
  
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
          ? `${available.length} building${available.length > 1 ? 's' : ''} available. Tap to construct.`
          : 'No buildings available for this terrain.'
        }
      </div>
      
      {/* Available buildings */}
      {available.length > 0 && (
        <div className="space-y-2">
          {available.map(building => (
            <BuildingCard 
              key={building.id}
              building={building}
              resources={resources}
              onBuild={() => onBuild(building.id)}
            />
          ))}
        </div>
      )}
      
      {/* Unavailable buildings (collapsed) */}
      {unavailable.length > 0 && available.length > 0 && (
        <details className="text-xs">
          <summary className="text-steel-light/40 cursor-pointer">
            {unavailable.length} unavailable
          </summary>
          <div className="mt-2 space-y-1 pl-2 border-l border-steel-light/10">
            {unavailable.map(building => (
              <div key={building.id} className="flex justify-between text-steel-light/30">
                <span>{building.name}</span>
                <span className="text-xs">{building.unavailableReason}</span>
              </div>
            ))}
          </div>
        </details>
      )}
      
      {/* Queue status */}
      {buildingQueue.length > 0 && (
        <div className="pt-2 border-t border-steel-light/10">
          <div className="text-xs text-steel-light/50 mb-1">In Progress:</div>
          {buildingQueue
            .filter(q => q.hexId === `${hex.q},${hex.r}`)
            .map((item, i) => (
              <div key={i} className="text-xs flex justify-between text-yellow-400/70">
                <span>{BUILDINGS[item.buildingType]?.name || item.buildingType}</span>
                <span>{item.turnsRemaining} turn{item.turnsRemaining > 1 ? 's' : ''}</span>
              </div>
            ))
          }
        </div>
      )}
    </div>
  )
}

function BuildingCard({ building, resources, onBuild }) {
  return (
    <div className="bg-void-800 border border-steel-light/20 rounded p-2">
      <div className="flex items-start justify-between gap-2">
        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="font-display text-sm text-steel-bright">{building.name}</div>
          <div className="text-xs text-steel-light/60 line-clamp-2">{building.description}</div>
          
          {/* Cost */}
          <div className="flex flex-wrap gap-2 mt-1.5">
            {Object.entries(building.cost || {}).map(([res, amount]) => {
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
              • {building.buildTime} turn{building.buildTime > 1 ? 's' : ''}
            </span>
          </div>
          
          {/* Production bonus */}
          {building.production && Object.keys(building.production).length > 0 && (
            <div className="text-xs text-green-400/70 mt-1">
              Produces: {Object.entries(building.production).map(([res, amt]) => `+${amt} ${res}`).join(', ')}
            </div>
          )}
        </div>
        
        {/* Build button */}
        <button
          onClick={onBuild}
          className="flex-none px-3 py-2 text-xs font-display uppercase tracking-wider
                     bg-green-900/50 text-green-400 border border-green-500/50 rounded
                     active:bg-green-800 active:scale-95 transition-transform"
        >
          Build
        </button>
      </div>
    </div>
  )
}
