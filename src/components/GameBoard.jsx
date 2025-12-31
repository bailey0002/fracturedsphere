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
  const [showBuildMenu, setShowBuildMenu] = useState(false)
  const [showDiplomacy, setShowDiplomacy] = useState(false)
  
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
  }, [phase, turn]) // Run when phase changes or new turn starts
  
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
  
  // Handle hex clicks - check for attacks
  const handleHexClick = (q, r) => {
    // Check if clicking on valid attack target
    const attackTarget = validAttacks.find(a => a.q === q && a.r === r)
    if (attackTarget && selectedUnit) {
      actions.initiateAttack(selectedUnit, attackTarget.targetId)
      return
    }
    
    // Check if clicking on valid move
    const moveTarget = validMoves.find(m => m.q === q && m.r === r)
    if (moveTarget && selectedUnit) {
      actions.moveUnit(q, r)
      return
    }
    
    // Default: select hex
    actions.selectHex(q, r)
  }
  
  // Combat resolution handler
  const handleCombatResolve = (result) => {
    actions.resolveCombat(result)
  }
  
  return (
    <div className="h-screen flex flex-col bg-void-950">
      {/* Top bar - Resources and Turn info */}
      <div className="flex-none p-4 space-y-2">
        <div className="flex items-center justify-between gap-4">
          {/* Faction and resources */}
          <div className="flex items-center gap-4">
            <div 
              className="flex items-center gap-2 px-3 py-1 rounded border"
              style={{ 
                borderColor: factionData?.color,
                color: factionData?.color,
              }}
            >
              <span className="text-xl">{factionData?.emblem}</span>
              <span className="font-display text-sm tracking-wider">
                {factionData?.name}
              </span>
            </div>
            
            <ResourceBar 
              resources={resources} 
              factionColor={factionData?.color}
            />
          </div>
          
          {/* Territory count */}
          <div className="text-sm font-mono text-steel-light">
            <span className="text-steel-light/50">Territory: </span>
            <span style={{ color: factionData?.color }}>{territoryCount}</span>
            <span className="text-steel-light/50">/{totalHexes}</span>
          </div>
        </div>
        
        {/* Turn controls */}
        <TurnBar
          turn={turn}
          phase={phase}
          phaseIndex={phaseIndex}
          onAdvancePhase={actions.advancePhase}
          onEndTurn={actions.endTurn}
        />
      </div>
      
      {/* Main content - Map and side panel */}
      <div className="flex-1 flex overflow-hidden">
        {/* Map */}
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
          
          {/* Phase instructions overlay */}
          <div className="absolute top-4 left-4 panel text-sm max-w-xs">
            <PhaseInstructions phase={phase} onOpenDiplomacy={() => setShowDiplomacy(true)} />
          </div>
          
          {/* AI Thinking overlay */}
          {aiThinking && (
            <div className="absolute inset-0 bg-void-950/50 flex items-center justify-center">
              <div className="panel px-8 py-4 animate-pulse">
                <span className="font-display text-steel-bright tracking-wider">
                  AI THINKING...
                </span>
              </div>
            </div>
          )}
        </div>
        
        {/* Side panel */}
        <div className="flex-none w-80 p-4 space-y-4 overflow-y-auto">
          <HexInfoPanel
            hex={selectedHexData}
            units={unitsOnSelectedHex}
            onClose={actions.clearSelection}
          />
          
          {/* Build Menu - Show during production phase when owned hex selected */}
          {phase === 'production' && 
           selectedHexData && 
           selectedHexData.owner === playerFaction && (
            <BuildMenu
              hex={selectedHexData}
              playerResources={resources}
              buildingQueue={buildingQueue || []}
              onBuild={(buildingType) => {
                actions.startBuilding(selectedHex, buildingType, playerFaction)
              }}
              onClose={actions.clearSelection}
            />
          )}
          
          {/* Train Menu - Show during production phase when owned hex selected */}
          {phase === 'production' && 
           selectedHexData && 
           selectedHexData.owner === playerFaction && (
            <TrainMenu
              hex={selectedHexData}
              playerResources={resources}
              trainingQueue={trainingQueue || []}
              onTrain={(unitType) => {
                actions.startTraining(selectedHex, unitType, playerFaction)
              }}
              onClose={actions.clearSelection}
            />
          )}
        </div>
      </div>
      
      {/* Action hints */}
      {selectedUnit && validMoves.length > 0 && (
        <ActionHint 
          message="Click a highlighted hex to move the selected unit"
          type="move"
        />
      )}
      
      {selectedUnit && validAttacks.length > 0 && (
        <ActionHint 
          message="Red hexes contain enemy units you can attack"
          type="attack"
        />
      )}
      
      {/* Combat Modal */}
      {pendingCombat && (
        <CombatModal
          attacker={pendingCombat.attacker}
          defender={pendingCombat.defender}
          terrain={pendingCombat.terrain}
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
          onDiplomaticAction={actions.performDiplomaticAction}
          onClose={() => setShowDiplomacy(false)}
        />
      )}
      
      {/* Version */}
      <div className="absolute bottom-2 right-2 text-xs font-mono text-steel-light/30">
        v0.3.0
      </div>
    </div>
  )
}

// Phase-specific instructions
function PhaseInstructions({ phase, onOpenDiplomacy }) {
  const instructions = {
    production: {
      title: 'Production Phase',
      text: 'Resources collected. Select your territory to build structures.',
      icon: '⚙',
    },
    diplomacy: {
      title: 'Diplomacy Phase',
      text: 'Manage relations with other factions.',
      icon: '🤝',
    },
    movement: {
      title: 'Movement Phase',
      text: 'Select units and move them. Click enemies to attack.',
      icon: '→',
    },
    combat: {
      title: 'Combat Phase',
      text: 'Resolve battles with adjacent enemies.',
      icon: '⚔',
    },
  }
  
  const info = instructions[phase] || instructions.production
  
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{info.icon}</span>
        <span className="font-display text-xs tracking-wider uppercase text-steel-light">
          {info.title}
        </span>
      </div>
      <p className="text-xs text-steel-light/70 mb-2">
        {info.text}
      </p>
      {phase === 'diplomacy' && onOpenDiplomacy && (
        <button
          onClick={onOpenDiplomacy}
          className="btn-primary text-xs py-1 px-3"
        >
          Open Diplomacy
        </button>
      )}
    </div>
  )
}

// Action hint toast
function ActionHint({ message, type }) {
  const colors = {
    move: 'border-success/50 bg-success/10',
    attack: 'border-danger/50 bg-danger/10',
  }
  
  return (
    <div className={`
      fixed bottom-4 left-1/2 -translate-x-1/2
      px-4 py-2 rounded border
      text-sm text-steel-bright
      animate-fade-in
      ${colors[type] || 'border-steel-light/50 bg-steel/10'}
    `}>
      {message}
    </div>
  )
}
