// Combat Modal - Battle preview and resolution UI

import { useState, useEffect } from 'react'
import { UNITS, DOCTRINES, getVeterancyLevel, VETERANCY_LEVELS, getBranchColor } from '../data/units'
import { TERRAIN_TYPES, BUILDINGS } from '../data/terrain'
import { FACTIONS } from '../data/factions'
import { previewCombat, getAvailableDoctrines, getRecommendedDoctrine } from '../utils/combatResolver'
import { getFactionImage, getBranchImage, getVeterancyImage, getTerrainImage, getBuildingImage } from '../assets'

// Unit portrait component
function UnitPortrait({ unit, isAttacker, faction }) {
  const unitDef = UNITS[unit.type]
  const vetLevel = getVeterancyLevel(unit.experience || 0)
  const branchColor = getBranchColor(unitDef?.branch)
  const factionImage = getFactionImage(faction?.id)
  const branchImage = getBranchImage(unitDef?.branch)
  const vetImage = getVeterancyImage(vetLevel.id)
  
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
        {factionImage ? (
          <img 
            src={factionImage} 
            alt={faction?.name}
            className="w-12 h-12 object-contain drop-shadow-lg"
          />
        ) : (
          <div 
            className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
            style={{ backgroundColor: faction?.color + '30', borderColor: faction?.color }}
          >
            {unitDef?.svgPath ? '⚔' : '●'}
          </div>
        )}
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
        <div className="flex items-center gap-1">
          {vetImage ? (
            <img src={vetImage} alt={vetLevel.name} className="w-5 h-5 object-contain" />
          ) : (
            <span className="text-steel-light/60">{vetLevel.icon}</span>
          )}
          <span className="text-steel-light/60">{vetLevel.name}</span>
        </div>
        <div className="flex items-center gap-1">
          {branchImage ? (
            <img src={branchImage} alt={unitDef?.branch} className="w-5 h-5 object-contain" />
          ) : (
            <span style={{ color: branchColor }}>{unitDef?.branch}</span>
          )}
        </div>
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
                <span className="text-yellow-400 text-[10px]">★</span>
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
      
      {/* Win probability bar */}
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="text-red-400">Attacker</span>
          <span className="text-steel-light">{Math.round(winProbability * 100)}%</span>
          <span className="text-blue-400">Defender</span>
        </div>
        <div className="h-3 bg-blue-500/30 rounded overflow-hidden">
          <div 
            className="h-full bg-red-500/70 transition-all"
            style={{ width: `${winProbability * 100}%` }}
          />
        </div>
      </div>
      
      {/* Doctrine advantage */}
      {doctrineAdvantage !== 0 && (
        <div className="text-center text-xs">
          <span className={doctrineAdvantage > 0 ? 'text-green-400' : 'text-red-400'}>
            Doctrine {doctrineAdvantage > 0 ? 'Advantage' : 'Disadvantage'}: {doctrineAdvantage > 0 ? '+' : ''}{Math.round(doctrineAdvantage * 100)}%
          </span>
        </div>
      )}
    </div>
  )
}

