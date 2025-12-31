// Diplomacy panel for managing faction relations

import { useState, useMemo } from 'react'
import { FACTIONS, RELATIONS, DIPLOMATIC_ACTIONS, getRelationColor, getRelationLabel } from '../data/factions'
import { getResourceColor } from '../data/terrain'

const RELATION_ORDER = ['allied', 'cordial', 'neutral', 'hostile', 'war']

export default function DiplomacyPanel({ 
  playerFaction,
  relations,
  playerResources,
  onDiplomaticAction,
  onClose
}) {
  const [selectedFaction, setSelectedFaction] = useState(null)
  const [actionResult, setActionResult] = useState(null)
  
  // Get all other factions
  const otherFactions = useMemo(() => {
    return Object.keys(FACTIONS)
      .filter(id => id !== playerFaction)
      .map(id => ({
        ...FACTIONS[id],
        relation: relations[playerFaction]?.[id] || 'neutral'
      }))
  }, [playerFaction, relations])
  
  // Get available actions for selected faction
  const availableActions = useMemo(() => {
    if (!selectedFaction) return []
    
    const currentRelation = relations[playerFaction]?.[selectedFaction] || 'neutral'
    const relationIndex = RELATION_ORDER.indexOf(currentRelation)
    
    return Object.entries(DIPLOMATIC_ACTIONS).map(([key, action]) => {
      // Check if action is available based on current relation
      const minRelationIndex = RELATION_ORDER.indexOf(action.minRelation)
      const relationValid = action.minRelation === 'war' 
        ? currentRelation === 'war'
        : relationIndex >= minRelationIndex
      
      // Special case: can't declare war if already at war
      if (key === 'DECLARE_WAR' && currentRelation === 'war') {
        return { key, ...action, available: false, reason: 'Already at war' }
      }
      
      // Special case: can't propose alliance if already allied
      if (key === 'PROPOSE_ALLIANCE' && currentRelation === 'allied') {
        return { key, ...action, available: false, reason: 'Already allied' }
      }
      
      // Special case: can't improve relations if allied
      if (key === 'IMPROVE_RELATIONS' && currentRelation === 'allied') {
        return { key, ...action, available: false, reason: 'Relations maxed' }
      }
      
      // Check resource costs
      const canAfford = Object.entries(action.cost).every(
        ([resource, amount]) => (playerResources[resource] || 0) >= amount
      )
      
      let reason = null
      if (!relationValid) reason = `Requires ${getRelationLabel(action.minRelation)}`
      else if (!canAfford) reason = 'Insufficient resources'
      
      return {
        key,
        ...action,
        available: relationValid && canAfford,
        reason,
        canAfford,
      }
    })
  }, [selectedFaction, relations, playerFaction, playerResources])
  
  const handleAction = (actionKey) => {
    const action = DIPLOMATIC_ACTIONS[actionKey]
    if (!action || !selectedFaction) return
    
    // Execute the action
    const result = onDiplomaticAction(selectedFaction, actionKey)
    
    // Show result feedback
    setActionResult(result)
    setTimeout(() => setActionResult(null), 3000)
  }
  
  const selectedFactionData = selectedFaction ? FACTIONS[selectedFaction] : null
  const currentRelation = selectedFaction ? (relations[playerFaction]?.[selectedFaction] || 'neutral') : null
  
  return (
    <div className="fixed inset-0 bg-void-950/80 flex items-center justify-center z-50">
      <div className="bg-steel-darker border border-steel-light/20 rounded-lg p-6 min-w-[600px] max-w-[800px]">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-lg tracking-wider uppercase text-steel-bright">
            Diplomacy
          </h2>
          <button 
            onClick={onClose}
            className="text-steel-light/50 hover:text-steel-light transition-colors text-xl px-2"
          >
            ×
          </button>
        </div>
        
        {/* Result notification */}
        {actionResult && (
          <div className={`
            mb-4 p-3 rounded border text-sm animate-fade-in
            ${actionResult.success 
              ? 'bg-success/10 border-success/30 text-success' 
              : 'bg-danger/10 border-danger/30 text-danger'
            }
          `}>
            {actionResult.message}
          </div>
        )}
        
        <div className="flex gap-6">
          {/* Faction list */}
          <div className="w-52 space-y-2">
            <div className="text-xs text-steel-light/50 uppercase tracking-wider mb-3">
              Factions
            </div>
            {otherFactions.map(faction => (
              <button
                key={faction.id}
                onClick={() => setSelectedFaction(faction.id)}
                className={`
                  w-full p-3 rounded border text-left transition-all
                  ${selectedFaction === faction.id 
                    ? 'bg-steel/30 border-primary/50' 
                    : 'bg-steel/10 border-steel-light/10 hover:bg-steel/20'
                  }
                `}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: faction.color }}
                  />
                  <span className="font-display text-sm text-steel-bright">
                    {faction.name}
                  </span>
                </div>
                <div 
                  className="text-xs font-mono"
                  style={{ color: getRelationColor(faction.relation) }}
                >
                  {getRelationLabel(faction.relation)}
                </div>
              </button>
            ))}
          </div>
          
          {/* Selected faction details */}
          <div className="flex-1">
            {selectedFactionData ? (
              <>
                {/* Faction header */}
                <div 
                  className="p-4 rounded border-l-4 mb-4"
                  style={{ 
                    backgroundColor: `${selectedFactionData.color}15`,
                    borderColor: selectedFactionData.color 
                  }}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{selectedFactionData.emblem}</span>
                    <div>
                      <h3 
                        className="font-display text-lg"
                        style={{ color: selectedFactionData.color }}
                      >
                        {selectedFactionData.name}
                      </h3>
                      <p className="text-xs text-steel-light/70">
                        {selectedFactionData.description}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-3">
                    <span className="text-xs text-steel-light/50">Current Relations:</span>
                    <span 
                      className="text-sm font-display px-2 py-0.5 rounded"
                      style={{ 
                        color: getRelationColor(currentRelation),
                        backgroundColor: `${getRelationColor(currentRelation)}20`
                      }}
                    >
                      {getRelationLabel(currentRelation)}
                    </span>
                  </div>
                </div>
                
                {/* Available actions */}
                <div className="text-xs text-steel-light/50 uppercase tracking-wider mb-3">
                  Diplomatic Actions
                </div>
                <div className="space-y-2">
                  {availableActions.map(action => (
                    <ActionButton
                      key={action.key}
                      action={action}
                      onClick={() => handleAction(action.key)}
                    />
                  ))}
                </div>
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-steel-light/50 text-sm">
                Select a faction to view diplomatic options
              </div>
            )}
          </div>
        </div>
        
        {/* Footer with resources */}
        <div className="mt-6 pt-4 border-t border-steel-light/10 flex items-center justify-between">
          <div className="text-xs text-steel-light/50">
            Your Resources
          </div>
          <div className="flex items-center gap-4">
            <ResourceDisplay resource="gold" amount={playerResources.gold} />
            <ResourceDisplay resource="influence" amount={playerResources.influence} />
          </div>
        </div>
      </div>
    </div>
  )
}

