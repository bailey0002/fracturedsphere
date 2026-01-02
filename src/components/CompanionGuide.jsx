// Companion Guide - Contextual prompts to guide gameplay

import { useState, useEffect } from 'react'
import { FACTIONS } from '../data/factions'

export default function CompanionGuide({ 
  phase,
  turn,
  selectedHex,
  selectedUnit,
  validMoves,
  validAttacks,
  pendingCombat,
  playerFaction,
  units,
  factionResources,
  aiThinking,
  mapData,
}) {
  const [dismissed, setDismissed] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  
  // Reset dismissed state when context changes significantly
  useEffect(() => {
    setDismissed(false)
  }, [phase, turn, pendingCombat, selectedHex])
  
  const factionData = FACTIONS[playerFaction]
  const playerUnits = units?.filter(u => u.owner === playerFaction) || []
  const unmovedUnits = playerUnits.filter(u => !u.movedThisTurn)
  
  // Determine current prompt
  const getPrompt = () => {
    if (aiThinking) {
      return {
        icon: '⏳',
        title: 'AI Turn',
        message: 'Other factions are taking their turns...',
        detail: 'Watch the map to see enemy movements.',
        action: null,
      }
    }
    
    if (pendingCombat) {
      return {
        icon: '⚔️',
        title: 'Battle!',
        message: 'Choose your combat doctrine and engage the enemy.',
        detail: 'Assault = more damage dealt. Defensive = less damage taken. Check the forecast before engaging.',
        action: 'Select doctrine → Engage',
      }
    }
    
    // First turn welcome
    if (turn === 1 && phase === 'production' && !selectedHex) {
      return {
        icon: '👋',
        title: `Welcome, Commander`,
        message: `You lead ${factionData?.name || 'your faction'}. Your capital is marked with a ★ star.`,
        detail: 'TAP YOUR CAPITAL (★) to see your territory info and begin building. The Info panel will show details about any hex you tap.',
        action: 'Tap your ★ capital hex',
      }
    }
    
    switch (phase) {
      case 'production':
        if (selectedHex) {
          const hex = mapData?.[selectedHex]
          if (hex?.owner === playerFaction) {
            return {
              icon: '🏗️',
              title: 'Your Territory',
              message: 'This hex belongs to you! Use the tabs below.',
              detail: 'INFO: View hex details. BUILD: Construct buildings (generate resources). TRAIN: Recruit new units.',
              action: 'Tap Build or Train tab',
            }
          } else {
            return {
              icon: '👁️',
              title: 'Neutral/Enemy Territory',
              message: 'You don\'t control this hex yet.',
              detail: 'Move units here during Movement phase to capture it. Tap one of YOUR hexes to build.',
              action: 'Tap your territory instead',
            }
          }
        }
        return {
          icon: '⚙️',
          title: 'Production Phase',
          message: 'Resources collected! Build structures or train units.',
          detail: 'Tap any hex with your color to see options. Your capital (★) is the best place to start.',
          action: 'Tap your hex → Build/Train',
        }
        
      case 'diplomacy':
        return {
          icon: '🤝',
          title: 'Diplomacy Phase',
          message: 'Manage relations with other factions.',
          detail: 'Open Diplomacy to negotiate. Or skip this phase if you prefer war!',
          action: 'Open Diplomacy or Next Phase',
        }
        
      case 'movement':
        if (selectedUnit && validAttacks.length > 0) {
          return {
            icon: '🎯',
            title: 'Enemy in Range!',
            message: 'You can attack! Red hexes show enemies.',
            detail: 'Tap the red hex with ⚔️ to initiate combat.',
            action: 'Tap red hex to attack',
          }
        }
        if (selectedUnit && validMoves.length > 0) {
          return {
            icon: '🚶',
            title: 'Unit Selected',
            message: 'Green dashed circles show where you can move.',
            detail: 'Tap a green-highlighted hex to move there. Moving onto neutral territory captures it!',
            action: 'Tap green hex to move',
          }
        }
        if (unmovedUnits.length > 0) {
          return {
            icon: '→',
            title: 'Movement Phase',
            message: `You have ${unmovedUnits.length} unit${unmovedUnits.length > 1 ? 's' : ''} ready to move.`,
            detail: 'Tap a unit (numbered circle) to select it and see movement options.',
            action: 'Tap a unit to select',
          }
        }
        return {
          icon: '✓',
          title: 'Movement Complete',
          message: 'All units have moved this turn.',
          detail: 'Press Next Phase to continue to Combat, or End Turn to finish.',
          action: 'Next Phase or End Turn',
        }
        
      case 'combat':
        return {
          icon: '⚔️',
          title: 'Combat Phase',
          message: 'Battles are resolved automatically.',
          detail: 'If you initiated attacks, they resolve now. Otherwise this phase passes quickly.',
          action: 'Waiting...',
        }
        
      default:
        return {
          icon: '❓',
          title: 'Unknown Phase',
          message: 'Something unexpected happened.',
          detail: 'Try pressing Next Phase or End Turn.',
          action: 'Next Phase',
        }
    }
  }
  
  const prompt = getPrompt()
  
  if (dismissed) return null
  
  return (
    <div className="fixed bottom-24 md:bottom-20 left-2 right-2 md:left-4 md:right-auto md:max-w-md z-40">
      <div className="bg-void-950/95 border-2 border-continuity/50 rounded-lg shadow-xl backdrop-blur-sm overflow-hidden">
        {/* Header */}
        <div 
          className="flex items-center justify-between p-3 bg-continuity/20 cursor-pointer"
          onClick={() => setShowDetails(!showDetails)}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">{prompt.icon}</span>
            <div>
              <div className="font-display text-sm text-continuity tracking-wider">
                {prompt.title}
              </div>
              <div className="text-xs text-steel-light">
                {prompt.message}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-steel-light/50 text-xs">
              {showDetails ? '▲' : '▼'}
            </span>
            <button 
              onClick={(e) => { e.stopPropagation(); setDismissed(true); }}
              className="text-steel-light/50 hover:text-steel-light p-1"
            >
              ✕
            </button>
          </div>
        </div>
        
        {/* Expandable details */}
        {showDetails && (
          <div className="p-3 border-t border-continuity/20">
            <p className="text-sm text-steel-light mb-2">
              {prompt.detail}
            </p>
            {prompt.action && (
              <div className="text-xs text-continuity font-mono bg-continuity/10 px-2 py-1 rounded inline-block">
                → {prompt.action}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
