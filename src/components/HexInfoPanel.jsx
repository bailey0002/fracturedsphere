// Panel showing information about selected hex

import { TERRAIN_TYPES, BUILDINGS } from '../data/terrain'
import { FACTIONS } from '../data/factions'
import { UNITS, VETERANCY_LEVELS, getBranchColor } from '../data/units'
import { 
  getFactionImage, 
  getTerrainImage, 
  getBuildingImage, 
  getResourceImage,
  getBranchImage,
  getVeterancyImage 
} from '../assets'

function UnitCard({ unit }) {
  const unitDef = UNITS[unit.type]
  const factionData = FACTIONS[unit.owner]
  const vetLevel = VETERANCY_LEVELS[unit.veterancy.toUpperCase()] || VETERANCY_LEVELS.GREEN
  const factionImage = getFactionImage(unit.owner)
  const branchImage = getBranchImage(unitDef?.branch)
  const vetImage = getVeterancyImage(unit.veterancy)
  
  if (!unitDef) return null
  
  return (
    <div 
      className="p-2 rounded border border-steel-light/20 bg-steel/30"
      style={{ borderLeftColor: factionData?.color, borderLeftWidth: 3 }}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          {factionImage && (
            <img src={factionImage} alt="" className="w-5 h-5 object-contain" />
          )}
          <span className="font-display text-xs text-steel-bright">
            {unitDef.name}
          </span>
        </div>
        {branchImage ? (
          <img src={branchImage} alt={unitDef.branch} className="w-5 h-5 object-contain" />
        ) : (
          <span 
            className="text-xs"
            style={{ color: getBranchColor(unitDef.branch) }}
          >
            {unitDef.branch}
          </span>
        )}
      </div>
      
      <div className="flex items-center gap-3 text-[10px] font-mono text-steel-light">
        <span>ATK: {unit.stats.attack}</span>
        <span>DEF: {unit.stats.defense}</span>
        <span>MOV: {unit.stats.movement}</span>
      </div>
      
      <div className="flex items-center justify-between mt-1">
        <div className="flex items-center gap-1">
          {vetImage ? (
            <img src={vetImage} alt={vetLevel.name} className="w-4 h-4 object-contain" />
          ) : (
            <span className="text-[10px]">{vetLevel.icon}</span>
          )}
          <span className="text-[10px] text-steel-light/60">{vetLevel.name}</span>
        </div>
        <span className="text-[10px] text-steel-light/60">
          HP: {unit.health}%
        </span>
      </div>
      
      {/* Movement status */}
      <div className="mt-1 flex gap-2 text-[10px]">
        {unit.movedThisTurn && (
          <span className="text-warning/70">Moved</span>
        )}
        {unit.attackedThisTurn && (
          <span className="text-danger/70">Attacked</span>
        )}
        {!unit.movedThisTurn && !unit.attackedThisTurn && (
          <span className="text-success/70">Ready</span>
        )}
      </div>
    </div>
  )
}

