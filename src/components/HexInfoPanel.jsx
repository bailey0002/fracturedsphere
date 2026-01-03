// HexInfoPanel - Shows details about selected hex, units, and available actions
// Responsive panel that adapts to mobile/desktop layouts

import { useMemo } from 'react'
import { TERRAIN_TYPES, BUILDINGS } from '../data/terrain'
import { FACTIONS } from '../data/factions'
import { UNITS, VETERANCY_LEVELS } from '../data/units'
import { PHASES } from '../hooks/useGameState'

export default function HexInfoPanel({
  hex,
  units = [],
  phase,
  isPlayerOwned,
  onBuild,
  onTrain,
}) {
  // No hex selected
  if (!hex) {
    return (
      <div className="hex-info-panel p-4 text-center text-steel-light/50">
        <p className="text-sm italic">Select a hex to view details</p>
      </div>
    )
  }
  
  const terrain = TERRAIN_TYPES[hex.terrain] || TERRAIN_TYPES.plains
  const owner = hex.owner ? FACTIONS[hex.owner] : null
  const buildings = hex.buildings?.map(id => BUILDINGS[id]).filter(Boolean) || []
  
  // Units on this hex
  const hexUnits = units.filter(u => u.q === hex.q && u.r === hex.r)
  
  // Available actions based on phase
  const canBuild = phase === PHASES.COMMAND && isPlayerOwned && terrain.canBuild?.length > 0
  const canTrain = phase === PHASES.COMMAND && isPlayerOwned && (
    hex.isCapital || 
    buildings.some(b => b.id === 'academy' || b.id === 'fortress')
  )
  
  return (
    <div className="hex-info-panel p-3 space-y-3">
      {/* Hex header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-display tracking-wider text-steel-bright">
            {terrain.name}
          </h3>
          <p className="text-xs text-steel-light/60">
            Grid {hex.q},{hex.r}
          </p>
        </div>
        
        {/* Owner indicator */}
        {owner && (
          <div 
            className="flex items-center gap-1.5 px-2 py-1 rounded text-xs"
            style={{ 
              backgroundColor: owner.color + '20',
              color: owner.color,
              border: `1px solid ${owner.color}40`,
            }}
          >
            <span>{owner.emblem}</span>
            <span className="hidden sm:inline">{owner.name}</span>
          </div>
        )}
        
        {!owner && (
          <span className="text-xs text-steel-light/40 px-2 py-1 bg-steel/10 rounded">
            Unclaimed
          </span>
        )}
      </div>
      
      {/* Capital indicator */}
      {hex.isCapital && (
        <div className="flex items-center gap-2 text-amber-400 text-xs">
          <span>★</span>
          <span>Capital Territory</span>
        </div>
      )}
      
      {/* Terrain info */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="bg-void-900/50 rounded p-2 text-center">
          <div className="text-steel-light/50">Move</div>
          <div className="text-steel-bright font-mono">{terrain.movementCost}</div>
        </div>
        <div className="bg-void-900/50 rounded p-2 text-center">
          <div className="text-steel-light/50">Defense</div>
          <div className="text-steel-bright font-mono">
            {terrain.defenseModifier > 0 ? '+' : ''}{Math.round(terrain.defenseModifier * 100)}%
          </div>
        </div>
        <div className="bg-void-900/50 rounded p-2 text-center">
          <div className="text-steel-light/50">Supply</div>
          <div className="text-steel-bright font-mono">
            {Math.round(terrain.supplyModifier * 100)}%
          </div>
        </div>
      </div>
      
      {/* Resource yield */}
      {hex.resources && (
        <div className="flex items-center gap-3 text-xs">
          <span className="text-steel-light/50">Yields:</span>
          {hex.resources.gold > 0 && (
            <span className="text-amber-400">◈{hex.resources.gold}</span>
          )}
          {hex.resources.iron > 0 && (
            <span className="text-steel-light">⬡{hex.resources.iron}</span>
          )}
          {hex.resources.grain > 0 && (
            <span className="text-green-400">❋{hex.resources.grain}</span>
          )}
        </div>
      )}
      
      {/* Buildings */}
      {buildings.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs text-steel-light/50 uppercase tracking-wider">
            Structures
          </div>
          <div className="space-y-1">
            {buildings.map((building, i) => (
              <div 
                key={i}
                className="flex items-center justify-between p-2 bg-void-900/50 rounded text-xs"
              >
                <span className="text-steel-bright">{building.name}</span>
                {building.production && (
                  <span className="text-steel-light/60">
                    {building.production.gold > 0 && `+${building.production.gold}◈ `}
                    {building.production.iron > 0 && `+${building.production.iron}⬡ `}
                    {building.production.grain > 0 && `+${building.production.grain}❋ `}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Units */}
      {hexUnits.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs text-steel-light/50 uppercase tracking-wider">
            Forces
          </div>
          <div className="space-y-1">
            {hexUnits.map((unit) => {
              const unitDef = UNITS[unit.type]
              const vetLevel = VETERANCY_LEVELS[unit.veterancy?.toUpperCase()] || VETERANCY_LEVELS.GREEN
              const unitFaction = FACTIONS[unit.owner]
              
              return (
                <div 
                  key={unit.id}
                  className="flex items-center justify-between p-2 bg-void-900/50 rounded text-xs"
                  style={{ borderLeft: `3px solid ${unitFaction?.color || '#888'}` }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-steel-bright">{unitDef?.name || unit.type}</span>
                    <span className="text-amber-400">{vetLevel.icon}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Health bar */}
                    <div className="w-12 h-1.5 bg-void-950 rounded overflow-hidden">
                      <div 
                        className="h-full transition-all"
                        style={{ 
                          width: `${unit.health}%`,
                          backgroundColor: unit.health > 60 ? '#55a870' : unit.health > 30 ? '#c4a35a' : '#c45555',
                        }}
                      />
                    </div>
                    <span className="text-steel-light/60 font-mono w-8 text-right">
                      {unit.health}%
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
      
      {/* Unit stats (if single unit selected) */}
      {hexUnits.length === 1 && (
        <UnitStats unit={hexUnits[0]} />
      )}
      
      {/* Action buttons */}
      {(canBuild || canTrain) && (
        <div className="flex gap-2 pt-2 border-t border-steel-light/10">
          {canBuild && (
            <button
              onPointerUp={onBuild}
              className="flex-1 px-3 py-2 text-xs font-mono uppercase tracking-wider
                         bg-blue-500/20 hover:bg-blue-500/30 text-blue-400
                         border border-blue-500/30 rounded
                         transition-all duration-200"
              style={{ touchAction: 'manipulation' }}
            >
              Build
            </button>
          )}
          {canTrain && (
            <button
              onPointerUp={onTrain}
              className="flex-1 px-3 py-2 text-xs font-mono uppercase tracking-wider
                         bg-green-500/20 hover:bg-green-500/30 text-green-400
                         border border-green-500/30 rounded
                         transition-all duration-200"
              style={{ touchAction: 'manipulation' }}
            >
              Train
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// Unit stats component
function UnitStats({ unit }) {
  const unitDef = UNITS[unit.type]
  if (!unitDef) return null
  
  const vetLevel = VETERANCY_LEVELS[unit.veterancy?.toUpperCase()] || VETERANCY_LEVELS.GREEN
  
  // Calculate effective stats with veterancy
  const attack = Math.floor(unitDef.stats.attack * vetLevel.multiplier)
  const defense = Math.floor(unitDef.stats.defense * vetLevel.multiplier)
  
  return (
    <div className="grid grid-cols-4 gap-1 text-xs">
      <div className="bg-red-500/10 rounded p-1.5 text-center">
        <div className="text-red-400/60 text-[10px]">ATK</div>
        <div className="text-red-400 font-mono">{attack}</div>
      </div>
      <div className="bg-blue-500/10 rounded p-1.5 text-center">
        <div className="text-blue-400/60 text-[10px]">DEF</div>
        <div className="text-blue-400 font-mono">{defense}</div>
      </div>
      <div className="bg-green-500/10 rounded p-1.5 text-center">
        <div className="text-green-400/60 text-[10px]">MOV</div>
        <div className="text-green-400 font-mono">{unitDef.stats.movement}</div>
      </div>
      <div className="bg-amber-500/10 rounded p-1.5 text-center">
        <div className="text-amber-400/60 text-[10px]">XP</div>
        <div className="text-amber-400 font-mono">{unit.experience || 0}</div>
      </div>
    </div>
  )
}
