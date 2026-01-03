// Diplomacy panel - mobile-friendly modal

import { useState, useMemo } from 'react'
import { FACTIONS } from '../data/factions'

// Relation levels
const RELATION_ORDER = ['war', 'hostile', 'unfriendly', 'neutral', 'cordial', 'friendly', 'allied']

const RELATION_COLORS = {
  war: '#c45555',
  hostile: '#d46a51',
  unfriendly: '#c9a227',
  neutral: '#8a9baa',
  cordial: '#7eb36a',
  friendly: '#55a870',
  allied: '#4a90d9',
}

const RELATION_LABELS = {
  war: 'At War',
  hostile: 'Hostile',
  unfriendly: 'Unfriendly',
  neutral: 'Neutral',
  cordial: 'Cordial',
  friendly: 'Friendly',
  allied: 'Allied',
}

// Diplomatic actions
const DIPLOMATIC_ACTIONS = {
  IMPROVE_RELATIONS: {
    name: 'Send Envoy',
    description: 'Improve relations',
    cost: { gold: 50, influence: 10 },
    minRelation: 'hostile',
  },
  PROPOSE_TRADE: {
    name: 'Trade Agreement',
    description: '+10% resource income',
    cost: { gold: 100 },
    minRelation: 'cordial',
  },
  PROPOSE_ALLIANCE: {
    name: 'Alliance',
    description: 'Mutual defense pact',
    cost: { influence: 50 },
    minRelation: 'friendly',
  },
  REQUEST_CEASEFIRE: {
    name: 'Ceasefire',
    description: 'End hostilities',
    cost: { gold: 200, influence: 25 },
    minRelation: 'war',
  },
  DECLARE_WAR: {
    name: 'Declare War',
    description: 'Begin hostilities',
    cost: {},
    minRelation: 'hostile',
  },
}

