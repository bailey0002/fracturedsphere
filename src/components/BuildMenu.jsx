// Building construction menu for production phase

import { useMemo } from 'react'
import { BUILDINGS, TERRAIN_TYPES, canBuildOnTerrain, getResourceColor } from '../data/terrain'
import { hexId as makeHexId } from '../utils/hexMath'

export default function BuildMenu({ 
  hex, 
  resources,  // Note: GameBoard passes 'resources' not 'playerResources'
  buildingQueue = [], 
  onBuild,
  compact = false,
}) {
  if (!hex) {
    return (
      <div className="text-sm text-steel-light/50 text-center py-4">
        Select one of your territories to build
      </div>
    )
  }
  
  const terrain = TERRAIN_TYPES[hex.terrain]
  const existingBuildings = hex.buildings || []
  const hexKey = makeHexId(hex.q, hex.r)
  const queuedHere = buildingQueue.filter(b => b.hexId === hexKey)
  
  // Calculate available buildings
  const availableBuildings = useMemo(() => {
    return Object.entries(BUILDINGS).map(([id, building]) => {
      // Check terrain compatibility
      const canBuildHere = canBuildOnTerrain ? canBuildOnTerrain(id, hex.terrain) : true
      
      // Check if building already exists
      const alreadyBuilt = existingBuildings.includes(id)
      
      // Check if already in queue
      const inQueue = queuedHere.some(q => q.buildingType === id)
      
      // Check resource costs
      const canAfford = Object.entries(building.cost || {}).every(
        ([resource, amount]) => (resources?.[resource] || 0) >= amount
      )
      
      // Check terrain requirements
      const meetsRequirements = !building.requirements?.terrain || 
        building.requirements.terrain.includes(hex.terrain)
      
      const available = canBuildHere && !alreadyBuilt && !inQueue && canAfford && meetsRequirements
      
      let reason = null
      if (!canBuildHere) reason = `Can't build on ${terrain?.name || hex.terrain}`
      else if (alreadyBuilt) reason = 'Already built'
      else if (inQueue) reason = 'Building...'
      else if (!meetsRequirements) reason = 'Wrong terrain'
      else if (!canAfford) reason = 'Need resources'
      
      return {
        id,
        ...building,
        available,
        reason,
        canAfford,
      }
    })
  }, [hex, resources, existingBuildings, queuedHere])
  
  const handleBuild = (buildingId) => {
    if (onBuild) {
      onBuild(hexKey, buildingId, hex.owner)
    }
  }
  
  // Group by availability
  const buildable = availableBuildings.filter(b => b.available)
  const unavailable = availableBuildings.filter(b => !b.available)
  
  return (
    <div className={compact ? '' : 'p-2'}>
      {/* Currently building */}
      {queuedHere.length > 0 && (
        <div className="mb-3 p-2 bg-yellow-900/20 border border-yellow-500/30 rounded text-xs">
          <div className="text-yellow-400 font-display uppercase tracking-wider mb-1">
            Under Construction
          </div>
          {queuedHere.map((item, i) => (
            <div key={i} className="text-steel-light">
              {BUILDINGS[item.buildingType]?.name || item.buildingType} 
              <span className="text-steel-light/50"> ({item.turnsRemaining} turn{item.turnsRemaining !== 1 ? 's' : ''})</span>
            </div>
          ))}
        </div>
      )}
      
      {/* Existing buildings */}
      {existingBuildings.length > 0 && (
        <div className="mb-3 text-xs">
          <span className="text-steel-light/50">Built: </span>
          <span className="text-steel-light">
            {existingBuildings.map(b => BUILDINGS[b]?.name || b).join(', ')}
          </span>
        </div>
      )}
      
      {/* Available buildings */}
      {buildable.length > 0 ? (
        <div className="space-y-2">
          {buildable.map(building => (
            <button
              key={building.id}
              onClick={() => handleBuild(building.id)}
              className="w-full p-2 rounded border border-steel-light/20 bg-steel/10 
                         text-left active:bg-steel/30 transition-colors"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-display text-sm text-steel-bright">
                  {building.name}
                </span>
                <span className="text-xs text-steel-light/50">
                  {building.buildTime} turn{building.buildTime !== 1 ? 's' : ''}
                </span>
              </div>
              
              <p className="text-xs text-steel-light/60 mb-1">
                {building.description}
              </p>
              
              {/* Costs */}
              <div className="flex items-center gap-2 text-xs">
                {Object.entries(building.cost || {}).map(([resource, amount]) => (
                  <span 
                    key={resource}
                    style={{ color: getResourceColor(resource) }}
                  >
                    {amount} {resource}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="text-sm text-steel-light/50 text-center py-2">
          {unavailable.length > 0 
            ? 'No buildings available (check resources or terrain)'
            : 'All buildings constructed'}
        </div>
      )}
      
      {/* Unavailable (collapsed) */}
      {unavailable.length > 0 && buildable.length > 0 && (
        <div className="mt-3 pt-2 border-t border-steel-light/10">
          <div className="text-xs text-steel-light/40 mb-1">Unavailable:</div>
          <div className="text-xs text-steel-light/30">
            {unavailable.map(b => `${b.name} (${b.reason})`).join(', ')}
          </div>
        </div>
      )}
    </div>
  )
}
