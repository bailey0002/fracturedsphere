// Main game board - mobile-first vertical layout

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

// Phase display info
const PHASE_INFO = {
  production: { icon: '⚙', name: 'Production', hint: 'Tap your hex to build' },
  diplomacy: { icon: '🤝', name: 'Diplomacy', hint: 'Manage relations' },
  movement: { icon: '→', name: 'Movement', hint: 'Tap unit, then destination' },
  combat: { icon: '⚔', name: 'Combat', hint: 'Battles resolve' },
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
  const [expandedPanel, setExpandedPanel] = useState(null) // 'info', 'build', 'train'
  
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
  
  // Handle hex click
  const handleHexClick = (q, r) => {
    const key = hexId(q, r)
    
    // If we have a selected unit and clicked a valid move
    if (selectedUnit && validMoves.some(m => hexId(m.q, m.r) === key)) {
      actions.moveUnit(selectedUnit.id, q, r)
      return
    }
    
    // If we clicked a valid attack target
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
    
    // Auto-expand info panel on mobile when hex selected
    setExpandedPanel('info')
  }
  
  // Combat resolution
  const handleCombatResolve = (result) => {
    actions.resolveCombat(result)
  }
  
  // Check abilities
  const canBuild = selectedHexData?.owner === playerFaction && phase === 'production'
  const canTrain = selectedHexData?.owner === playerFaction && 
                   selectedHexData?.isCapital && 
                   phase === 'production'
  
  return (
    <div className="min-h-screen bg-void-950 flex flex-col">
      
      {/* === TOP BAR: Faction + Resources === */}
      <header className="flex-shrink-0 bg-void-900 border-b border-steel-light/20 p-2">
        {/* Faction name and territory */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-lg" style={{ color: factionData?.color }}>
              {factionData?.emblem}
            </span>
            <span className="font-display text-sm text-steel-bright">
              {factionData?.name}
            </span>
          </div>
          <div className="text-xs font-mono text-steel-light">
            T{turn} • {territoryCount}/{Object.keys(mapData).length} hexes
          </div>
        </div>
        
        {/* Resources row */}
        <div className="flex items-center gap-4 text-xs">
          <span className="text-yellow-400">◈ {Math.floor(resources?.gold || 0)}</span>
          <span className="text-slate-400">⬡ {Math.floor(resources?.iron || 0)}</span>
          <span className="text-green-400">❋ {Math.floor(resources?.grain || 0)}</span>
          <span className="text-purple-400">✧ {Math.floor(resources?.influence || 0)}</span>
        </div>
      </header>
      
      {/* === PHASE BAR: Current phase + controls === */}
      <div className="flex-shrink-0 bg-void-900/50 border-b border-steel-light/10 px-2 py-2">
        <div className="flex items-center justify-between">
          {/* Current phase indicator */}
          <div className="flex items-center gap-2 px-3 py-1 bg-continuity/20 rounded border border-continuity/40">
            <span className="text-lg">{phaseInfo.icon}</span>
            <div>
              <div className="font-display text-xs text-continuity tracking-wider uppercase">
                {phaseInfo.name}
              </div>
              <div className="text-[10px] text-steel-light/60">
                {phaseInfo.hint}
              </div>
            </div>
            <span className="text-[10px] text-steel-light/40 ml-2">
              {phaseIndex + 1}/4
            </span>
          </div>
          
          {/* Phase controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={actions.advancePhase}
              className="px-3 py-1.5 text-xs font-display uppercase tracking-wider
                         bg-continuity/20 text-continuity border border-continuity/40 rounded
                         active:bg-continuity/40"
            >
              Next
            </button>
            <button
              onClick={actions.endTurn}
              className="px-3 py-1.5 text-xs font-display uppercase tracking-wider
                         bg-warning/20 text-warning border border-warning/40 rounded
                         active:bg-warning/40"
            >
              End Turn
            </button>
          </div>
        </div>
        
        {/* Diplomacy button during diplomacy phase */}
        {phase === 'diplomacy' && (
          <button
            onClick={() => setShowDiplomacy(true)}
            className="mt-2 w-full px-3 py-2 text-xs font-display uppercase tracking-wider
                       bg-steel/20 text-steel-bright border border-steel-light/30 rounded
                       active:bg-steel/40"
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
        
        {/* AI Thinking overlay */}
        {aiThinking && (
          <div className="absolute inset-0 bg-void-950/70 flex items-center justify-center">
            <div className="bg-void-900 border border-steel-light/30 px-6 py-3 rounded-lg">
              <span className="font-display text-sm text-steel-bright animate-pulse">
                AI THINKING...
              </span>
            </div>
          </div>
        )}
      </div>
      
      {/* === BOTTOM PANEL: Expandable tabs === */}
      <div className="flex-shrink-0 bg-void-900 border-t border-steel-light/20">
        {/* Tab buttons */}
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
            onClick={() => canBuild && setExpandedPanel(expandedPanel === 'build' ? null : 'build')}
          />
          <TabButton 
            label="Train" 
            active={expandedPanel === 'train'} 
            disabled={!canTrain}
            onClick={() => canTrain && setExpandedPanel(expandedPanel === 'train' ? null : 'train')}
          />
        </div>
        
        {/* Panel content */}
        {expandedPanel && (
          <div className="max-h-40 overflow-y-auto p-3">
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

// Tab button component
function TabButton({ label, active, disabled, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        flex-1 px-3 py-2.5 text-xs font-display uppercase tracking-wider
        transition-colors
        ${disabled 
          ? 'text-steel-light/20 cursor-not-allowed'
          : active 
            ? 'text-continuity bg-continuity/20 border-b-2 border-continuity' 
            : 'text-steel-light/60 active:bg-steel/20'
        }
      `}
    >
      {label}
    </button>
  )
}
