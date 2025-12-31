// Combat Modal - Battle preview and resolution UI

import { useState, useEffect } from 'react'
import { UNITS, DOCTRINES, getVeterancyLevel, VETERANCY_LEVELS, getBranchColor } from '../data/units'
import { TERRAIN_TYPES } from '../data/terrain'
import { FACTIONS } from '../data/factions'
import { previewCombat, getAvailableDoctrines, getRecommendedDoctrine, resolveCombat } from '../utils/combatResolver'

// Unit portrait component
function UnitPortrait({ unit, isAttacker, faction }) {
  const unitDef = UNITS[unit.type]
  const vetLevel = getVeterancyLevel(unit.experience || 0)
  const branchColor = getBranchColor(unitDef?.branch)
  
  return (
    <div className={`
      relative p-4 rounded-lg border-2
      ${isAttacker ? 'border-red-500/50' : 'border-blue-500/50'}
      bg-steel/50
    `}>
      <div className="absolute top-2 right-2 text-xs font-mono text-steel-light/50">
        {isAttacker ? 'ATK' : 'DEF'}
      </div>
      
      <div className="flex items-center gap-3 mb-3">
        <div 
          className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
          style={{ backgroundColor: faction?.color + '30', borderColor: faction?.color }}
        >
          {unitDef?.svgPath ? 'âš”' : 'â—'}
        </div>
        <div>
          <div className="font-display text-steel-bright">
            {unitDef?.name || unit.type}
          </div>
          <div className="text-xs" style={{ color: faction?.color }}>
            {faction?.name}
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-2 text-xs mb-3">
        <div className="flex justify-between">
          <span className="text-steel-light/60">ATK:</span>
          <span className="text-red-400 font-mono">{unitDef?.stats.attack}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-steel-light/60">DEF:</span>
          <span className="text-blue-400 font-mono">{unitDef?.stats.defense}</span>
        </div>
      </div>
      
      <div className="flex items-center justify-between text-xs">
        <span className="text-steel-light/60">{vetLevel.icon} {vetLevel.name}</span>
        <span style={{ color: branchColor }}>{unitDef?.branch}</span>
      </div>
      
      {/* Health bar */}
      <div className="mt-3">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-steel-light/60">Health</span>
          <span className={unit.health < 50 ? 'text-red-400' : 'text-green-400'}>
            {unit.health}%
          </span>
        </div>
        <div className="h-2 bg-steel-dark rounded overflow-hidden">
          <div 
            className={`h-full transition-all ${unit.health < 30 ? 'bg-red-500' : unit.health < 60 ? 'bg-yellow-500' : 'bg-green-500'}`}
            style={{ width: `${unit.health}%` }}
          />
        </div>
      </div>
    </div>
  )
}

