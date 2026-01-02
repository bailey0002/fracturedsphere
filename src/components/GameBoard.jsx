// Main game board layout - mobile optimized

import { useMemo, useEffect, useState } from 'react'
import HexMap from './HexMap'
import TurnBar from './TurnBar'
import ResourceBar from './ResourceBar'
import HexInfoPanel from './HexInfoPanel'
import CombatModal from './CombatModal'
import BuildMenu from './BuildMenu'
import TrainMenu from './TrainMenu'
import DiplomacyPanel from './DiplomacyPanel'
import CompanionGuide from './CompanionGuide'
import AudioControl from './AudioControl'
import { useAI } from '../hooks/useAI'
import { FACTIONS } from '../data/factions'
import { hexId } from '../utils/hexMath'
import { getTerritoryCount } from '../data/mapData'

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
  const [mobilePanel, setMobilePanel] = useState(null) // 'info', 'build', 'train'
  
  const factionData = FACTIONS[playerFaction]
  const resources = factionResources[playerFaction]
  
  // AI hook
  const { processAllAI } = useAI(state, dispatch)
  
  // Process AI turns
  useEffect(() => {
    if (phase === 'movement' && !aiThinking) {
      setAiThinking(true)
      processAllAI().then(() => {
        setAiThinking(false)
      })
    }
  }, [phase, turn])
  
  // Auto-show info panel when hex selected on mobile
  useEffect(() => {
    if (selectedHex && window.innerWidth < 768) {
      setMobilePanel('info')
    }
  }, [selectedHex])
  
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
  const totalHexes = Object.keys(mapData).length
  
  // Handle hex click
  const handleHexClick = (q, r) => {
    const key = hexId(q, r)
    const clickedHex = mapData[key]
    
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
    
    // Otherwise select the hex
    actions.selectHex(q, r)
    
    // If there's a player unit on this hex, select it
    const unitOnHex = units.find(u => 
      hexId(u.q, u.r) === key && u.faction === playerFaction
    )
    if (unitOnHex) {
      actions.selectUnit(unitOnHex.id)
    } else {
      actions.selectUnit(null)
    }
  }
  
  // Handle combat resolution
  const handleCombatResolve = (result) => {
    actions.resolveCombat(result)
  }
  
  // Check if selected hex can build/train
  const canBuild = selectedHexData?.owner === playerFaction && phase === 'production'
  const canTrain = selectedHexData?.owner === playerFaction && 
                   selectedHexData?.isCapital && 
                   phase === 'production'
  
  return (
    <div className="h-screen w-screen flex flex-col bg-void-950 overflow-hidden">
      
      {/* Top bar: Resources + Turn controls */}
      <div className="flex-shrink-0 border-b border-steel-light/20 bg-void-900">
        {/* Faction header */}
        <div className="flex items-center justify-between px-2 py-1 sm:px-4 sm:py-2">
          <div className="flex items-center gap-2">
            <span className="text-lg" style={{ color: factionData?.color }}>
              {factionData?.emblem}
            </span>
            <span className="font-display text-sm sm:text-base text-steel-bright tracking-wider">
              {factionData?.name}
            </span>
          </div>
          
          {/* Territory count */}
          <div className="text-xs font-mono text-steel-light">
            <span className="text-steel-light/50">Territory: </span>
            <span style={{ color: factionData?.color }}>{territoryCount}</span>
            <span className="text-steel-light/50">/{totalHexes}</span>
          </div>
          
          {/* Audio control */}
          <AudioControl />
        </div>
        
        {/* Resources row */}
        <div className="px-2 pb-1 sm:px-4 sm:pb-2">
          <ResourceBar resources={resources} factionColor={factionData?.color} />
        </div>
        
        {/* Turn bar - now mobile optimized */}
        <div className="px-2 pb-2 sm:px-4">
          <TurnBar
            turn={turn}
            phase={phase}
            phaseIndex={phaseIndex}
            onAdvancePhase={actions.advancePhase}
            onEndTurn={actions.endTurn}
          />
        </div>
      </div>
      
      {/* Main content area */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        
        {/* Map - takes full width on mobile, flex-1 on desktop */}
        <div className="flex-1 relative">
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
            <div className="absolute inset-0 bg-void-950/50 flex items-center justify-center z-20">
              <div className="panel px-6 py-4 animate-pulse">
                <span className="font-display text-sm text-steel-bright tracking-wider">
                  AI THINKING...
                </span>
              </div>
            </div>
          )}
          
          {/* Companion Guide - positioned bottom left */}
          <CompanionGuide
            phase={phase}
            selectedHex={selectedHexData}
            selectedUnit={selectedUnit}
            validMoves={validMoves}
            validAttacks={validAttacks}
            units={units}
            playerFaction={playerFaction}
          />
        </div>
        
        {/* Desktop sidebar */}
        <div className="hidden md:flex md:flex-col md:w-80 border-l border-steel-light/20 bg-void-900">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <HexInfoPanel
              hex={selectedHexData}
              units={unitsOnSelectedHex}
              playerFaction={playerFaction}
            />
            
            {canBuild && (
              <BuildMenu
                hex={selectedHexData}
                resources={resources}
                buildingQueue={buildingQueue}
                onBuild={actions.startBuilding}
              />
            )}
            
            {canTrain && (
              <TrainMenu
                hex={selectedHexData}
                resources={resources}
                trainingQueue={trainingQueue}
                faction={playerFaction}
                onTrain={actions.startTraining}
              />
            )}
          </div>
          
          {/* Desktop diplomacy button */}
          {phase === 'diplomacy' && (
            <div className="p-4 border-t border-steel-light/20">
              <button
                onClick={() => setShowDiplomacy(true)}
                className="btn-primary w-full"
              >
                Open Diplomacy
              </button>
            </div>
          )}
        </div>
        
        {/* Mobile bottom tabs */}
        <div className="md:hidden absolute bottom-0 left-0 right-0 bg-void-900 border-t border-steel-light/20">
          {/* Tab bar */}
          <div className="flex border-b border-steel-light/10">
            <MobileTab 
              label="Info" 
              active={mobilePanel === 'info'} 
              onClick={() => setMobilePanel(mobilePanel === 'info' ? null : 'info')}
            />
            <MobileTab 
              label="Build" 
              active={mobilePanel === 'build'} 
              disabled={!canBuild}
              onClick={() => canBuild && setMobilePanel(mobilePanel === 'build' ? null : 'build')}
            />
            <MobileTab 
              label="Train" 
              active={mobilePanel === 'train'} 
              disabled={!canTrain}
              onClick={() => canTrain && setMobilePanel(mobilePanel === 'train' ? null : 'train')}
            />
            {phase === 'diplomacy' && (
              <MobileTab 
                label="Diplomacy" 
                active={false} 
                onClick={() => setShowDiplomacy(true)}
              />
            )}
          </div>
          
          {/* Expandable panel content */}
          {mobilePanel && (
            <div className="max-h-48 overflow-y-auto p-3">
              {mobilePanel === 'info' && (
                <HexInfoPanel
                  hex={selectedHexData}
                  units={unitsOnSelectedHex}
                  playerFaction={playerFaction}
                  compact
                />
              )}
              {mobilePanel === 'build' && (
                <BuildMenu
                  hex={selectedHexData}
                  resources={resources}
                  buildingQueue={buildingQueue}
                  onBuild={actions.startBuilding}
                  compact
                />
              )}
              {mobilePanel === 'train' && (
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
      </div>
      
      {/* Combat Modal */}
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
      
      {/* Diplomacy Panel */}
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
      
      {/* Version */}
      <div className="absolute bottom-16 md:bottom-2 right-2 text-xs font-mono text-steel-light/20 pointer-events-none">
        v0.3.2
      </div>
    </div>
  )
}

// Mobile tab button component
function MobileTab({ label, active, disabled, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        flex-1 px-2 py-2 text-xs font-display uppercase tracking-wider
        transition-colors
        ${disabled 
          ? 'text-steel-light/20 cursor-not-allowed'
          : active 
            ? 'text-continuity bg-continuity/20 border-b-2 border-continuity' 
            : 'text-steel-light/60 hover:text-steel-light active:bg-steel/10'
        }
      `}
    >
      {label}
    </button>
  )
}