export default function DiplomacyPanel({
  playerFaction,
  relations,
  playerResources,
  onDiplomaticAction,
  onClose,
}) {
  const [selectedFaction, setSelectedFaction] = useState(null)
  const [actionResult, setActionResult] = useState(null)
  
  // Get other factions with their relations
  const otherFactions = useMemo(() => {
    return Object.entries(FACTIONS)
      .filter(([id]) => id !== playerFaction)
      .map(([id, faction]) => ({
        id,
        ...faction,
        relation: relations[playerFaction]?.[id] || 'neutral',
      }))
  }, [playerFaction, relations])
  
  // Get available actions for selected faction
  const availableActions = useMemo(() => {
    if (!selectedFaction) return []
    
    const currentRelation = relations[playerFaction]?.[selectedFaction] || 'neutral'
    const relationIndex = RELATION_ORDER.indexOf(currentRelation)
    
    return Object.entries(DIPLOMATIC_ACTIONS).map(([key, action]) => {
      const minRelationIndex = RELATION_ORDER.indexOf(action.minRelation)
      const relationValid = action.minRelation === 'war' 
        ? currentRelation === 'war'
        : relationIndex >= minRelationIndex
      
      // Special cases
      if (key === 'DECLARE_WAR' && currentRelation === 'war') {
        return { key, ...action, available: false, reason: 'Already at war' }
      }
      if (key === 'PROPOSE_ALLIANCE' && currentRelation === 'allied') {
        return { key, ...action, available: false, reason: 'Already allied' }
      }
      if (key === 'IMPROVE_RELATIONS' && currentRelation === 'allied') {
        return { key, ...action, available: false, reason: 'Relations maxed' }
      }
      
      // Check resources
      const canAfford = Object.entries(action.cost).every(
        ([resource, amount]) => (playerResources[resource] || 0) >= amount
      )
      
      let reason = null
      if (!relationValid) reason = `Requires ${RELATION_LABELS[action.minRelation]}`
      else if (!canAfford) reason = 'Insufficient resources'
      
      return { key, ...action, available: relationValid && canAfford, reason }
    })
  }, [selectedFaction, relations, playerFaction, playerResources])
  
  const handleAction = (actionKey) => {
    if (!selectedFaction) return
    const result = onDiplomaticAction(selectedFaction, actionKey)
    setActionResult(result)
    setTimeout(() => setActionResult(null), 3000)
  }
  
  const selectedFactionData = selectedFaction ? FACTIONS[selectedFaction] : null
  const currentRelation = selectedFaction 
    ? (relations[playerFaction]?.[selectedFaction] || 'neutral') 
    : null
  
  return (
    <div className="fixed inset-0 bg-void-950/90 z-50 flex items-center justify-center p-4">
      {/* Modal container - constrained for mobile */}
      <div className="bg-void-900 border border-steel-light/30 rounded-lg w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden">
        
        {/* Header with close button */}
        <div className="flex items-center justify-between p-4 border-b border-steel-light/20 flex-shrink-0">
          <h2 className="font-display text-base tracking-wider uppercase text-steel-bright">
            🤝 Diplomacy
          </h2>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full
                       bg-steel/20 text-steel-light text-xl
                       active:bg-steel/40"
          >
            ×
          </button>
        </div>
        
        {/* Result notification */}
        {actionResult && (
          <div className={`
            mx-4 mt-3 p-3 rounded border text-sm
            ${actionResult.success 
              ? 'bg-green-900/30 border-green-500/30 text-green-400' 
              : 'bg-red-900/30 border-red-500/30 text-red-400'
            }
          `}>
            {actionResult.message}
          </div>
        )}
        
        {/* Content - scrollable */}
        <div className="flex-1 overflow-y-auto p-4">
          
          {/* Faction list */}
          <div className="mb-4">
            <div className="text-xs text-steel-light/50 uppercase tracking-wider mb-2">
              Select Faction
            </div>
            <div className="grid grid-cols-1 gap-2">
              {otherFactions.map(faction => (
                <button
                  key={faction.id}
                  onClick={() => setSelectedFaction(faction.id)}
                  className={`
                    p-3 rounded border text-left transition-all
                    ${selectedFaction === faction.id 
                      ? 'bg-steel/30 border-continuity/50' 
                      : 'bg-steel/10 border-steel-light/10 active:bg-steel/20'
                    }
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span style={{ color: faction.color }}>{faction.emblem}</span>
                      <span className="font-display text-sm text-steel-bright">
                        {faction.name}
                      </span>
                    </div>
                    <span 
                      className="text-xs font-mono px-2 py-0.5 rounded"
                      style={{ 
                        color: RELATION_COLORS[faction.relation],
                        backgroundColor: RELATION_COLORS[faction.relation] + '20'
                      }}
                    >
                      {RELATION_LABELS[faction.relation]}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
          
          {/* Selected faction actions */}
          {selectedFactionData && (
            <div>
              <div className="text-xs text-steel-light/50 uppercase tracking-wider mb-2">
                Actions with {selectedFactionData.name}
              </div>
              
              <div className="space-y-2">
                {availableActions.map(action => (
                  <button
                    key={action.key}
                    onClick={() => action.available && handleAction(action.key)}
                    disabled={!action.available}
                    className={`
                      w-full p-3 rounded border text-left
                      ${action.available 
                        ? 'bg-steel/10 border-steel-light/20 active:bg-steel/30' 
                        : 'bg-void-800/50 border-steel-light/10 opacity-50'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-display text-sm text-steel-bright">
                        {action.name}
                      </span>
                      {Object.keys(action.cost).length > 0 && (
                        <span className="text-xs text-steel-light/60">
                          {Object.entries(action.cost).map(([r, a]) => 
                            `${a} ${r}`
                          ).join(', ')}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-steel-light/60">
                      {action.available ? action.description : action.reason}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {!selectedFaction && (
            <div className="text-center text-steel-light/40 py-8">
              Select a faction to view diplomatic options
            </div>
          )}
        </div>
        
        {/* Footer close button */}
        <div className="p-4 border-t border-steel-light/20 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded bg-steel/20 text-steel-light 
                       font-display uppercase tracking-wider text-sm
                       active:bg-steel/40"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
