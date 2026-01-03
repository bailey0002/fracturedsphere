// GameBoard - Mobile-first main game layout for The Fractured Sphere
// Integrates all components with iOS-compatible touch handling

import { useCallback, useEffect, useState } from 'react'
import HexMap from './HexMap'
import Chronicle from './Chronicle'
import PhasePrompt, { PhaseBar } from './PhasePrompt'
import HexInfoPanel from './HexInfoPanel'
import ResourceBar from './ResourceBar'
import BuildMenu from './BuildMenu'
import TrainMenu from './TrainMenu'
import CombatModal from './CombatModal'
import { PHASES } from '../hooks/useGameState'
import { CHRONICLE_TYPES } from '../hooks/useChronicle'
import { FACTIONS } from '../data/factions'
import { BUILDINGS } from '../data/terrain'
import { UNITS } from '../data/units'

export default function GameBoard({
  // Game state
  state,
  // Actions
  actions,
  // Computed values
  computed,
  // Chronicle
  chronicle,
}) {
  const {
    gameStarted,
    gameOver,
    victory,
    turn,
    phase,
    phaseIndex,
    mapData,
    units,
    selectedHex,
    selectedUnit,
    validMoves,
    validAttacks,
    pendingCombat,
    aiThinking,
    playerFaction,
    currentFaction,
    buildingQueue,
    trainingQueue,
  } = state
  
  const {
    selectHex,
    clearSelection,
    advancePhase,
    endTurn,
    queueBuilding,
    queueUnit,
    resolveCombat,
    cancelCombat,
  } = actions
  
  // Menu state
  const [showBuildMenu, setShowBuildMenu] = useState(false)
  const [showTrainMenu, setShowTrainMenu] = useState(false)
  
  const {
    isPlayerTurn,
    currentFactionData,
    playerResources,
    selectedHexData,
    selectedUnitData,
  } = computed
  
  const {
    entries,
    addEntry,
    voiceEnabled,
    voiceReady,
    toggleVoice,
  } = chronicle
  
  // Log turn/phase changes to chronicle
  useEffect(() => {
    if (!gameStarted || !currentFaction) return
    
    // Log turn start (only for player turn at command phase)
    if (isPlayerTurn && phase === PHASES.COMMAND && phaseIndex === 0) {
      addEntry(CHRONICLE_TYPES.TURN_START, { 
        turn, 
        faction: playerFaction 
      }, { important: true, speak: true })
    }
    
    // Log phase changes
    if (isPlayerTurn) {
      addEntry(CHRONICLE_TYPES.PHASE_CHANGE, { 
        phase,
        faction: playerFaction,
      })
    }
  }, [turn, phase, isPlayerTurn, gameStarted])
  
  // Handle hex tap
  const handleHexTap = useCallback((q, r) => {
    if (!isPlayerTurn || aiThinking) return
    selectHex(q, r)
  }, [isPlayerTurn, aiThinking, selectHex])
  
  // Handle phase advance
  const handleAdvancePhase = useCallback(() => {
    if (!isPlayerTurn || aiThinking) return
    advancePhase()
  }, [isPlayerTurn, aiThinking, advancePhase])
  
  // Handle end turn
  const handleEndTurn = useCallback(() => {
    if (!isPlayerTurn || aiThinking) return
    
    // Log income
    if (playerResources?.lastIncome) {
      const income = playerResources.lastIncome
      if (income.gold > 0 || income.iron > 0 || income.grain > 0) {
        addEntry(CHRONICLE_TYPES.INCOME, {
          gold: income.gold,
          iron: income.iron,
          grain: income.grain,
          faction: playerFaction,
        })
      }
    }
    
    endTurn()
  }, [isPlayerTurn, aiThinking, endTurn, playerResources, addEntry, playerFaction])
  
  // Handle opening build menu
  const handleOpenBuildMenu = useCallback(() => {
    if (!isPlayerTurn || aiThinking || phase !== PHASES.COMMAND) return
    if (!selectedHexData || selectedHexData.owner !== playerFaction) return
    setShowBuildMenu(true)
  }, [isPlayerTurn, aiThinking, phase, selectedHexData, playerFaction])
  
  // Handle opening train menu
  const handleOpenTrainMenu = useCallback(() => {
    if (!isPlayerTurn || aiThinking || phase !== PHASES.COMMAND) return
    if (!selectedHexData || selectedHexData.owner !== playerFaction) return
    setShowTrainMenu(true)
  }, [isPlayerTurn, aiThinking, phase, selectedHexData, playerFaction])
  
  // Handle building construction
  const handleBuild = useCallback((buildingId, q, r, factionId) => {
    queueBuilding(buildingId, q, r, factionId)
    
    const building = BUILDINGS[buildingId]
    if (building) {
      addEntry(CHRONICLE_TYPES.SYSTEM, {
        message: `Construction begun: ${building.name} (${building.buildTime} turns)`,
        faction: factionId,
      })
    }
  }, [queueBuilding, addEntry])
  
  // Handle unit training
  const handleTrain = useCallback((unitType, q, r, factionId) => {
    queueUnit(unitType, q, r, factionId)
    
    const unit = UNITS[unitType]
    if (unit) {
      addEntry(CHRONICLE_TYPES.SYSTEM, {
        message: `Training begun: ${unit.name} (${unit.trainTime} turns)`,
        faction: factionId,
      })
    }
  }, [queueUnit, addEntry])
  
  // Handle combat resolution
  const handleCombatResolve = useCallback((result) => {
    // Apply combat result to game state
    resolveCombat(result)
    
    // Log to chronicle
    const attackerUnit = UNITS[result.attacker.unit?.type]
    const defenderUnit = UNITS[result.defender.unit?.type]
    
    addEntry(CHRONICLE_TYPES.COMBAT_RESULT, {
      attacker: attackerUnit?.name || 'Unknown',
      defender: defenderUnit?.name || 'Unknown',
      attackerDestroyed: result.attacker.destroyed,
      defenderDestroyed: result.defender.destroyed,
      hexCaptured: result.hexCaptured,
      faction: playerFaction,
    }, { important: true, speak: true })
    
    // Log capture if it happened
    if (result.hexCaptured) {
      addEntry(CHRONICLE_TYPES.CAPTURE, {
        hex: result.hex,
        faction: playerFaction,
      })
    }
  }, [resolveCombat, addEntry, playerFaction])
  
  // Handle combat cancel
  const handleCombatCancel = useCallback(() => {
    cancelCombat()
  }, [cancelCombat])
  
  // Victory screen
  if (gameOver && victory) {
    const winnerFaction = FACTIONS[victory.faction]
    const isPlayerWin = victory.faction === playerFaction
    
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-void-950/95 z-50">
        <div className="text-center p-8 max-w-md">
          <div 
            className="text-6xl mb-4"
            style={{ color: winnerFaction?.color }}
          >
            {isPlayerWin ? '🏆' : '💀'}
          </div>
          <h1 
            className="text-3xl font-display mb-2"
            style={{ color: winnerFaction?.color }}
          >
            {isPlayerWin ? 'VICTORY!' : 'DEFEAT'}
          </h1>
          <p className="text-steel-light text-lg mb-4">
            {winnerFaction?.name} achieves {victory.type} victory!
          </p>
          <p className="text-steel-light/60 text-sm mb-8">
            The Sphere is united after {turn} cycles.
          </p>
          <button
            onPointerUp={() => window.location.reload()}
            className="px-6 py-3 bg-amber-500/20 hover:bg-amber-500/30
                       text-amber-400 border border-amber-500/30 rounded
                       font-display tracking-wider uppercase"
            style={{ touchAction: 'manipulation' }}
          >
            New Game
          </button>
        </div>
      </div>
    )
  }
  
  const factionData = playerFaction ? FACTIONS[playerFaction] : null
  
  return (
    <div 
      className="game-board flex flex-col bg-void-950"
      style={{ 
        height: '100dvh',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
    >
      {/* Header: Faction + Resources */}
      <header className="flex-shrink-0 border-b border-steel-light/20 bg-void-900/80">
        <div className="flex items-center justify-between px-3 py-2">
          {/* Faction emblem + name */}
          <div className="flex items-center gap-2">
            {factionData && (
              <>
                <span 
                  className="text-2xl"
                  style={{ color: factionData.color }}
                >
                  {factionData.emblem}
                </span>
                <span 
                  className="font-display text-sm tracking-wider hidden sm:inline"
                  style={{ color: factionData.color }}
                >
                  {factionData.name}
                </span>
              </>
            )}
          </div>
          
          {/* Resources */}
          <ResourceBar resources={playerResources} />
        </div>
      </header>
      
      {/* Phase Bar */}
      <PhaseBar
        turn={turn}
        phase={phase}
        phaseIndex={phaseIndex}
        currentFaction={currentFaction}
        isPlayerTurn={isPlayerTurn}
        onAdvancePhase={handleAdvancePhase}
        onEndTurn={handleEndTurn}
        aiThinking={aiThinking}
      />
      
      {/* Action Prompt - ALWAYS VISIBLE */}
      <div className="flex-shrink-0 px-3 py-2 bg-void-950/50">
        <PhasePrompt
          phase={phase}
          selectedHex={selectedHex}
          selectedUnit={selectedUnit}
          validMoves={validMoves}
          validAttacks={validAttacks}
          isPlayerTurn={isPlayerTurn}
          currentFaction={currentFaction}
          playerFaction={playerFaction}
          units={units}
          aiThinking={aiThinking}
          pendingCombat={pendingCombat}
        />
      </div>
      
      {/* Main content area */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* Map container - takes most of the space */}
        <div className="flex-1 min-h-[40vh] lg:min-h-0">
          <HexMap
            mapData={mapData}
            units={units}
            selectedHex={selectedHex}
            validMoves={validMoves}
            validAttacks={validAttacks}
            playerFaction={playerFaction}
            onHexTap={handleHexTap}
          />
        </div>
        
        {/* Side panel (desktop) / Bottom panel (mobile) */}
        <div className="flex-shrink-0 lg:w-80 flex flex-col border-t lg:border-t-0 lg:border-l border-steel-light/20 bg-void-900/50">
          {/* Hex Info Panel */}
          <div className="flex-shrink-0 max-h-48 lg:max-h-none lg:flex-1 overflow-y-auto">
            <HexInfoPanel
              hex={selectedHexData}
              units={selectedUnitData ? [selectedUnitData] : []}
              phase={phase}
              isPlayerOwned={selectedHexData?.owner === playerFaction}
              onBuild={handleOpenBuildMenu}
              onTrain={handleOpenTrainMenu}
            />
          </div>
          
          {/* Chronicle */}
          <div className="flex-shrink-0 border-t border-steel-light/20">
            <Chronicle
              entries={entries}
              voiceEnabled={voiceEnabled}
              voiceReady={voiceReady}
              onVoiceToggle={toggleVoice}
              maxHeight="150px"
            />
          </div>
        </div>
      </div>
      
      {/* Build Menu Modal */}
      {showBuildMenu && selectedHexData && playerResources && (
        <BuildMenu
          hex={selectedHexData}
          resources={playerResources}
          playerFaction={playerFaction}
          buildingQueue={buildingQueue || []}
          onBuild={handleBuild}
          onClose={() => setShowBuildMenu(false)}
        />
      )}
      
      {/* Train Menu Modal */}
      {showTrainMenu && selectedHexData && playerResources && (
        <TrainMenu
          hex={selectedHexData}
          resources={playerResources}
          playerFaction={playerFaction}
          trainingQueue={trainingQueue || []}
          units={units}
          onTrain={handleTrain}
          onClose={() => setShowTrainMenu(false)}
        />
      )}
      
      {/* Combat Modal */}
      {pendingCombat && (
        <CombatModal
          attacker={units.find(u => pendingCombat.attackerIds?.includes(u.id))}
          defenders={units.filter(u => pendingCombat.defenderIds?.includes(u.id))}
          hex={pendingCombat.hex}
          mapData={mapData}
          playerFaction={playerFaction}
          onResolve={handleCombatResolve}
          onCancel={handleCombatCancel}
        />
      )}
    </div>
  )
}