export default function HexInfoPanel({ hex, units, onClose }) {
  if (!hex) {
    return (
      <div className="panel h-full flex items-center justify-center">
        <p className="text-steel-light/50 text-sm">
          Select a hex to view details
        </p>
      </div>
    )
  }
  
  const terrain = TERRAIN_TYPES[hex.terrain] || TERRAIN_TYPES.plains
  const owner = hex.owner ? FACTIONS[hex.owner] : null
  const terrainImage = getTerrainImage(hex.terrain)
  const ownerImage = owner ? getFactionImage(hex.owner) : null
  
  return (
    <div className="panel h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-sm tracking-wider uppercase text-steel-light">
          Territory Info
        </h3>
        {onClose && (
          <button 
            onClick={onClose}
            className="text-steel-light/50 hover:text-steel-bright"
          >
            ✕
          </button>
        )}
      </div>
      
      {/* Terrain */}
      <div className="mb-4">
        <div className="text-xs text-steel-light/50 uppercase tracking-wider mb-1">
          Terrain
        </div>
        <div className="flex items-center gap-2">
          {terrainImage ? (
            <img 
              src={terrainImage} 
              alt={terrain.name}
              className="w-10 h-10 rounded object-cover"
            />
          ) : (
            <div 
              className="w-4 h-4 rounded"
              style={{ backgroundColor: terrain.color }}
            />
          )}
          <span className="font-display text-steel-bright">
            {terrain.name}
          </span>
        </div>
        <p className="mt-1 text-xs text-steel-light/70">
          {terrain.description}
        </p>
      </div>
      
      {/* Owner */}
      <div className="mb-4">
        <div className="text-xs text-steel-light/50 uppercase tracking-wider mb-1">
          Controlled By
        </div>
        {owner ? (
          <div className="flex items-center gap-2">
            {ownerImage ? (
              <img src={ownerImage} alt="" className="w-6 h-6 object-contain" />
            ) : (
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: owner.color }}
              />
            )}
            <span style={{ color: owner.color }} className="font-display">
              {owner.name}
            </span>
            {hex.isCapital && (
              <span className="text-warning text-xs">★ Capital</span>
            )}
          </div>
        ) : (
          <span className="text-steel-light/50">Unclaimed</span>
        )}
      </div>
      
      {/* Terrain modifiers */}
      <div className="mb-4">
        <div className="text-xs text-steel-light/50 uppercase tracking-wider mb-1">
          Modifiers
        </div>
        <div className="space-y-1 text-xs font-mono">
          <div className="flex justify-between">
            <span className="text-steel-light/70">Movement Cost</span>
            <span className="text-steel-bright">{terrain.movementCost}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-steel-light/70">Defense Bonus</span>
            <span className={terrain.defenseModifier > 0 ? 'text-success' : 'text-steel-bright'}>
              {terrain.defenseModifier > 0 ? '+' : ''}{Math.round(terrain.defenseModifier * 100)}%
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-steel-light/70">Supply Rate</span>
            <span className="text-steel-bright">{Math.round(terrain.supplyModifier * 100)}%</span>
          </div>
        </div>
      </div>
      
      {/* Resources */}
      <div className="mb-4">
        <div className="text-xs text-steel-light/50 uppercase tracking-wider mb-1">
          Resources
        </div>
        <div className="flex gap-4 text-xs font-mono">
          {hex.resources.gold > 0 && (
            <div className="flex items-center gap-1">
              {getResourceImage('gold') ? (
                <img src={getResourceImage('gold')} alt="gold" className="w-4 h-4 object-contain" />
              ) : (
                <span className="text-ascendant">●</span>
              )}
              <span className="text-ascendant">{hex.resources.gold}</span>
            </div>
          )}
          {hex.resources.iron > 0 && (
            <div className="flex items-center gap-1">
              {getResourceImage('iron') ? (
                <img src={getResourceImage('iron')} alt="iron" className="w-4 h-4 object-contain" />
              ) : (
                <span className="text-steel-light">◆</span>
              )}
              <span className="text-steel-light">{hex.resources.iron}</span>
            </div>
          )}
          {hex.resources.grain > 0 && (
            <div className="flex items-center gap-1">
              {getResourceImage('grain') ? (
                <img src={getResourceImage('grain')} alt="grain" className="w-4 h-4 object-contain" />
              ) : (
                <span className="text-reclaimers">▲</span>
              )}
              <span className="text-reclaimers">{hex.resources.grain}</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Buildings */}
      {hex.buildings && hex.buildings.length > 0 && (
        <div className="mb-4">
          <div className="text-xs text-steel-light/50 uppercase tracking-wider mb-2">
            Structures ({hex.buildings.length})
          </div>
          <div className="space-y-1">
            {hex.buildings.map((buildingId, idx) => {
              const building = BUILDINGS[buildingId]
              const buildingImage = getBuildingImage(buildingId)
              if (!building) return null
              return (
                <div 
                  key={idx}
                  className="flex items-center justify-between p-2 bg-steel/20 rounded border border-steel-light/10"
                >
                  <div className="flex items-center gap-2">
                    {buildingImage && (
                      <img src={buildingImage} alt="" className="w-6 h-6 object-contain" />
                    )}
                    <span className="text-xs text-steel-bright">{building.name}</span>
                  </div>
                  {building.production && Object.keys(building.production).length > 0 && (
                    <span className="text-[10px] text-success">
                      +{Object.entries(building.production).map(([r, a]) => `${a} ${r}`).join(', ')}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
      
      {/* Units */}
      {units.length > 0 && (
        <div>
          <div className="text-xs text-steel-light/50 uppercase tracking-wider mb-2">
            Units ({units.length})
          </div>
          <div className="space-y-2">
            {units.map(unit => (
              <UnitCard key={unit.id} unit={unit} />
            ))}
          </div>
        </div>
      )}
      
      {/* Coordinates (debug info) */}
      <div className="mt-4 pt-2 border-t border-steel-light/10">
        <div className="text-[10px] font-mono text-steel-light/30">
          Coordinates: {hex.q}, {hex.r}
        </div>
      </div>
    </div>
  )
}
