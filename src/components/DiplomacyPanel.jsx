// DiplomacyPanel.jsx - Mobile-friendly diplomacy modal
// Fits on screen, has clear close buttons

import { useMemo } from 'react'
import { FACTIONS } from '../data/factions'

const RELATION_COLORS = {
  hostile: { bg: 'bg-red-900/30', text: 'text-red-400', border: 'border-red-500/50' },
  neutral: { bg: 'bg-steel/30', text: 'text-steel-light', border: 'border-steel-light/50' },
  friendly: { bg: 'bg-green-900/30', text: 'text-green-400', border: 'border-green-500/50' },
  allied: { bg: 'bg-blue-900/30', text: 'text-blue-400', border: 'border-blue-500/50' },
}

export default function DiplomacyPanel({ 
  playerFaction, 
  relations, 
  playerResources,
  lastDiplomaticResult,
  onDiplomaticAction, 
  onClose 
}) {
  const otherFactions = useMemo(() => {
    return Object.entries(FACTIONS)
      .filter(([id]) => id !== playerFaction)
      .map(([id, faction]) => ({
        id,
        ...faction,
        relation: relations?.[playerFaction]?.[id] || 'neutral',
      }))
  }, [playerFaction, relations])
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-void-950/80">
      <div 
        className="w-full max-w-md max-h-[85vh] bg-void-900 border border-steel-light/30 rounded-lg 
                   flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex-none flex items-center justify-between px-4 py-3 border-b border-steel-light/20">
          <h2 className="font-display text-lg tracking-wider text-steel-bright">DIPLOMACY</h2>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-steel-light/50 
                       hover:text-white active:bg-steel/30 rounded"
          >
            ✕
          </button>
        </div>
        
        {/* Last result notification */}
        {lastDiplomaticResult && (
          <div className={`flex-none px-4 py-2 text-sm ${
            lastDiplomaticResult.success ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'
          }`}>
            {lastDiplomaticResult.message}
          </div>
        )}
        
        {/* Faction list */}
        <div 
          className="flex-1 overflow-y-auto p-4 space-y-3"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {otherFactions.map(faction => (
            <FactionCard 
              key={faction.id}
              faction={faction}
              onImprove={() => onDiplomaticAction?.(faction.id, 'improve')}
              onDeclareWar={() => onDiplomaticAction?.(faction.id, 'declare_war')}
            />
          ))}
        </div>
        
        {/* Footer close button */}
        <div className="flex-none p-4 border-t border-steel-light/20">
          <button
            onClick={onClose}
            className="w-full py-2.5 text-sm font-display uppercase tracking-wider
                       bg-steel/30 text-steel-light border border-steel-light/30 rounded
                       active:bg-steel/50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

function FactionCard({ faction, onImprove, onDeclareWar }) {
  const colors = RELATION_COLORS[faction.relation] || RELATION_COLORS.neutral
  
  return (
    <div className={`${colors.bg} border ${colors.border} rounded-lg p-3`}>
      {/* Faction header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{faction.emblem || '◆'}</span>
          <span 
            className="font-display text-sm tracking-wider"
            style={{ color: faction.color }}
          >
            {faction.name}
          </span>
        </div>
        <span className={`text-xs uppercase font-mono ${colors.text}`}>
          {faction.relation}
        </span>
      </div>
      
      {/* Description */}
      <p className="text-xs text-steel-light/60 mb-3 line-clamp-2">
        {faction.description || 'A faction vying for control of the fractured sphere.'}
      </p>
      
      {/* Actions */}
      <div className="flex gap-2">
        {faction.relation !== 'allied' && faction.relation !== 'friendly' && (
          <button
            onClick={onImprove}
            className="flex-1 py-1.5 text-xs font-display uppercase tracking-wider
                       bg-green-900/50 text-green-400 border border-green-500/50 rounded
                       active:bg-green-800"
          >
            Improve
          </button>
        )}
        
        {faction.relation !== 'hostile' && (
          <button
            onClick={onDeclareWar}
            className="flex-1 py-1.5 text-xs font-display uppercase tracking-wider
                       bg-red-900/50 text-red-400 border border-red-500/50 rounded
                       active:bg-red-800"
          >
            Declare War
          </button>
        )}
        
        {faction.relation === 'hostile' && (
          <button
            onClick={onImprove}
            className="flex-1 py-1.5 text-xs font-display uppercase tracking-wider
                       bg-yellow-900/50 text-yellow-400 border border-yellow-500/50 rounded
                       active:bg-yellow-800"
          >
            Seek Peace
          </button>
        )}
      </div>
    </div>
  )
}