// Main CombatModal component
export default function CombatModal({ 
  attacker, 
  defender, 
  terrain,
  hexBuildings = [],
  onResolve, 
  onCancel 
}) {
  const [attackerDoctrine, setAttackerDoctrine] = useState('assault')
  const [defenderDoctrine, setDefenderDoctrine] = useState('defensive')
  const [preview, setPreview] = useState(null)
  const [isResolving, setIsResolving] = useState(false)
  const [result, setResult] = useState(null)
  
  const attackerFaction = FACTIONS[attacker?.owner]
  const defenderFaction = FACTIONS[defender?.owner]
  const terrainData = TERRAIN_TYPES[terrain] || TERRAIN_TYPES.plains
  const terrainImage = getTerrainImage(terrain)
  
  // Check if defender has fortress
  const hasFortress = hexBuildings?.includes('fortress')
  const fortressImage = hasFortress ? getBuildingImage('fortress') : null
  
  // Get available doctrines for each side
  const attackerDoctrines = getAvailableDoctrines(attacker)
  const defenderDoctrines = getAvailableDoctrines(defender)
  
  // Get recommended doctrines
  const recommendedAttacker = getRecommendedDoctrine(attacker, defender, terrain, true)
  const recommendedDefender = getRecommendedDoctrine(defender, attacker, terrain, false)
  
  // Update preview when doctrines change
  useEffect(() => {
    if (attacker && defender) {
      const combatPreview = previewCombat(
        attacker, 
        defender, 
        attackerDoctrine, 
        defenderDoctrine, 
        terrain,
        hexBuildings
      )
      setPreview(combatPreview)
    }
  }, [attacker, defender, attackerDoctrine, defenderDoctrine, terrain, hexBuildings])
  
  const handleResolve = () => {
    setIsResolving(true)
    
    // Simulate combat resolution delay
    setTimeout(() => {
      if (onResolve) {
        onResolve({
          attackerDoctrine,
          defenderDoctrine,
          preview
        })
      }
    }, 1000)
  }
  
  if (!attacker || !defender) return null
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-void-950 border border-steel-light/20 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-xl tracking-wider text-steel-bright flex items-center gap-2">
            ⚔ COMBAT
            {hasFortress && (
              <span className="flex items-center gap-1 text-sm text-blue-400 font-mono">
                {fortressImage ? (
                  <img src={fortressImage} alt="Fortress" className="w-6 h-6 object-contain" />
                ) : (
                  '🏰'
                )}
                Fortress
              </span>
            )}
          </h2>
          <div className="flex items-center gap-2 text-xs text-steel-light/60">
            <span>Terrain:</span>
            {terrainImage ? (
              <img src={terrainImage} alt={terrainData.name} className="w-6 h-6 rounded object-cover" />
            ) : null}
            <span className="text-steel-bright">{terrainData.name}</span>
            {terrainData.defenseModifier > 0 && (
              <span className="text-green-400 ml-2">
                +{Math.round(terrainData.defenseModifier * 100)}% DEF
              </span>
            )}
          </div>
        </div>
        
        {!isResolving ? (
          <>
            {/* Unit portraits */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <UnitPortrait unit={attacker} isAttacker={true} faction={attackerFaction} />
              <UnitPortrait unit={defender} isAttacker={false} faction={defenderFaction} />
            </div>
            
            {/* Doctrine selection */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <div className="text-xs text-steel-light/60 mb-2 font-display uppercase">
                  Attacker Doctrine
                </div>
                <DoctrineSelector 
                  availableDoctrines={attackerDoctrines}
                  selectedDoctrine={attackerDoctrine}
                  onSelect={setAttackerDoctrine}
                  recommended={recommendedAttacker}
                />
              </div>
              <div>
                <div className="text-xs text-steel-light/60 mb-2 font-display uppercase">
                  Defender Doctrine
                </div>
                <DoctrineSelector 
                  availableDoctrines={defenderDoctrines}
                  selectedDoctrine={defenderDoctrine}
                  onSelect={setDefenderDoctrine}
                  recommended={recommendedDefender}
                  disabled={true}
                />
              </div>
            </div>
            
            {/* Combat preview */}
            <div className="mb-6">
              <div className="text-xs text-steel-light/60 mb-2 font-display uppercase">
                Battle Forecast
              </div>
              <CombatPreview preview={preview} />
            </div>
            
            {/* Territory capture notice */}
            {preview?.defender?.destroyed && (
              <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded text-center">
                <span className="text-green-400 text-sm font-display">
                  ✓ TERRITORY CAPTURED
                </span>
              </div>
            )}
            
            {/* Actions */}
            <div className="flex justify-end gap-3">
              <button
                onClick={onCancel}
                className="btn bg-steel/30 text-steel-light border-steel-light/20 hover:bg-steel/50"
              >
                Retreat
              </button>
              <button
                onClick={handleResolve}
                className="btn bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30"
              >
                Engage
              </button>
            </div>
          </>
        ) : (
          /* Combat resolution animation */
          <div className="py-12 text-center">
            <div className="text-6xl animate-bounce">⚔️</div>
            <div className="mt-4 font-display text-steel-bright animate-pulse">
              Resolving Combat...
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
