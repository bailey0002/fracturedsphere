// Building construction menu for production phase

import { useMemo } from 'react'
import { BUILDINGS, TERRAIN_TYPES, canBuildOnTerrain, getResourceColor } from '../data/terrain'
import { getBuildingImage, getResourceImage } from '../assets'

export default function BuildMenu({ 
  hex, 
  playerResources, 
  buildingQueue, 
  onBuild, 
  onClose 
}) {
  if (!hex) return null
  
  const terrain = TERRAIN_TYPES[hex.terrain]
  const existingBuildings = hex.buildings || []
  const queuedHere = buildingQueue.filter(b => b.hexId === `${hex.q},${hex.r}`)
  
  // Calculate available buildings
  const availableBuildings = useMemo(() => {
    return Object.entries(BUILDINGS).map(([id, building]) => {
      // Check terrain compatibility
      const canBuildHere = canBuildOnTerrain(id, hex.terrain)
      
      // Check if building already exists
      const alreadyBuilt = existingBuildings.includes(id)
      
      // Check if already in queue for this hex
      const inQueue = queuedHere.some(q => q.buildingType === id)
      
      // Check resource costs
      const canAfford = Object.entries(building.cost).every(
        ([resource, amount]) => (playerResources[resource] || 0) >= amount
      )
      
      // Check terrain requirements (e.g., port requires coastal)
      const meetsRequirements = !building.requirements?.terrain || 
        building.requirements.terrain.includes(hex.terrain)
      
      const available = canBuildHere && !alreadyBuilt && !inQueue && canAfford && meetsRequirements
      
      let reason = null
      if (!canBuildHere) reason = `Cannot build on ${terrain?.name || hex.terrain}`
      else if (alreadyBuilt) reason = 'Already built'
      else if (inQueue) reason = 'Under construction'
      else if (!meetsRequirements) reason = 'Wrong terrain type'
      else if (!canAfford) reason = 'Insufficient resources'
      
      return {
        id,
        ...building,
        available,
        reason,
        canAfford,
      }
    })
  }, [hex, playerResources, existingBuildings, queuedHere])
  
  // Group buildings by availability
  const buildable = availableBuildings.filter(b => b.available)
  const unavailable = availableBuildings.filter(b => !b.available)
  
  return (
    <div className="bg-steel-darker border border-steel-light/20 rounded-lg p-4 w-80">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-sm tracking-wider uppercase text-steel-bright">
          Build Structure
        </h3>
        <button 
          onClick={onClose}
          className="text-steel-light/50 hover:text-steel-light transition-colors text-lg"
        >
          ×
        </button>
      </div>
      
      {/* Location */}
      <div className="text-xs text-steel-light/70 mb-4">
        <span className="text-steel-light">{terrain?.name || hex.terrain}</span>
        {' '}at ({hex.q}, {hex.r})
      </div>
      
      {/* Current buildings */}
      {existingBuildings.length > 0 && (
        <div className="mb-4">
          <div className="text-xs text-steel-light/50 uppercase tracking-wider mb-2">
            Existing Structures
          </div>
          <div className="flex flex-wrap gap-2">
            {existingBuildings.map(bId => {
              const b = BUILDINGS[bId]
              const bImage = getBuildingImage(bId)
              return (
                <span 
                  key={bId}
                  className="px-2 py-1 bg-steel/30 rounded text-xs text-steel-bright flex items-center gap-1"
                >
                  {bImage && <img src={bImage} alt="" className="w-4 h-4 object-contain" />}
                  {b?.name || bId}
                </span>
              )
            })}
          </div>
        </div>
      )}
      
      {/* Queue for this hex */}
      {queuedHere.length > 0 && (
        <div className="mb-4">
          <div className="text-xs text-steel-light/50 uppercase tracking-wider mb-2">
            Under Construction
          </div>
          {queuedHere.map((q, i) => {
            const b = BUILDINGS[q.buildingType]
            const bImage = getBuildingImage(q.buildingType)
            return (
              <div 
                key={i}
                className="flex items-center justify-between p-2 bg-warning/10 border border-warning/30 rounded mb-1"
              >
                <span className="text-sm text-warning flex items-center gap-2">
                  {bImage && <img src={bImage} alt="" className="w-5 h-5 object-contain" />}
                  {b?.name || q.buildingType}
                </span>
                <span className="text-xs text-steel-light/70">
                  {q.turnsRemaining} turn{q.turnsRemaining !== 1 ? 's' : ''} left
                </span>
              </div>
            )
          })}
        </div>
      )}
      
      {/* Available buildings */}
      {buildable.length > 0 ? (
        <div className="space-y-2 mb-4">
          <div className="text-xs text-steel-light/50 uppercase tracking-wider mb-2">
            Available to Build
          </div>
          {buildable.map(building => (
            <BuildingOption
              key={building.id}
              building={building}
              onBuild={() => onBuild(building.id)}
            />
          ))}
        </div>
      ) : (
        <div className="text-sm text-steel-light/50 italic mb-4">
          No structures available to build here.
        </div>
      )}
      
      {/* Unavailable buildings - collapsed by default */}
      {unavailable.length > 0 && (
        <details className="group">
          <summary className="text-xs text-steel-light/40 cursor-pointer hover:text-steel-light/60 transition-colors">
            {unavailable.length} structure{unavailable.length !== 1 ? 's' : ''} unavailable
          </summary>
          <div className="mt-2 space-y-1">
            {unavailable.map(building => {
              const bImage = getBuildingImage(building.id)
              return (
                <div 
                  key={building.id}
                  className="flex items-center justify-between p-2 bg-steel/10 rounded opacity-50"
                >
                  <span className="text-xs text-steel-light flex items-center gap-2">
                    {bImage && <img src={bImage} alt="" className="w-4 h-4 object-contain opacity-50" />}
                    {building.name}
                  </span>
                  <span className="text-xs text-steel-light/50">{building.reason}</span>
                </div>
              )
            })}
          </div>
        </details>
      )}
    </div>
  )
}