// Action button component
function ActionButton({ action, onClick }) {
  const isWarAction = action.key === 'DECLARE_WAR'
  
  return (
    <button
      onClick={action.available ? onClick : undefined}
      disabled={!action.available}
      className={`
        w-full p-3 rounded border text-left transition-all
        ${!action.available 
          ? 'bg-steel/5 border-steel-light/5 opacity-50 cursor-not-allowed' 
          : isWarAction
            ? 'bg-danger/10 border-danger/30 hover:bg-danger/20 hover:border-danger/50'
            : 'bg-steel/10 border-steel-light/10 hover:bg-steel/20 hover:border-primary/30'
        }
      `}
    >
      <div className="flex items-center justify-between mb-1">
        <span className={`
          font-display text-sm
          ${isWarAction ? 'text-danger' : 'text-steel-bright'}
        `}>
          {action.name}
        </span>
        {action.successChance && (
          <span className="text-xs text-steel-light/50">
            {Math.round(action.successChance * 100)}% chance
          </span>
        )}
      </div>
      
      {/* Costs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {Object.entries(action.cost).map(([resource, amount]) => (
            amount > 0 && (
              <span 
                key={resource}
                className="text-xs font-mono"
                style={{ color: getResourceColor(resource) }}
              >
                {resource === 'gold' ? '●' : '★'} {amount}
              </span>
            )
          ))}
          {Object.keys(action.cost).every(k => action.cost[k] === 0) && (
            <span className="text-xs text-steel-light/50">Free</span>
          )}
        </div>
        
        {action.reason && (
          <span className="text-[10px] text-steel-light/40">{action.reason}</span>
        )}
      </div>
    </button>
  )
}

// Resource display
function ResourceDisplay({ resource, amount }) {
  const icons = { gold: '●', influence: '★' }
  return (
    <span 
      className="text-sm font-mono flex items-center gap-1"
      style={{ color: getResourceColor(resource) }}
    >
      <span>{icons[resource]}</span>
      {Math.floor(amount || 0)}
    </span>
  )
}