// Doctrine selector
function DoctrineSelector({ availableDoctrines, selectedDoctrine, onSelect, recommended, disabled }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {availableDoctrines.map(docId => {
        const doc = DOCTRINES[docId]
        if (!doc) return null
        
        const isSelected = selectedDoctrine === docId
        const isRecommended = recommended === docId
        
        return (
          <button
            key={docId}
            onClick={() => !disabled && onSelect(docId)}
            disabled={disabled}
            className={`
              p-2 rounded border text-left text-xs transition-all
              ${isSelected 
                ? 'border-continuity bg-continuity/20' 
                : 'border-steel-light/20 bg-steel/30 hover:border-steel-light/40'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-display uppercase tracking-wide text-steel-bright">
                {doc.name}
              </span>
              {isRecommended && (
                <span className="text-yellow-400 text-[10px]">â˜…</span>
              )}
            </div>
            <div className="flex gap-2 text-[10px] font-mono">
              <span className={doc.attackModifier >= 0 ? 'text-green-400' : 'text-red-400'}>
                ATK: {doc.attackModifier >= 0 ? '+' : ''}{Math.round(doc.attackModifier * 100)}%
              </span>
              <span className={doc.defenseModifier >= 0 ? 'text-green-400' : 'text-red-400'}>
                DEF: {doc.defenseModifier >= 0 ? '+' : ''}{Math.round(doc.defenseModifier * 100)}%
              </span>
            </div>
          </button>
        )
      })}
    </div>
  )
}

// Combat preview display
function CombatPreview({ preview }) {
  if (!preview) return null
  
  const { attacker, defender, winProbability, doctrineAdvantage } = preview
  
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {/* Attacker stats */}
        <div className="p-3 rounded bg-red-500/10 border border-red-500/30">
          <div className="text-xs text-red-400 mb-2 font-display">ATTACKER</div>
          <div className="space-y-1 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-steel-light/60">Force:</span>
              <span className="text-steel-bright">{attacker.force}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-steel-light/60">Damage:</span>
              <span className="text-red-400">-{attacker.damageTaken}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-steel-light/60">Result:</span>
              <span className={attacker.destroyed ? 'text-red-500' : 'text-green-400'}>
                {attacker.destroyed ? 'DESTROYED' : `${attacker.newHealth}%`}
              </span>
            </div>
          </div>
        </div>
        
        {/* Defender stats */}
        <div className="p-3 rounded bg-blue-500/10 border border-blue-500/30">
          <div className="text-xs text-blue-400 mb-2 font-display">DEFENDER</div>
          <div className="space-y-1 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-steel-light/60">Force:</span>
              <span className="text-steel-bright">{defender.force}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-steel-light/60">Damage:</span>
              <span className="text-red-400">-{defender.damageTaken}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-steel-light/60">Result:</span>
              <span className={defender.destroyed ? 'text-red-500' : 'text-green-400'}>
                {defender.destroyed ? 'DESTROYED' : `${defender.newHealth}%`}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Win probability */}
      <div className="p-3 rounded bg-steel/30 border border-steel-light/20">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-steel-light/60">Win Probability</span>
          <span className={`text-sm font-mono ${winProbability > 50 ? 'text-green-400' : 'text-red-400'}`}>
            {winProbability}%
          </span>
        </div>
        <div className="h-2 bg-steel-dark rounded overflow-hidden">
          <div 
            className={`h-full transition-all ${winProbability > 50 ? 'bg-green-500' : 'bg-red-500'}`}
            style={{ width: `${winProbability}%` }}
          />
        </div>
        
        {doctrineAdvantage !== 0 && (
          <div className="mt-2 text-xs">
            <span className="text-steel-light/60">Doctrine: </span>
            <span className={doctrineAdvantage > 0 ? 'text-green-400' : 'text-red-400'}>
              {doctrineAdvantage > 0 ? '+' : ''}{Math.round(doctrineAdvantage * 100)}%
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// Combat result display
function CombatResult({ result, onClose }) {
  const { attacker, defender, hexCaptured } = result
  
  return (
    <div className="space-y-4 text-center">
      <div className="font-display text-xl tracking-wider text-steel-bright">
        COMBAT RESOLVED
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className={`p-4 rounded border ${
          attacker.destroyed ? 'border-red-500/50 bg-red-500/10' : 'border-slate-600 bg-slate-800/50'
        }`}>
          <div className="text-sm text-slate-400 mb-2">Attacker</div>
          {attacker.destroyed ? (
            <div className="text-red-400 font-display">DESTROYED</div>
          ) : (
            <>
              <div className="text-slate-300">
                Health: <span className="text-cyan-400">{attacker.newHealth}%</span>
              </div>
              <div className="text-xs text-slate-500">
                Damage taken: {attacker.damageTaken}
              </div>
            </>
          )}
        </div>
        
        <div className={`p-4 rounded border ${
          defender.destroyed ? 'border-red-500/50 bg-red-500/10' : 'border-slate-600 bg-slate-800/50'
        }`}>
          <div className="text-sm text-slate-400 mb-2">Defender</div>
          {defender.destroyed ? (
            <div className="text-red-400 font-display">DESTROYED</div>
          ) : (
            <>
              <div className="text-slate-300">
                Health: <span className="text-cyan-400">{defender.newHealth}%</span>
              </div>
              <div className="text-xs text-slate-500">
                Damage taken: {defender.damageTaken}
              </div>
              {defender.retreats && (
                <div className="text-xs text-amber-400 mt-1">
                  Retreating!
                </div>
              )}
            </>
          )}
        </div>
      </div>
      
      {hexCaptured && (
        <div className="py-3 px-4 bg-emerald-500/20 border border-emerald-500/30 rounded-lg">
          <span className="text-emerald-400 font-display tracking-wide">
            âœ“ TERRITORY CAPTURED
          </span>
        </div>
      )}
      
      <button
        onClick={onClose}
        className="px-6 py-2 bg-amber-500/20 border border-amber-500/50 rounded
                   text-amber-400 font-display tracking-wider hover:bg-amber-500/30 transition-all"
      >
        CONTINUE
      </button>
    </div>
  )
}

// Main Combat Modal
export function CombatModal({ 
  attacker, 
  defender, 
  terrain,
  onResolve, 
  onCancel,
  playerFaction 
}) {
  const [attackerDoctrine, setAttackerDoctrine] = useState('assault')
  const [defenderDoctrine, setDefenderDoctrine] = useState('defensive')
  const [preview, setPreview] = useState(null)
  const [result, setResult] = useState(null)
  const [isResolving, setIsResolving] = useState(false)
  
  const attackerFaction = FACTIONS[attacker.owner]
  const defenderFaction = FACTIONS[defender.owner]
  const isPlayerAttacking = attacker.owner === playerFaction
  
  // Get available doctrines
  const attackerDoctrines = getAvailableDoctrines(attacker)
  const defenderDoctrines = getAvailableDoctrines(defender)
  
  // Get recommended doctrines
  const recommendedAttacker = getRecommendedDoctrine(attacker, defender, terrain, true)
  const recommendedDefender = getRecommendedDoctrine(defender, attacker, terrain, false)
  
  // Update preview when doctrines change
  useEffect(() => {
    const newPreview = previewCombat(
      attacker, 
      defender, 
      attackerDoctrine, 
      defenderDoctrine, 
      terrain
    )
    setPreview(newPreview)
  }, [attacker, defender, attackerDoctrine, defenderDoctrine, terrain])
  
  // Auto-select AI doctrine
  useEffect(() => {
    if (!isPlayerAttacking) {
      // AI selects attacker doctrine
      setAttackerDoctrine(recommendedAttacker)
    } else {
      // AI selects defender doctrine
      setDefenderDoctrine(recommendedDefender)
    }
  }, [isPlayerAttacking, recommendedAttacker, recommendedDefender])
  
  const handleResolve = () => {
    if (!preview) return
    
    setIsResolving(true)
    
    // Animate resolution
    setTimeout(() => {
      const combatResult = resolveCombat(preview)
      setResult(combatResult)
      setIsResolving(false)
    }, 1500)
  }
  
  const handleClose = () => {
    if (result) {
      // Pass result to parent
      onResolve({
        attackerHealth: result.attacker.newHealth,
        defenderHealth: result.defender.newHealth,
        attackerDestroyed: result.attacker.destroyed,
        defenderDestroyed: result.defender.destroyed,
        attackerXPGain: result.attacker.expGain || 5,
        defenderXPGain: result.defender.expGain || 5,
        hexCaptured: result.hexCaptured,
      })
    }
  }
  
  const terrainData = TERRAIN_TYPES[terrain]
  
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && !isResolving && onCancel()}>
      <div className="modal-content max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-xl tracking-wider text-steel-bright">
            COMBAT
          </h2>
          <div className="text-xs text-steel-light/60">
            Terrain: <span className="text-steel-light">{terrainData?.name || terrain}</span>
            {terrainData?.defenseModifier > 0 && (
              <span className="text-green-400 ml-2">
                +{Math.round(terrainData.defenseModifier * 100)}% DEF
              </span>
            )}
          </div>
        </div>
        
        {result ? (
          <CombatResult result={result} onClose={handleClose} />
        ) : isResolving ? (
          <div className="text-center py-12">
            <div className="font-display text-2xl text-steel-bright animate-pulse mb-4">
              RESOLVING COMBAT...
            </div>
            <div className="text-6xl animate-bounce">âš”ï¸</div>
          </div>
        ) : (
          <>
            {/* Unit portraits */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <UnitPortrait unit={attacker} isAttacker={true} faction={attackerFaction} />
              <UnitPortrait unit={defender} isAttacker={false} faction={defenderFaction} />
            </div>
            
            {/* Doctrine selection */}
            <div className="mb-6">
              <div className="text-xs text-steel-light/60 mb-2 font-display uppercase tracking-wider">
                {isPlayerAttacking ? 'Select Your Doctrine' : 'Enemy Doctrine'}
              </div>
              
              {isPlayerAttacking ? (
                <DoctrineSelector
                  availableDoctrines={attackerDoctrines}
                  selectedDoctrine={attackerDoctrine}
                  onSelect={setAttackerDoctrine}
                  recommended={recommendedAttacker}
                  disabled={false}
                />
              ) : (
                <div className="p-3 rounded bg-steel/30 border border-steel-light/20">
                  <div className="font-display text-steel-bright">
                    {DOCTRINES[attackerDoctrine]?.name || attackerDoctrine}
                  </div>
                  <div className="text-xs text-steel-light/60">
                    Enemy has selected their doctrine
                  </div>
                </div>
              )}
            </div>
            
            {/* Combat preview */}
            <CombatPreview preview={preview} />
            
            {/* Actions */}
            <div className="flex gap-4 mt-6">
              <button
                onClick={onCancel}
                className="flex-1 px-4 py-3 rounded border border-steel-light/30 
                           text-steel-light font-display tracking-wider
                           hover:bg-steel/30 transition-all"
              >
                CANCEL
              </button>
              <button
                onClick={handleResolve}
                className="flex-1 px-4 py-3 rounded border border-red-500/50 
                           bg-red-500/20 text-red-400 font-display tracking-wider
                           hover:bg-red-500/30 transition-all"
              >
                ATTACK
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default CombatModal
