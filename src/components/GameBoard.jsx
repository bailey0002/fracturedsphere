// Main game board - mobile-first with clear action prompts

import { useMemo, useEffect, useState } from 'react'
import HexMap from './HexMap'
import HexInfoPanel from './HexInfoPanel'
import CombatModal from './CombatModal'
import BuildMenu from './BuildMenu'
import TrainMenu from './TrainMenu'
import DiplomacyPanel from './DiplomacyPanel'
import { useAI } from '../hooks/useAI'
import { FACTIONS } from '../data/factions'
import { hexId } from '../utils/hexMath'
import { getTerritoryCount } from '../data/mapData'
import { PHASES, PHASE_ORDER } from '../hooks/useGameState'

// Phase info
const PHASE_INFO = {
  production: { icon: '⚙', name: 'Production' },
  diplomacy: { icon: '🤝', name: 'Diplomacy' },
  movement: { icon: '→', name: 'Movement' },
  combat: { icon: '⚔', name: 'Combat' },
}

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
    buildingQueue,
    trainingQueue,
    relations,
  } = state
  
  const [aiThinking, setAiThinking] = useState(false)
  const [showDiplomacy, setShowDiplomacy] = useState(false)
  const [expandedPanel, setExpandedPanel] = useState(null)
  
  const factionData = FACTIONS[playerFaction]
  const resources = factionResources[playerFaction]
  const phaseInfo = PHASE_INFO[phase] || PHASE_INFO.production
  
  // AI hook
  const { processAllAI } = useAI(state, dispatch)
  
  // Process AI turns
  useEffect(() => {
    if (phase === 'movement' && !aiThinking) {
      setAiThinking(true)
      processAllAI().then(() => setAiThinking(false))
    }
  }, [phase, turn])
  
  // Get selected hex data
  const selectedHexData = useMemo(() => {
    if (!selectedHex) return null
    return mapData[selectedHex] || null
  }, [selectedHex, mapData])
  
  // Get units on selected hex
  const unitsOnSelectedHex = useMemo(() => {
    if (!selectedHex) return []
    return units.filter(u => hexId(u.q, u.r) === selectedHex)
  }, [selectedHex, units])
  
  // Territory count
  const territoryCount = useMemo(() => 
    getTerritoryCount(mapData, playerFaction),
    [mapData, playerFaction]
  )
  
  // Get player's unmoved units
  const unmovedUnits = useMemo(() => {
    return units.filter(u => u.faction === playerFaction && !u.hasMoved)
  }, [units, playerFaction])
  
  // Determine current action hint based on game state
  const actionHint = useMemo(() => {
    if (phase === 'production') {
      if (selectedHexData?.owner === playerFaction) {
        if (selectedHexData.isCapital) {
          return { text: 'Build structures or Train units', color: 'text-green-400' }
        }
        return { text: 'Build structures here', color: 'text-green-400' }
      }
      return { text: 'Tap your territory to build', color: 'text-steel-light/60' }
    }
    
    if (phase === 'diplomacy') {
      return { text: 'Open Diplomacy to manage relations', color: 'text-blue-400' }
    }
    
    if (phase === 'movement') {
      if (validAttacks.length > 0) {
        return { text: `⚔️ ${validAttacks.length} attack target${validAttacks.length > 1 ? 's' : ''} - tap red hex!`, color: 'text-red-400' }
      }
      if (validMoves.length > 0) {
        return { text: `${validMoves.length} moves available - tap green hex`, color: 'text-green-400' }
      }
      if (selectedUnit) {
        return { text: 'No moves available for this unit', color: 'text-yellow-400' }
      }
      if (unmovedUnits.length > 0) {
        return { text: `${unmovedUnits.length} unit${unmovedUnits.length > 1 ? 's' : ''} ready - tap to select`, color: 'text-steel-light' }
      }
      return { text: 'All units moved - Next or End Turn', color: 'text-steel-light/60' }
    }
    
    if (phase === 'combat') {
      return { text: 'Resolving combat...', color: 'text-orange-400' }
    }
    
    return { text: '', color: '' }
  }, [phase, selectedHexData, selectedUnit, validMoves, validAttacks, unmovedUnits, playerFaction])
  
  // Handle hex click
  const handleHexClick = (q, r) => {
    const key = hexId(q, r)
    
    // If clicked a valid move target
    if (selectedUnit && validMoves.some(m => hexId(m.q, m.r) === key)) {
      actions.moveUnit(selectedUnit.id, q, r)
      return
    }
    
    // If clicked a valid attack target
    if (selectedUnit && validAttacks.some(a => hexId(a.q, a.r) === key)) {
      actions.initiateAttack(selectedUnit.id, q, r)
      return
    }
    
    // Select the hex
    actions.selectHex(q, r)
    
    // If there's a player unit, select it
    const unitOnHex = units.find(u => 
      hexId(u.q, u.r) === key && u.faction === playerFaction
    )
    if (unitOnHex) {
      actions.selectUnit(unitOnHex.id)
    } else {
      actions.selectUnit(null)
    }
    
    // Auto-expand info panel
    setExpandedPanel('info')
  }
  
  // Combat resolution
  const handleCombatResolve = (result) => {
    actions.resolveCombat(result)
  }
  
  // Abilities check
  const canBuild = selectedHexData?.owner === playerFaction && phase === 'production'
  const canTrain = selectedHexData?.owner === playerFaction && 
                   selectedHexData?.isCapital && 
                   phase === 'production'
  
  return (
    <div className="min-h-screen bg-void-950 flex flex-col">
      
      {/* === TOP BAR === */}
      <header className="flex-shrink-0 bg-void-900 border-b border-steel-light/20 p-2">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span style={{ color: factionData?.color }}>{factionData?.emblem}</span>
            <span className="font-display text-sm text-steel-bright">{factionData?.name}</span>
          </div>
          <div className="text-xs font-mono text-steel-light">
            Turn {turn} • {territoryCount}/{Object.keys(mapData).length}
          </div>
        </div>
        
        {/* Resources */}
        <div className="flex items-center gap-3 text-xs">
          <span className="text-yellow-400">◈{Math.floor(resources?.gold || 0)}</span>
          <span className="text-slate-400">⬡{Math.floor(resources?.iron || 0)}</span>
          <span className="text-green-400">❋{Math.floor(resources?.grain || 0)}</span>
          <span className="text-purple-400">✧{Math.floor(resources?.influence || 0)}</span>
        </div>
      </header>
      
      {/* === PHASE + ACTION BAR === */}
      <div className="flex-shrink-0 bg-void-900/80 border-b border-steel-light/10 px-2 py-2">
        <div className="flex items-center justify-between gap-2">
          {/* Phase indicator */}
          <div className="flex items-center gap-2 px-2 py-1 bg-continuity/20 rounded border border-continuity/40">
            <span className="text-base">{phaseInfo.icon}</span>
            <span className="font-display text-xs text-continuity uppercase">{phaseInfo.name}</span>
            <span className="text-[10px] text-steel-light/40">{phaseIndex + 1}/4</span>
          </div>
          
          {/* Controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={actions.advancePhase}
              className="px-3 py-1.5 text-xs font-display uppercase
                         bg-continuity/20 text-continuity border border-continuity/40 rounded
                         active:bg-continuity/40"
            >
              Next
            </button>
            <button
              onClick={actions.endTurn}
              className="px-3 py-1.5 text-xs font-display uppercase
                         bg-warning/20 text-warning border border-warning/40 rounded
                         active:bg-warning/40"
            >
              End Turn
            </button>
          </div>
        </div>
        
        {/* Action hint - always visible */}
        <div className={`mt-2 text-xs ${actionHint.color} font-mono`}>
          → {actionHint.text}
        </div>
        
        {/* Diplomacy button */}
        {phase === 'diplomacy' && (
          <button
            onClick={() => setShowDiplomacy(true)}
            className="mt-2 w-full px-3 py-2 text-xs font-display uppercase
                       bg-blue-900/30 text-blue-400 border border-blue-500/30 rounded
                       active:bg-blue-900/50"
          >
            🤝 Open Diplomacy Panel
          </button>
        )}
      </div>
      
      {/* === MAP AREA === */}
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
        
        {/* AI overlay */}
        {aiThinking && (
          <div className="absolute inset-0 bg-void-950/70 flex items-center justify-center">
            <div className="bg-void-900 border border-steel-light/30 px-6 py-3 rounded-lg">
              <span className="font-display text-sm text-steel-bright animate-pulse">
                AI THINKING...
              </span>
            </div>
          </div>
        )}
        
        {/* Quick action buttons when unit selected with valid moves/attacks */}
        {selectedUnit && (validMoves.length > 0 || validAttacks.length > 0) && (
          <div className="absolute top-2 right-2 flex flex-col gap-2">
            {validMoves.length > 0 && (
              <div className="bg-green-900/80 text-green-400 px-3 py-1.5 rounded text-xs font-mono border border-green-500/30">
                {validMoves.length} move{validMoves.length > 1 ? 's' : ''}
              </div>
            )}
            {validAttacks.length > 0 && (
              <div className="bg-red-900/80 text-red-400 px-3 py-1.5 rounded text-xs font-mono border border-red-500/30">
                {validAttacks.length} attack{validAttacks.length > 1 ? 's' : ''}
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* === BOTTOM PANEL === */}
      <div className="flex-shrink-0 bg-void-900 border-t border-steel-light/20">
        {/* Tabs */}
        <div className="flex border-b border-steel-light/10">
          <TabButton 
            label="Info" 
            active={expandedPanel === 'info'} 
            onClick={() => setExpandedPanel(expandedPanel === 'info' ? null : 'info')}
          />
          <TabButton 
            label="Build" 
            active={expandedPanel === 'build'} 
            disabled={!canBuild}
            badge={canBuild ? '!' : null}
            onClick={() => canBuild && setExpandedPanel(expandedPanel === 'build' ? null : 'build')}
          />
          <TabButton 
            label="Train" 
            active={expandedPanel === 'train'} 
            disabled={!canTrain}
            badge={canTrain ? '!' : null}
            onClick={() => canTrain && setExpandedPanel(expandedPanel === 'train' ? null : 'train')}
          />
        </div>
        
        {/* Panel content */}
        {expandedPanel && (
          <div className="max-h-44 overflow-y-auto p-3">
            {expandedPanel === 'info' && (
              <HexInfoPanel
                hex={selectedHexData}
                units={unitsOnSelectedHex}
                playerFaction={playerFaction}
                compact
              />
            )}
            {expandedPanel === 'build' && canBuild && (
              <BuildMenu
                hex={selectedHexData}
                resources={resources}
                buildingQueue={buildingQueue}
                onBuild={actions.startBuilding}
                compact
              />
            )}
            {expandedPanel === 'train' && canTrain && (
              <TrainMenu
                hex={selectedHexData}
                resources={resources}
                trainingQueue={trainingQueue}
                faction={playerFaction}
                onTrain={actions.startTraining}
                compact
              />
            )}
          </div>
        )}
      </div>
      
      {/* === MODALS === */}
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
          lastDiplomaticResult={state.lastDiplomaticResult}
          onDiplomaticAction={actions.performDiplomaticAction}
          onClose={() => setShowDiplomacy(false)}
        />
      )}
    </div>
  )
}

// Tab button
function TabButton({ label, active, disabled, badge, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        flex-1 px-3 py-2.5 text-xs font-display uppercase tracking-wider
        relative
        ${disabled 
          ? 'text-steel-light/20'
          : active 
            ? 'text-continuity bg-continuity/20 border-b-2 border-continuity' 
            : 'text-steel-light/60 active:bg-steel/20'
        }
      `}
    >
      {label}
      {badge && !disabled && (
        <span className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
      )}
    </button>
  )
}