// Individual building option
function BuildingOption({ building, onBuild }) {
  const buildingImage = getBuildingImage(building.id)
  
  return (
    <div 
      className="group p-3 bg-steel/20 hover:bg-steel/30 border border-steel-light/10 
                 hover:border-primary/30 rounded cursor-pointer transition-all"
      onClick={onBuild}
    >
      {/* Name and build time */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {buildingImage && (
            <img src={buildingImage} alt="" className="w-8 h-8 object-contain drop-shadow-md" />
          )}
          <span className="font-display text-sm text-steel-bright group-hover:text-primary transition-colors">
            {building.name}
          </span>
        </div>
        <span className="text-xs text-steel-light/50">
          {building.buildTime} turn{building.buildTime !== 1 ? 's' : ''}
        </span>
      </div>
      
      {/* Description */}
      <p className="text-xs text-steel-light/70 mb-2">
        {building.description}
      </p>
      
      {/* Costs */}
      <div className="flex items-center gap-3">
        {Object.entries(building.cost).map(([resource, amount]) => (
          <ResourceCost key={resource} resource={resource} amount={amount} />
        ))}
      </div>
      
      {/* Production/Effects */}
      {(Object.keys(building.production || {}).length > 0 || 
        Object.keys(building.effects || {}).length > 0) && (
        <div className="mt-2 pt-2 border-t border-steel-light/10">
          <div className="flex flex-wrap gap-2">
            {Object.entries(building.production || {}).map(([resource, amount]) => (
              <span 
                key={resource}
                className="text-xs px-1.5 py-0.5 rounded flex items-center gap-1"
                style={{ 
                  backgroundColor: `${getResourceColor(resource)}20`,
                  color: getResourceColor(resource)
                }}
              >
                {getResourceImage(resource) && (
                  <img src={getResourceImage(resource)} alt="" className="w-3 h-3 object-contain" />
                )}
                +{amount} {resource}/turn
              </span>
            ))}
            {Object.entries(building.effects || {}).map(([effect, value]) => (
              <span 
                key={effect}
                className="text-xs text-accent px-1.5 py-0.5 bg-accent/10 rounded"
              >
                {formatEffect(effect, value)}
              </span>
            ))}
          </div>
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

// Format effect for display
function formatEffect(effect, value) {
  const labels = {
    defenseBonus: `+${Math.round(value * 100)}% defense`,
    garrisonCapacity: `${value} garrison slots`,
    veterancyBonus: `+${Math.round(value * 100)}% XP`,
    trainTimeReduction: `-${Math.round(value * 100)}% train time`,
    tradeBonus: `+${Math.round(value * 100)}% trade`,
    enableNaval: 'Enables naval',
    tradeRoute: 'Trade route access',
    supplyBonus: `+${Math.round(value * 100)}% supply`,
    supplyRange: `+${value} supply range`,
    sightBonus: `+${value} sight`,
    commandBonus: `+${Math.round(value * 100)}% command`,
  }
  
  return labels[effect] || `${effect}: ${value}`
}
