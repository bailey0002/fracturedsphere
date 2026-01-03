// GameBoard.jsx - Mobile-first with step-by-step action prompts
// Fully functional iOS-compatible console UI

import { useMemo, useEffect, useState, useCallback } from 'react'
import HexMap from './HexMap'
import HexInfoPanel from './HexInfoPanel'
import CombatModal from './CombatModal'
import BuildMenu from './BuildMenu'
import TrainMenu from './TrainMenu'
import DiplomacyPanel from './DiplomacyPanel'
import { useAI } from '../hooks/useAI'
import { FACTIONS } from '../data/factions'
import { UNITS } from '../data/units'
import { BUILDINGS } from '../data/terrain'
import { hexId } from '../utils/hexMath'

// Phase definitions
const PHASES = {
  production: { icon: '⚙', name: 'Production', color: 'text-yellow-400' },
  diplomacy: { icon: '🤝', name: 'Diplomacy', color: 'text-blue-400' },
  movement: { icon: '➤', name: 'Movement', color: 'text-green-400' },
  combat: { icon: '⚔', name: 'Combat', color: 'text-red-400' },
}

const PHASE_ORDER = ['production', 'diplomacy', 'movement', 'combat']

export default function GameBoard({ state, actions, dispatch }) {
  const {
    turn,
    phase,
    phaseIndex,
    mapData,
    units,
    selectedHex,
    selectedUnit,
    validMoves,
    validAttacks,
    playerFaction,
    factionResources,
    pendingCombat,
    buildingQueue = [],
    trainingQueue = [],
    relations,
  } = state

  // Local UI state
  const [activePanel, setActivePanel] = useState(null) // 'info' | 'build' | 'train' | null
  const [showDiplomacy, setShowDiplomacy] = useState(false)
  const [aiThinking, setAiThinking] = useState(false)

  // Faction data
  const factionData = FACTIONS[playerFaction] || {}
  const resources = factionResources?.[playerFaction] || { gold: 0, iron: 0, grain: 0 }

  // AI hook
  const { processAllAI } = useAI?.(state, dispatch) || { processAllAI: async () => {} }

  // Process AI on movement phase
  useEffect(() => {
    if (phase === 'movement' && !aiThinking) {
      setAiThinking(true)
      const timer = setTimeout(() => {
        processAllAI?.().finally(() => setAiThinking(false))
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [phase, turn])

  // Selected hex data
  const selectedHexData = useMemo(() => {
    if (!selectedHex) return null
    return mapData[selectedHex] || null
  }, [selectedHex, mapData])

  // Units on selected hex
  const unitsOnSelectedHex = useMemo(() => {
    if (!selectedHexData) return []
    return units.filter(u => u.q === selectedHexData.q && u.r === selectedHexData.r)
  }, [selectedHexData, units])

  // Selected unit object
  const selectedUnitData = useMemo(() => {
    if (!selectedUnit) return null
    return units.find(u => u.id === selectedUnit) || null
  }, [selectedUnit, units])

  // Derived states for UI logic
  const isPlayerHex = selectedHexData?.owner === playerFaction
  const hasPlayerUnits = unitsOnSelectedHex.some(u => u.owner === playerFaction)
  const canBuild = phase === 'production' && isPlayerHex
  const canTrain = phase === 'production' && isPlayerHex
  const unmovedUnits = units.filter(u => u.owner === playerFaction && !u.movedThisTurn)
  const hasEnemiesInRange = validAttacks.length > 0

  // Territory count
  const territoryCount = useMemo(() => {
    return Object.values(mapData).filter(h => h.owner === playerFaction).length
  }, [mapData, playerFaction])
  const totalHexes = Object.keys(mapData).length

  // ============================================
  // ACTION PROMPT SYSTEM - The key UX feature
  // ============================================
  const actionPrompt = useMemo(() => {
    // Priority-ordered prompts based on game state
    
    // AI thinking
    if (aiThinking) {
      return { text: 'AI factions are taking their turns...', type: 'wait', icon: '⏳' }
    }

    // Combat pending
    if (pendingCombat) {
      return { text: 'Resolve the combat or cancel', type: 'combat', icon: '⚔' }
    }

    // Phase-specific prompts
    switch (phase) {
      case 'production':
        if (!selectedHex) {
          return { text: 'Tap one of your territories to build or train', type: 'select', icon: '👆' }
        }
        if (selectedHex && !isPlayerHex) {
          return { text: 'Select YOUR territory (highlighted in your color)', type: 'wrong', icon: '⚠' }
        }
        if (selectedHex && isPlayerHex) {
          return { text: 'Choose BUILD or TRAIN below, or tap NEXT PHASE', type: 'action', icon: '🔨' }
        }
        break

      case 'diplomacy':
        return { text: 'Open Diplomacy panel or tap NEXT PHASE to skip', type: 'optional', icon: '🤝' }

      case 'movement':
        if (!selectedHex && unmovedUnits.length > 0) {
          return { text: `Tap a hex with your units (${unmovedUnits.length} can move)`, type: 'select', icon: '👆' }
        }
        if (selectedHex && !hasPlayerUnits) {
          return { text: 'No units here. Tap a hex with YOUR units', type: 'wrong', icon: '⚠' }
        }
        if (selectedUnit && validMoves.length > 0) {
          return { text: `Tap a GREEN hex to move (${validMoves.length} options)`, type: 'move', icon: '➤' }
        }
        if (selectedUnit && validMoves.length === 0 && validAttacks.length === 0) {
          return { text: 'This unit has no moves. Select another or NEXT PHASE', type: 'done', icon: '✓' }
        }
        if (selectedUnit && validAttacks.length > 0) {
          return { text: `Tap RED hex to attack (${validAttacks.length} targets)`, type: 'attack', icon: '⚔' }
        }
        if (unmovedUnits.length === 0) {
          return { text: 'All units moved! Tap NEXT PHASE or END TURN', type: 'done', icon: '✓' }
        }
        break

      case 'combat':
        if (validAttacks.length > 0) {
          return { text: 'Select unit and tap enemy to attack', type: 'attack', icon: '⚔' }
        }
        return { text: 'No attacks available. Tap END TURN', type: 'done', icon: '✓' }
    }

    return { text: 'Tap NEXT PHASE to continue', type: 'default', icon: '→' }
  }, [phase, selectedHex, selectedUnit, isPlayerHex, hasPlayerUnits, validMoves, validAttacks, unmovedUnits, pendingCombat, aiThinking])

  // Prompt colors
  const promptColors = {
    select: 'bg-blue-900/80 border-blue-500',
    action: 'bg-green-900/80 border-green-500',
    move: 'bg-green-900/80 border-green-500',
    attack: 'bg-red-900/80 border-red-500',
    combat: 'bg-red-900/80 border-red-500',
    wrong: 'bg-yellow-900/80 border-yellow-500',
    done: 'bg-steel/50 border-steel-light',
    optional: 'bg-purple-900/80 border-purple-500',
    wait: 'bg-steel/50 border-steel-light',
    default: 'bg-steel/50 border-steel-light',
  }

  // ============================================
  // EVENT HANDLERS
  // ============================================
  
  const handleHexClick = useCallback((q, r) => {
    const clickedHexId = hexId(q, r)
    
    // If we have a selected unit and this is a valid move
    if (selectedUnit && validMoves.some(m => m.q === q && m.r === r)) {
      actions.moveUnit(q, r)
      return
    }
    
    // If we have a selected unit and this is a valid attack
    if (selectedUnit && validAttacks.some(a => a.q === q && a.r === r)) {
      const targetUnit = units.find(u => u.q === q && u.r === r && u.owner !== playerFaction)
      if (targetUnit) {
        actions.initiateAttack?.(selectedUnit, targetUnit.id)
      }
      return
    }
    
    // Otherwise, select the hex
    actions.selectHex(q, r)
    
    // Auto-open info panel on mobile when hex selected
    if (window.innerWidth < 768) {
      setActivePanel('info')
    }
  }, [selectedUnit, validMoves, validAttacks, units, playerFaction, actions])

  const handleBuild = useCallback((buildingType) => {
    if (!selectedHex || !isPlayerHex) return
    actions.startBuilding?.(selectedHex, buildingType, playerFaction)
  }, [selectedHex, isPlayerHex, playerFaction, actions])

  const handleTrain = useCallback((unitType) => {
    if (!selectedHex || !isPlayerHex) return
    actions.startTraining?.(selectedHex, unitType, playerFaction)
  }, [selectedHex, isPlayerHex, playerFaction, actions])

  const handleCombatResolve = useCallback((result) => {
    actions.resolveCombat?.(result)
  }, [actions])

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="h-screen flex flex-col bg-void-950 overflow-hidden">
      
      {/* ===== HEADER: Faction + Resources ===== */}
      <header className="flex-none px-3 py-2 bg-void-900 border-b border-steel-light/20">
        <div className="flex items-center justify-between gap-2">
          {/* Faction badge */}
          <div 
            className="flex items-center gap-2 px-2 py-1 rounded border text-sm"
            style={{ borderColor: factionData.color, color: factionData.color }}
          >
            <span>{factionData.emblem || '◆'}</span>
            <span className="hidden sm:inline font-display tracking-wider">{factionData.name}</span>
          </div>
          
          {/* Resources - compact on mobile */}
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="text-yellow-400">◈{resources.gold}</span>
            <span className="text-steel-light">⬡{resources.iron}</span>
            <span className="text-green-400">❋{resources.grain}</span>
          </div>
          
          {/* Turn/Territory */}
          <div className="text-xs font-mono text-steel-light/70">
            <span className="hidden sm:inline">Turn {turn} • </span>
            <span style={{ color: factionData.color }}>{territoryCount}</span>
            <span className="text-steel-light/50">/{totalHexes}</span>
          </div>
        </div>
      </header>

      {/* ===== PHASE BAR with ACTION PROMPT ===== */}
      <div className="flex-none bg-void-900/80 border-b border-steel-light/10">
        {/* Phase indicator + controls */}
        <div className="flex items-center justify-between px-3 py-2">
          {/* Current phase */}
          <div className="flex items-center gap-2">
            <span className={`text-lg ${PHASES[phase]?.color || 'text-white'}`}>
              {PHASES[phase]?.icon || '?'}
            </span>
            <span className="font-display text-sm tracking-wider text-steel-bright uppercase">
              {PHASES[phase]?.name || phase}
            </span>
            
            {/* Phase dots */}
            <div className="hidden sm:flex items-center gap-1 ml-2">
              {PHASE_ORDER.map((p, i) => (
                <div 
                  key={p}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    p === phase ? 'bg-continuity' : 
                    i < phaseIndex ? 'bg-steel-light/40' : 'bg-steel-light/20'
                  }`}
                />
              ))}
            </div>
          </div>
          
          {/* Phase controls */}
          <div className="flex items-center gap-2">
            {phase === 'diplomacy' && (
              <button
                onClick={() => setShowDiplomacy(true)}
                className="px-3 py-1.5 text-xs font-display uppercase tracking-wider
                           bg-purple-900/50 text-purple-300 border border-purple-500/50 rounded
                           active:bg-purple-800"
              >
                Diplomacy
              </button>
            )}
            <button
              onClick={actions.advancePhase}
              className="px-3 py-1.5 text-xs font-display uppercase tracking-wider
                         bg-continuity/30 text-continuity border border-continuity/50 rounded
                         active:bg-continuity/50"
            >
              Next
            </button>
            <button
              onClick={actions.endTurn}
              className="px-3 py-1.5 text-xs font-display uppercase tracking-wider
                         bg-warning/20 text-warning border border-warning/50 rounded
                         active:bg-warning/40"
            >
              End Turn
            </button>
          </div>
        </div>
        
        {/* ACTION PROMPT - Always visible, tells user what to do */}
        <div 
          className={`px-3 py-2 border-t border-steel-light/10 ${promptColors[actionPrompt.type]}`}
        >
          <div className="flex items-center gap-2 text-sm">
            <span className="text-lg">{actionPrompt.icon}</span>
            <span className="text-white font-medium">{actionPrompt.text}</span>
          </div>
        </div>
      </div>

      {/* ===== MAP AREA ===== */}
      <div className="flex-1 min-h-0 relative">
        <HexMap
          mapData={mapData}
          units={units}
          selectedHex={selectedHex}
          validMoves={validMoves}
          validAttacks={validAttacks}
          playerFaction={playerFaction}
          onHexClick={handleHexClick}
        />
        
        {/* AI thinking overlay */}
        {aiThinking && (
          <div className="absolute inset-0 bg-void-950/70 flex items-center justify-center pointer-events-none">
            <div className="bg-void-900 border border-steel-light/30 px-6 py-3 rounded-lg animate-pulse">
              <span className="font-display text-sm text-steel-bright">AI THINKING...</span>
            </div>
          </div>
        )}
        
        {/* Quick stats when unit selected */}
        {selectedUnitData && (
          <div className="absolute top-2 right-2 bg-void-900/90 border border-steel-light/30 rounded px-2 py-1 text-xs font-mono">
            <div className="text-steel-bright">{UNITS[selectedUnitData.type]?.name || selectedUnitData.type}</div>
            <div className="text-green-400">Move: {selectedUnitData.movedThisTurn ? '0' : selectedUnitData.stats?.movement || 2}</div>
            {validAttacks.length > 0 && (
              <div className="text-red-400">Targets: {validAttacks.length}</div>
            )}
          </div>
        )}
      </div>

      {/* ===== BOTTOM CONSOLE - Tabbed Panel ===== */}
      <div className="flex-none bg-void-900 border-t border-steel-light/20">
        {/* Tab buttons */}
        <div className="flex border-b border-steel-light/10">
          <TabButton 
            label="Info" 
            active={activePanel === 'info'} 
            onClick={() => setActivePanel(activePanel === 'info' ? null : 'info')}
            badge={selectedHex ? '•' : null}
          />
          <TabButton 
            label="Build" 
            active={activePanel === 'build'} 
            disabled={!canBuild}
            onClick={() => canBuild && setActivePanel(activePanel === 'build' ? null : 'build')}
            badge={canBuild && isPlayerHex ? '!' : null}
          />
          <TabButton 
            label="Train" 
            active={activePanel === 'train'} 
            disabled={!canTrain}
            onClick={() => canTrain && setActivePanel(activePanel === 'train' ? null : 'train')}
            badge={canTrain && isPlayerHex ? '!' : null}
          />
          {activePanel && (
            <button 
              onClick={() => setActivePanel(null)}
              className="flex-none px-4 py-2.5 text-steel-light/50 active:text-white"
            >
              ✕
            </button>
          )}
        </div>
        
        {/* Panel content */}
        {activePanel && (
          <div 
            className="max-h-48 overflow-y-auto p-3"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {activePanel === 'info' && (
              <InfoPanel 
                hex={selectedHexData} 
                units={unitsOnSelectedHex}
                playerFaction={playerFaction}
              />
            )}
            {activePanel === 'build' && canBuild && (
              <BuildMenu
                hex={selectedHexData}
                resources={resources}
                buildingQueue={buildingQueue}
                onBuild={handleBuild}
              />
            )}
            {activePanel === 'train' && canTrain && (
              <TrainMenu
                hex={selectedHexData}
                resources={resources}
                trainingQueue={trainingQueue}
                faction={playerFaction}
                onTrain={handleTrain}
              />
            )}
          </div>
        )}
        
        {/* Collapsed hint when no panel open */}
        {!activePanel && selectedHex && (
          <div className="px-3 py-2 text-xs text-steel-light/50 text-center">
            Tap a tab above to see details or take action
          </div>
        )}
      </div>

      {/* ===== MODALS ===== */}
      {pendingCombat && (
        <CombatModal
          attacker={pendingCombat.attacker}
          defender={pendingCombat.defender}
          terrain={pendingCombat.terrain}
          hexBuildings={pendingCombat.hexBuildings}
          playerFaction={playerFaction}
          onResolve={handleCombatResolve}
          onCancel={actions.cancelCombat}
        />
      )}
      
      {showDiplomacy && (
        <DiplomacyPanel
          playerFaction={playerFaction}
          relations={relations}
          playerResources={resources}
          onDiplomaticAction={actions.performDiplomaticAction}
          onClose={() => setShowDiplomacy(false)}
        />
      )}
    </div>
  )
}

// ============================================
// SUB-COMPONENTS
// ============================================

function TabButton({ label, active, disabled, badge, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        flex-1 px-3 py-2.5 text-xs font-display uppercase tracking-wider
        relative transition-colors
        ${disabled 
          ? 'text-steel-light/20 cursor-not-allowed' 
          : active 
            ? 'text-continuity bg-continuity/20 border-b-2 border-continuity' 
            : 'text-steel-light/60 active:bg-steel/20'
        }
      `}
    >
      {label}
      {badge && !disabled && (
        <span className={`absolute top-1 right-2 text-xs ${
          badge === '!' ? 'text-green-400 animate-pulse' : 'text-continuity'
        }`}>
          {badge}
        </span>
      )}
    </button>
  )
}

function InfoPanel({ hex, units, playerFaction }) {
  if (!hex) {
    return (
      <div className="text-center text-steel-light/50 py-4">
        <p className="text-sm">No hex selected</p>
        <p className="text-xs mt-1">Tap a hex on the map to see details</p>
      </div>
    )
  }
  
  const owner = hex.owner ? FACTIONS[hex.owner] : null
  const isOwned = hex.owner === playerFaction
  
  return (
    <div className="space-y-3">
      {/* Hex info */}
      <div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-display text-steel-bright capitalize">{hex.terrain}</span>
          {owner && (
            <span className="text-xs px-2 py-0.5 rounded" style={{ 
              backgroundColor: owner.color + '30',
              color: owner.color 
            }}>
              {isOwned ? 'Your Territory' : owner.name}
            </span>
          )}
        </div>
        {hex.resources && (
          <div className="flex gap-3 mt-1 text-xs font-mono">
            {hex.resources.gold > 0 && <span className="text-yellow-400">+{hex.resources.gold} gold</span>}
            {hex.resources.iron > 0 && <span className="text-steel-light">+{hex.resources.iron} iron</span>}
            {hex.resources.grain > 0 && <span className="text-green-400">+{hex.resources.grain} grain</span>}
          </div>
        )}
      </div>
      
      {/* Buildings */}
      {hex.buildings?.length > 0 && (
        <div>
          <div className="text-xs text-steel-light/50 mb-1">Buildings:</div>
          <div className="flex flex-wrap gap-1">
            {hex.buildings.map((b, i) => (
              <span key={i} className="text-xs bg-steel/30 px-2 py-0.5 rounded capitalize">
                {BUILDINGS[b]?.name || b}
              </span>
            ))}
          </div>
        </div>
      )}
      
      {/* Units */}
      {units.length > 0 && (
        <div>
          <div className="text-xs text-steel-light/50 mb-1">Units:</div>
          <div className="space-y-1">
            {units.map(unit => {
              const unitDef = UNITS[unit.type]
              const isPlayer = unit.owner === playerFaction
              return (
                <div 
                  key={unit.id}
                  className={`flex items-center justify-between text-xs p-1.5 rounded ${
                    isPlayer ? 'bg-continuity/20' : 'bg-danger/20'
                  }`}
                >
                  <span className="font-medium">{unitDef?.name || unit.type}</span>
                  <span className="text-steel-light/70">
                    ATK:{unit.stats?.attack || unitDef?.stats.attack} / 
                    DEF:{unit.stats?.defense || unitDef?.stats.defense}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
