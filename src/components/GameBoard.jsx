// Main game board layout with Combat and AI integration

import { useMemo, useEffect, useState } from 'react'
import HexMap from './HexMap'
import TurnBar from './TurnBar'
import ResourceBar from './ResourceBar'
import HexInfoPanel from './HexInfoPanel'
import CombatModal from './CombatModal'
import BuildMenu from './BuildMenu'
import TrainMenu from './TrainMenu'
import DiplomacyPanel from './DiplomacyPanel'
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
  const [mobilePanel, setMobilePanel] = useState(null) // 'info', 'build', 'train', or null
  
  const factionData = FACTIONS[playerFaction]
  const resources = factionResources[playerFaction]
  
  // AI hook
  const { processAllAI } = useAI(state, dispatch)
  
  // Process AI turns during movement phase
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
    if (selectedHex) {
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
    if (!selectedHexData) return []
    return units.filter(u => 
      u.q === selectedHexData.q && u.r === selectedHexData.r
    )
  }, [selectedHexData, units])
  
  // Calculate territory stats
  const territoryCount = useMemo(() => 
    getTerritoryCount(mapData, playerFaction),
    [mapData, playerFaction]
  )
  
  const totalHexes = Object.keys(mapData).length
  
  const isOwnedHex = selectedHexData?.owner === playerFaction
  
  // Handle hex clicks
  const handleHexClick = (q, r) => {
    const attackTarget = validAttacks.find(a => a.q === q && a.r === r)
    if (attackTarget && selectedUnit) {
      actions.initiateAttack(selectedUnit, attackTarget.targetId)
      return
    }
    
    const moveTarget = validMoves.find(m => m.q === q && m.r === r)
    if (moveTarget && selectedUnit) {
      actions.moveUnit(q, r)
      return
    }
    
    actions.selectHex(q, r)
  }
  
  const handleCombatResolve = (result) => {
    actions.resolveCombat(result)
  }
  
  const closeMobilePanel = () => {
    setMobilePanel(null)
    actions.clearSelection()
  }
  
  return (
    <div className="fixed inset-0 flex flex-col bg-void-950">
      {/* Top bar */}
      <div className="flex-none p-2 sm:p-4 space-y-2 border-b border-steel-light/10">
        {/* Row 1: Faction, Territory */}
        <div className="flex items-center justify-between gap-2">
          <div 
            className="flex items-center gap-2 px-2 py-1 rounded border"
            style={{ borderColor: factionData?.color, color: factionData?.color }}
          >
            <span className="text-lg">{factionData?.emblem}</span>
            <span className="font-display text-xs tracking-wider">
              {factionData?.name}
            </span>
          </div>
          
          <div className="text-xs font-mono text-steel-light">
            <span className="text-steel-light/50">Territory: </span>
            <span style={{ color: factionData?.color }}>{territoryCount}</span>
            <span className="text-steel-light/50">/{totalHexes}</span>
          </div>
        </div>
        
        {/* Row 2: Resources */}
        <ResourceBar resources={resources} factionColor={factionData?.color} />
        
        {/* Row 3: Turn/Phase */}
        <TurnBar
          turn={turn}
          phase={phase}
          phaseIndex={phaseIndex}
          onAdvancePhase={actions.advancePhase}
          onEndTurn={actions.endTurn}
        />
      </div>
      
      {/* Main content area */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0">
        {/* Map container - scrollable */}
        <div className="flex-1 overflow-auto relative" style={{ WebkitOverflowScrolling: 'touch' }}>
          <HexMap
            mapData={mapData}
            units={units}
            selectedHex={selectedHex}
            validMoves={validMoves}
            validAttacks={validAttacks}
            playerFaction={playerFaction}
            onHexClick={handleHexClick}
          />
          
          {/* Phase hint - top left */}
          <div className="absolute top-2 left-2 panel text-xs p-2 max-w-[180px]">
            <PhaseInstructions phase={phase} onOpenDiplomacy={() => setShowDiplomacy(true)} />
          </div>
          
          {/* AI Thinking overlay */}
          {aiThinking && (
            <div className="absolute inset-0 bg-void-950/70 flex items-center justify-center">
              <div className="panel px-6 py-3 animate-pulse">
                <span className="font-display text-steel-bright tracking-wider">
                  AI THINKING...
                </span>
              </div>
            </div>
          )}
        </div>
        
        {/* Desktop side panel */}
        <div className="hidden md:block flex-none w-80 p-4 space-y-4 overflow-y-auto border-l border-steel-light/10">
          <HexInfoPanel
            hex={selectedHexData}
            units={unitsOnSelectedHex}
            onClose={actions.clearSelection}
          />
          
          {phase === 'production' && isOwnedHex && (
            <>
              <BuildMenu
                hex={selectedHexData}
                playerResources={resources}
                buildingQueue={buildingQueue || []}
                onBuild={(buildingType) => {
                  actions.startBuilding(selectedHex, buildingType, playerFaction)
                }}
                onClose={actions.clearSelection}
              />
              <TrainMenu
                hex={selectedHexData}
                playerResources={resources}
                trainingQueue={trainingQueue || []}
                onTrain={(unitType) => {
                  actions.startTraining(selectedHex, unitType, playerFaction)
                }}
                onClose={actions.clearSelection}
              />
            </>
          )}
        </div>
      </div>
      
      {/* Mobile bottom tabs - only show when hex selected */}
      {selectedHexData && (
        <div className="md:hidden flex-none border-t border-steel-light/20 bg-void-950">
          {/* Tab buttons */}
          <div className="flex border-b border-steel-light/10">
            <MobileTab 
              label="Info" 
              active={mobilePanel === 'info'} 
              onClick={() => setMobilePanel(mobilePanel === 'info' ? null : 'info')} 
            />
            {phase === 'production' && isOwnedHex && (
              <>
                <MobileTab 
                  label="Build" 
                  active={mobilePanel === 'build'} 
                  onClick={() => setMobilePanel(mobilePanel === 'build' ? null : 'build')} 
                />
                <MobileTab 
                  label="Train" 
                  active={mobilePanel === 'train'} 
                  onClick={() => setMobilePanel(mobilePanel === 'train' ? null : 'train')} 
                />
              </>
            )}
            <button 
              onClick={closeMobilePanel}
              className="flex-none px-4 py-2 text-steel-light/50 hover:text-steel-light"
            >
              ✕
            </button>
          </div>
          
          {/* Tab content */}
          {mobilePanel && (
            <div className="max-h-[40vh] overflow-y-auto p-3" style={{ WebkitOverflowScrolling: 'touch' }}>
              {mobilePanel === 'info' && (
                <HexInfoPanel
                  hex={selectedHexData}
                  units={unitsOnSelectedHex}
                  onClose={closeMobilePanel}
                />
              )}
              {mobilePanel === 'build' && phase === 'production' && isOwnedHex && (
                <BuildMenu
                  hex={selectedHexData}
                  playerResources={resources}
                  buildingQueue={buildingQueue || []}
                  onBuild={(buildingType) => {
                    actions.startBuilding(selectedHex, buildingType, playerFaction)
                  }}
                  onClose={closeMobilePanel}
                />
              )}
              {mobilePanel === 'train' && phase === 'production' && isOwnedHex && (
                <TrainMenu
                  hex={selectedHexData}
                  playerResources={resources}
                  trainingQueue={trainingQueue || []}
                  onTrain={(unitType) => {
                    actions.startTraining(selectedHex, unitType, playerFaction)
                  }}
                  onClose={closeMobilePanel}
                />
              )}
            </div>
          )}
        </div>
      )}
      
      {/* Action hints */}
      {selectedUnit && validMoves.length > 0 && !mobilePanel && (
        <ActionHint message="Tap highlighted hex to move" type="move" />
      )}
      {selectedUnit && validAttacks.length > 0 && !mobilePanel && (
        <ActionHint message="Red = enemy. Tap to attack" type="attack" />
      )}
      
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
      <div className="absolute bottom-2 right-2 text-xs font-mono text-steel-light/30 pointer-events-none">
        v0.3.1
      </div>
    </div>
  )
}

