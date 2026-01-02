// Companion guide - contextual prompts to help players

import { useState, useEffect, useMemo } from 'react'
import { hexId } from '../utils/hexMath'

export default function CompanionGuide({
  phase,
  selectedHex,
  selectedUnit,
  validMoves,
  validAttacks,
  units,
  playerFaction,
}) {
  const [dismissed, setDismissed] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  
  // Reset dismissed state when phase changes
  useEffect(() => {
    setDismissed(false)
  }, [phase])
  
  // Get unmoved player units
  const unmovedUnits = useMemo(() => {
    return units.filter(u => 
      u.faction === playerFaction && 
      !u.hasMoved
    )
  }, [units, playerFaction])
  
  // Determine contextual prompt based on game state
  const getPrompt = () => {
    switch (phase) {
      case 'production':
        if (!selectedHex) {
          return {
            icon: '⚙',
            title: 'Production Phase',
            message: 'Tap one of your territories to build or train.',
            detail: 'Buildings generate resources. Units expand your empire.',
          }
        }
        if (selectedHex?.owner === playerFaction) {
          return {
            icon: '🏗️',
            title: 'Your Territory',
            message: 'Use Build or Train tabs below.',
            detail: 'Capitals can train units. All territories can build structures.',
          }
        }
        return {
          icon: '⚙',
          title: 'Production Phase',
          message: 'Tap YOUR territory (colored hex) to build.',
          detail: 'You can only build on hexes you control.',
        }
        
      case 'diplomacy':
        return {
          icon: '🤝',
          title: 'Diplomacy Phase',
          message: 'Manage relations with AI factions.',
          detail: 'Open Diplomacy to propose treaties or trade.',
        }
        
      case 'movement':
        if (validAttacks.length > 0) {
          return {
            icon: '⚔️',
            title: 'Attack Ready!',
            message: 'Red hexes show enemies you can attack.',
            detail: 'Tap a red hex to initiate combat.',
          }
        }
        if (selectedUnit && validMoves.length > 0) {
          return {
            icon: '🚶',
            title: 'Unit Selected',
            message: 'Green circles show where you can move.',
            detail: 'Tap a green hex to move there.',
          }
        }
        if (unmovedUnits.length > 0) {
          return {
            icon: '→',
            title: 'Movement Phase',
            message: `${unmovedUnits.length} unit${unmovedUnits.length > 1 ? 's' : ''} ready to move.`,
            detail: 'Tap a unit (numbered circle) to select it.',
          }
        }
        return {
          icon: '✓',
          title: 'All Moved',
          message: 'All units have acted.',
          detail: 'Press Next or End Turn to continue.',
        }
        
      case 'combat':
        return {
          icon: '⚔️',
          title: 'Combat Phase',
          message: 'Battles resolve automatically.',
          detail: 'Watch for combat results.',
        }
        
      default:
        return {
          icon: '❓',
          title: 'Unknown',
          message: 'Press Next Phase to continue.',
          detail: '',
        }
    }
  }
  
  const prompt = getPrompt()
  
  if (dismissed) return null
  
  return (
    <div className="absolute bottom-20 md:bottom-4 left-2 right-2 md:left-4 md:right-auto md:max-w-xs z-30">
      <div className="bg-void-950/90 border border-continuity/40 rounded-lg shadow-lg backdrop-blur-sm">
        {/* Header - tap to expand */}
        <div 
          className="flex items-center justify-between p-2 cursor-pointer"
          onClick={() => setShowDetails(!showDetails)}
        >
          <div className="flex items-center gap-2">
            <span className="text-xl">{prompt.icon}</span>
            <div>
              <div className="font-display text-xs text-continuity tracking-wider">
                {prompt.title}
              </div>
              <div className="text-xs text-steel-light">
                {prompt.message}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-steel-light/50 text-xs">
              {showDetails ? '▲' : '▼'}
            </span>
            <button 
              onClick={(e) => { e.stopPropagation(); setDismissed(true); }}
              className="text-steel-light/50 hover:text-steel-light p-1 text-xs"
            >
              ✕
            </button>
          </div>
        </div>
        
        {/* Expandable detail */}
        {showDetails && prompt.detail && (
          <div className="px-3 pb-2 border-t border-continuity/20 pt-2">
            <p className="text-xs text-steel-light/70">
              {prompt.detail}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
