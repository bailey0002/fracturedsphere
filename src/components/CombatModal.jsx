// CombatModal - Combat interface for The Fractured Sphere
// Shows attacker/defender info, doctrine selection, and combat preview

import { useState, useMemo, useCallback } from 'react'
import { UNITS, DOCTRINES, VETERANCY_LEVELS, getVeterancyLevel } from '../data/units'
import { TERRAIN_TYPES } from '../data/terrain'
import { FACTIONS } from '../data/factions'
import { 
  previewCombat, 
  resolveCombat, 
  getAvailableDoctrines,
  getRecommendedDoctrine,
} from '../utils/combatResolver'

export default function CombatModal({
  attacker,
  defenders,
  hex,
  mapData,
  playerFaction,
  onResolve,
  onCancel,
}) {
  // State for selected doctrine
  const [attackerDoctrine, setAttackerDoctrine] = useState('assault')
  const [defenderDoctrine, setDefenderDoctrine] = useState('defensive')
  const [isResolving, setIsResolving] = useState(false)
  const [combatResult, setCombatResult] = useState(null)
  
  // Get primary defender (for preview)
  const defender = defenders[0]
  
  // Get unit definitions
  const attackerDef = UNITS[attacker?.type]
  const defenderDef = UNITS[defender?.type]
  
  // Get factions
  const attackerFaction = attacker ? FACTIONS[attacker.owner] : null
  const defenderFaction = defender ? FACTIONS[defender.owner] : null
  
  // Get terrain
  const terrain = hex ? TERRAIN_TYPES[hex.terrain] : null
  
  // Is player the attacker?
  const isPlayerAttacker = attacker?.owner === playerFaction
  
  // Get available doctrines for attacker
  const availableDoctrines = useMemo(() => {
    if (!attacker) return []
    return getAvailableDoctrines(attacker)
  }, [attacker])
  
  // Get recommended doctrine
  const recommendedDoctrine = useMemo(() => {
    if (!attacker || !defender) return 'assault'
    return getRecommendedDoctrine(attacker, defender, hex?.terrain, true)
  }, [attacker, defender, hex])
  
  // AI selects doctrine for defender
  const aiDefenderDoctrine = useMemo(() => {
    if (!attacker || !defender) return 'defensive'
    return getRecommendedDoctrine(defender, attacker, hex?.terrain, false)
  }, [attacker, defender, hex])
  
  // Calculate combat preview
  const preview = useMemo(() => {
    if (!attacker || !defender) return null
    
    const effectiveDefenderDoctrine = isPlayerAttacker ? aiDefenderDoctrine : defenderDoctrine
    return previewCombat(
      attacker, 
      defender, 
      attackerDoctrine, 
      effectiveDefenderDoctrine, 
      hex?.terrain
    )
  }, [attacker, defender, attackerDoctrine, defenderDoctrine, aiDefenderDoctrine, hex, isPlayerAttacker])
  
  // Handle resolve combat
  const handleResolve = useCallback(() => {
    if (!preview || isResolving) return
    
    setIsResolving(true)
    
    // Add dramatic pause
    setTimeout(() => {
      const result = resolveCombat(preview)
      setCombatResult(result)
      
      // After showing result, close and apply
      setTimeout(() => {
        onResolve({
          attacker: {
            ...result.attacker,
            unitId: attacker.id,
          },
          defender: {
            ...result.defender,
            unitId: defender.id,
          },
          hexCaptured: result.hexCaptured,
          hex,
        })
      }, 2000)
    }, 500)
  }, [preview, isResolving, attacker, defender, hex, onResolve])
  
  if (!attacker || !defender) return null
  
  // Get veterancy info
  const attackerVet = getVeterancyLevel(attacker.experience || 0)
  const defenderVet = getVeterancyLevel(defender.experience || 0)
  
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-void-950/90 backdrop-blur-sm"
      style={{ touchAction: 'manipulation' }}
    >
      <div 
        className="w-full max-w-lg mx-4 bg-void-900 border border-red-500/30 rounded-lg shadow-2xl overflow-hidden"
        style={{ maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="px-4 py-3 bg-red-500/10 border-b border-red-500/30">
          <h2 className="text-lg font-display tracking-wider text-red-400 text-center">
            ⚔ COMBAT ⚔
          </h2>
          {terrain && (
            <p className="text-xs text-center text-steel-light/60 mt-1">
              {terrain.name} • Defense +{Math.round(terrain.defenseModifier * 100)}%
            </p>
          )}
        </div>
        
        {/* Combatants */}
        <div className="p-4">
          <div className="flex gap-4">
            {/* Attacker */}
            <UnitCard
              unit={attacker}
              unitDef={attackerDef}
              faction={attackerFaction}
              veterancy={attackerVet}
              side="attacker"
              preview={preview?.attacker}
              result={combatResult?.attacker}
            />
            
            {/* VS */}
            <div className="flex-shrink-0 flex items-center">
              <span className="text-2xl text-red-500 font-bold">VS</span>
            </div>
            
            {/* Defender */}
            <UnitCard
              unit={defender}
              unitDef={defenderDef}
              faction={defenderFaction}
              veterancy={defenderVet}
              side="defender"
              preview={preview?.defender}
              result={combatResult?.defender}
            />
          </div>
          
          {/* Combat Preview */}
          {preview && !combatResult && (
            <div className="mt-4 p-3 bg-void-950/50 rounded border border-steel-light/10">
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <div className="text-steel-light/50">Attack Force</div>
                  <div className="text-red-400 font-mono text-lg">{preview.attacker.force}</div>
                </div>
                <div>
                  <div className="text-steel-light/50">Win Chance</div>
                  <div className={`font-mono text-lg ${preview.winProbability > 50 ? 'text-green-400' : 'text-amber-400'}`}>
                    {preview.winProbability}%
                  </div>
                </div>
                <div>
                  <div className="text-steel-light/50">Defense Force</div>
                  <div className="text-blue-400 font-mono text-lg">{preview.defender.force}</div>
                </div>
              </div>
              
              {/* Doctrine advantage indicator */}
              {preview.doctrineAdvantage !== 0 && (
                <div className={`text-center text-xs mt-2 ${preview.doctrineAdvantage > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {preview.doctrineAdvantage > 0 ? '▲' : '▼'} 
                  Doctrine {preview.doctrineAdvantage > 0 ? 'advantage' : 'disadvantage'} 
                  ({Math.abs(Math.round(preview.doctrineAdvantage * 100))}%)
                </div>
              )}
            </div>
          )}
          
          {/* Combat Result */}
          {combatResult && (
            <div className="mt-4 p-4 bg-void-950/50 rounded border border-amber-500/30">
              <h3 className="text-center font-display text-amber-400 mb-3">
                COMBAT RESOLVED
              </h3>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className={`text-center ${combatResult.attacker.destroyed ? 'text-red-400' : ''}`}>
                  <div className="text-steel-light/50 text-xs">Attacker</div>
                  <div className="font-mono">
                    -{combatResult.attacker.damageTaken} HP
                  </div>
                  {combatResult.attacker.destroyed && (
                    <div className="text-red-400 text-xs">DESTROYED</div>
                  )}
                </div>
                <div className={`text-center ${combatResult.defender.destroyed ? 'text-red-400' : ''}`}>
                  <div className="text-steel-light/50 text-xs">Defender</div>
                  <div className="font-mono">
                    -{combatResult.defender.damageTaken} HP
                  </div>
                  {combatResult.defender.destroyed && (
                    <div className="text-red-400 text-xs">DESTROYED</div>
                  )}
                </div>
              </div>
              
              {combatResult.hexCaptured && (
                <div className="text-center text-green-400 mt-3 font-display">
                  🏴 TERRITORY CAPTURED
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Doctrine Selection (only if player is attacker and not resolved) */}
        {isPlayerAttacker && !combatResult && (
          <div className="px-4 pb-4">
            <div className="text-xs text-steel-light/50 uppercase tracking-wider mb-2">
              Select Doctrine
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.values(DOCTRINES).map((doctrine) => {
                const isAvailable = availableDoctrines.includes(doctrine.id)
                const isSelected = attackerDoctrine === doctrine.id
                const isRecommended = doctrine.id === recommendedDoctrine
                
                return (
                  <button
                    key={doctrine.id}
                    onPointerUp={() => isAvailable && setAttackerDoctrine(doctrine.id)}
                    disabled={!isAvailable || isResolving}
                    className={`
                      p-2 rounded border text-left transition-all
                      ${isSelected 
                        ? 'border-amber-500 bg-amber-500/20' 
                        : isAvailable 
                          ? 'border-steel-light/20 hover:border-steel-light/40 bg-void-950/30'
                          : 'border-steel-light/10 opacity-40'
                      }
                    `}
                    style={{ touchAction: 'manipulation' }}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-display ${isSelected ? 'text-amber-400' : 'text-steel-bright'}`}>
                        {doctrine.name}
                      </span>
                      {isRecommended && (
                        <span className="text-xs text-green-400">★</span>
                      )}
                    </div>
                    <div className="flex gap-2 mt-1 text-[10px]">
                      <span className={doctrine.attackModifier >= 0 ? 'text-green-400/70' : 'text-red-400/70'}>
                        ATK {doctrine.attackModifier >= 0 ? '+' : ''}{Math.round(doctrine.attackModifier * 100)}%
                      </span>
                      <span className={doctrine.defenseModifier >= 0 ? 'text-green-400/70' : 'text-red-400/70'}>
                        DEF {doctrine.defenseModifier >= 0 ? '+' : ''}{Math.round(doctrine.defenseModifier * 100)}%
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}
        
        {/* Actions */}
        {!combatResult && (
          <div className="px-4 pb-4 flex gap-3">
            <button
              onPointerUp={onCancel}
              disabled={isResolving}
              className="flex-1 py-3 text-sm text-steel-light/60 hover:text-steel-light
                         border border-steel-light/20 hover:border-steel-light/40 rounded
                         transition-colors disabled:opacity-50"
              style={{ touchAction: 'manipulation' }}
            >
              Retreat
            </button>
            <button
              onPointerUp={handleResolve}
              disabled={isResolving}
              className={`
                flex-1 py-3 text-sm font-display tracking-wider uppercase rounded
                transition-all
                ${isResolving 
                  ? 'bg-amber-500/20 text-amber-400 animate-pulse' 
                  : 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30'
                }
              `}
              style={{ touchAction: 'manipulation' }}
            >
              {isResolving ? 'Resolving...' : 'Attack!'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// Unit card component
function UnitCard({ unit, unitDef, faction, veterancy, side, preview, result }) {
  const isAttacker = side === 'attacker'
  const borderColor = isAttacker ? 'border-red-500/30' : 'border-blue-500/30'
  const bgColor = isAttacker ? 'bg-red-500/5' : 'bg-blue-500/5'
  
  // Calculate displayed health
  const displayHealth = result ? result.newHealth : unit.health
  const healthColor = displayHealth > 60 ? 'text-green-400' : 
                      displayHealth > 30 ? 'text-amber-400' : 'text-red-400'
  
  return (
    <div className={`flex-1 p-3 rounded border ${borderColor} ${bgColor}`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <span 
          className="text-lg"
          style={{ color: faction?.color }}
        >
          {faction?.emblem}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-steel-bright truncate">{unitDef?.name}</div>
          <div className="text-[10px] text-steel-light/50">{faction?.name}</div>
        </div>
      </div>
      
      {/* Unit icon */}
      <div 
        className="w-full h-16 rounded flex items-center justify-center mb-2"
        style={{ backgroundColor: faction?.color + '20' }}
      >
        {unitDef?.svgPath && (
          <svg viewBox="0 0 100 100" className="w-12 h-12">
            <path 
              d={unitDef.svgPath} 
              fill={faction?.color || '#888'}
              opacity={result?.destroyed ? 0.3 : 1}
            />
          </svg>
        )}
        {result?.destroyed && (
          <span className="absolute text-3xl">💀</span>
        )}
      </div>
      
      {/* Stats */}
      <div className="space-y-1 text-xs">
        {/* Health bar */}
        <div className="flex items-center gap-2">
          <span className="text-steel-light/50 w-8">HP</span>
          <div className="flex-1 h-2 bg-void-950 rounded overflow-hidden">
            <div 
              className="h-full transition-all duration-500"
              style={{ 
                width: `${displayHealth}%`,
                backgroundColor: displayHealth > 60 ? '#55a870' : displayHealth > 30 ? '#c4a35a' : '#c45555',
              }}
            />
          </div>
          <span className={`font-mono w-8 text-right ${healthColor}`}>
            {displayHealth}
          </span>
        </div>
        
        {/* Veterancy */}
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-steel-light/50">Rank</span>
          <span className="text-amber-400">
            {veterancy?.icon} {veterancy?.name}
          </span>
        </div>
        
        {/* Preview damage */}
        {preview && !result && (
          <div className="flex items-center justify-between text-[10px] border-t border-steel-light/10 pt-1 mt-1">
            <span className="text-steel-light/50">Est. Damage</span>
            <span className="text-red-400 font-mono">
              -{preview.damageTaken}
            </span>
          </div>
        )}
        
        {/* Result damage */}
        {result && (
          <div className="flex items-center justify-between text-[10px] border-t border-steel-light/10 pt-1 mt-1">
            <span className="text-steel-light/50">Damage Taken</span>
            <span className="text-red-400 font-mono font-bold">
              -{result.damageTaken}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