// Mobile tab button
function MobileTab({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`
        flex-1 px-3 py-2 text-xs font-display uppercase tracking-wider
        transition-colors
        ${active 
          ? 'text-steel-bright bg-steel/30 border-b-2 border-continuity' 
          : 'text-steel-light/60 hover:text-steel-light'
        }
      `}
    >
      {label}
    </button>
  )
}

// Phase instructions
function PhaseInstructions({ phase, onOpenDiplomacy }) {
  const info = {
    production: { icon: '⚙', title: 'Production', text: 'Tap your hex to build' },
    diplomacy: { icon: '🤝', title: 'Diplomacy', text: 'Manage relations' },
    movement: { icon: '→', title: 'Movement', text: 'Move & attack' },
    combat: { icon: '⚔', title: 'Combat', text: 'Resolve battles' },
  }[phase] || { icon: '?', title: phase, text: '' }
  
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <span>{info.icon}</span>
        <span className="font-display uppercase text-steel-light">{info.title}</span>
      </div>
      <p className="text-steel-light/60">{info.text}</p>
      {phase === 'diplomacy' && (
        <button onClick={onOpenDiplomacy} className="mt-2 btn-primary text-xs py-1 px-2">
          Open
        </button>
      )}
    </div>
  )
}

// Action hint
function ActionHint({ message, type }) {
  return (
    <div className={`
      fixed bottom-20 left-1/2 -translate-x-1/2 z-30
      px-3 py-2 rounded border text-xs text-steel-bright
      ${type === 'move' ? 'border-success/50 bg-success/10' : 'border-danger/50 bg-danger/10'}
    `}>
      {message}
    </div>
  )
}
