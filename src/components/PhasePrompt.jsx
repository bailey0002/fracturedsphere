// PhasePrompt - Always-visible action guidance for The Fractured Sphere
// Tells the player exactly what to do based on current phase and selection state

import { useMemo } from 'react'
import { PHASES, PHASE_INFO, PHASE_ORDER } from '../hooks/useGameState'
import { FACTIONS } from '../data/factions'

// =============================================================================
// PHASE PROMPT COMPONENT
// =============================================================================

export default function PhasePrompt({ 
  phase, 
  selectedHex,
  selectedUnit,
  validMoves = [],
  validAttacks = [],
  isPlayerTurn,
  currentFaction,
  playerFaction,
  units = [],
  aiThinking = false,
  pendingCombat = null,
}) {
  const prompt = useMemo(() => {
    // AI is thinking
    if (aiThinking || !isPlayerTurn) {
      const factionName = currentFaction ? FACTIONS[currentFaction]?.name : 'AI'
      return {
        icon: '⏳',
        text: `${factionName} is deliberating...`,
        type: 'waiting',
      }
    }
    
    // Combat pending - need doctrine selection
    if (pendingCombat) {
      return {
        icon: '⚔',
        text: 'Select a doctrine for combat',
        type: 'combat',
      }
    }
    
    // Phase-specific prompts
    switch (phase) {
      case PHASES.COMMAND:
        if (selectedHex) {
          return {
            icon: '🏗',
            text: 'Choose BUILD or TRAIN, or tap another hex',
            type: 'action',
          }
        }
        return {
          icon: '👆',
          text: 'Tap one of your territories to build or train',
          type: 'action',
        }
        
      case PHASES.CONFLICT:
        // Check if player has units that can attack
        const canAttack = units.some(u => 
          u.owner === playerFaction && !u.attackedThisTurn
        )
        
        if (!canAttack) {
          return {
            icon: '➤',
            text: 'No attacks available. Tap NEXT to maneuver',
            type: 'info',
          }
        }
        
        if (selectedUnit && validAttacks.length > 0) {
          return {
            icon: '🎯',
            text: 'Tap a RED hex to attack',
            type: 'attack',
          }
        }
        
        if (selectedUnit && validAttacks.length === 0) {
          return {
            icon: '⚔',
            text: 'No enemies in range. Select another unit or SKIP',
            type: 'info',
          }
        }
        
        return {
          icon: '⚔',
          text: 'Select a unit to attack, or tap SKIP',
          type: 'attack',
        }
        
      case PHASES.MANEUVER:
        // Check if player has units that can move
        const canMove = units.some(u => 
          u.owner === playerFaction && !u.movedThisTurn
        )
        
        if (!canMove) {
          return {
            icon: '✓',
            text: 'All units moved. Tap END TURN to finish',
            type: 'done',
          }
        }
        
        if (selectedUnit && validMoves.length > 0) {
          return {
            icon: '➤',
            text: 'Tap a GREEN hex to move there',
            type: 'move',
          }
        }
        
        if (selectedUnit && validMoves.length === 0) {
          return {
            icon: '⊘',
            text: 'Unit cannot move. Select another or END TURN',
            type: 'info',
          }
        }
        
        return {
          icon: '👆',
          text: 'Tap a unit to move, or END TURN to finish',
          type: 'move',
        }
        
      default:
        return {
          icon: '?',
          text: 'Unknown phase',
          type: 'info',
        }
    }
  }, [phase, selectedHex, selectedUnit, validMoves, validAttacks, isPlayerTurn, currentFaction, playerFaction, units, aiThinking, pendingCombat])
  
  // Prompt type styling
  const typeStyles = {
    action: 'bg-blue-500/10 border-blue-500/30 text-blue-300',
    attack: 'bg-red-500/10 border-red-500/30 text-red-300',
    move: 'bg-green-500/10 border-green-500/30 text-green-300',
    combat: 'bg-orange-500/10 border-orange-500/30 text-orange-300',
    waiting: 'bg-steel/10 border-steel/30 text-steel-light animate-pulse',
    done: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
    info: 'bg-steel/10 border-steel/30 text-steel-light',
  }
  
  const style = typeStyles[prompt.type] || typeStyles.info
  
  return (
    <div 
      className={`phase-prompt px-4 py-2 border rounded-lg ${style}`}
      style={{ touchAction: 'manipulation' }}
    >
      <span className="prompt-icon text-lg mr-2">{prompt.icon}</span>
      <span className="prompt-text text-sm">{prompt.text}</span>
    </div>
  )
}

// =============================================================================
// PHASE BAR COMPONENT
// =============================================================================

export function PhaseBar({
  turn,
  phase,
  phaseIndex,
  currentFaction,
  isPlayerTurn,
  onAdvancePhase,
  onEndTurn,
  aiThinking = false,
}) {
  const factionData = currentFaction ? FACTIONS[currentFaction] : null
  
  return (
    <div 
      className="phase-bar flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-void-900/80 border-b border-steel-light/20"
      style={{ touchAction: 'manipulation' }}
    >
      {/* Turn counter + faction indicator */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-mono text-steel-light">
          Turn <span className="text-amber-400 font-bold">{turn}</span>
        </span>
        
        {factionData && (
          <span 
            className="text-xs px-2 py-0.5 rounded font-display tracking-wider"
            style={{ 
              backgroundColor: factionData.color + '30',
              color: factionData.color,
              border: `1px solid ${factionData.color}50`,
            }}
          >
            {factionData.name}
          </span>
        )}
      </div>
      
      {/* Phase indicators */}
      <div className="flex items-center gap-1">
        {PHASE_ORDER.map((p, index) => {
          const info = PHASE_INFO[p]
          const isCurrent = index === phaseIndex
          const isCompleted = index < phaseIndex
          
          return (
            <div
              key={p}
              className={`
                flex items-center gap-1 px-2 py-1 rounded text-xs font-mono
                transition-all duration-200
                ${isCurrent 
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50' 
                  : isCompleted 
                    ? 'bg-steel/10 text-steel-light/40'
                    : 'text-steel-light/20'
                }
              `}
            >
              <span>{info.icon}</span>
              <span className="hidden sm:inline uppercase tracking-wider">
                {info.name}
              </span>
            </div>
          )
        })}
      </div>
      
      {/* Action buttons */}
      <div className="flex items-center gap-2">
        {/* Skip/Next Phase button */}
        {isPlayerTurn && !aiThinking && phase !== PHASES.MANEUVER && (
          <button
            onPointerUp={onAdvancePhase}
            className="px-3 py-1.5 text-xs font-mono uppercase tracking-wider
                       bg-steel/20 hover:bg-steel/30 text-steel-light
                       border border-steel/30 rounded
                       transition-all duration-200"
            style={{ touchAction: 'manipulation' }}
          >
            {phase === PHASES.CONFLICT ? 'Skip' : 'Next'}
          </button>
        )}
        
        {/* End Turn button */}
        {isPlayerTurn && !aiThinking && phase === PHASES.MANEUVER && (
          <button
            onPointerUp={onEndTurn}
            className="px-3 py-1.5 text-xs font-mono uppercase tracking-wider
                       bg-amber-500/20 hover:bg-amber-500/30 text-amber-400
                       border border-amber-500/30 rounded
                       transition-all duration-200"
            style={{ touchAction: 'manipulation' }}
          >
            End Turn
          </button>
        )}
        
        {/* AI thinking indicator */}
        {aiThinking && (
          <span className="text-xs text-steel-light/50 animate-pulse">
            AI thinking...
          </span>
        )}
      </div>
    </div>
  )
}
