// FactionSelect - Faction selection screen for The Fractured Sphere
// Touch-friendly grid of faction options with lore

import { useState } from 'react'
import { FACTIONS } from '../data/factions'

export default function FactionSelect({ onSelect }) {
  const [selectedFaction, setSelectedFaction] = useState(null)
  const [hoveredFaction, setHoveredFaction] = useState(null)
  
  const displayFaction = hoveredFaction || selectedFaction
  const factionData = displayFaction ? FACTIONS[displayFaction] : null
  
  const handleSelect = (factionId) => {
    setSelectedFaction(factionId)
  }
  
  const handleConfirm = () => {
    if (selectedFaction) {
      onSelect(selectedFaction)
    }
  }
  
  return (
    <div 
      className="faction-select min-h-screen flex flex-col items-center justify-center p-4 bg-void-950"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {/* Title */}
      <div className="text-center mb-8">
        <h1 className="text-3xl sm:text-4xl font-display tracking-widest text-steel-bright mb-2">
          THE FRACTURED SPHERE
        </h1>
        <p className="text-steel-light/60 text-sm">
          Choose your faction to begin
        </p>
      </div>
      
      {/* Faction grid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 max-w-lg w-full mb-6">
        {Object.values(FACTIONS).map((faction) => (
          <FactionCard
            key={faction.id}
            faction={faction}
            isSelected={selectedFaction === faction.id}
            onSelect={() => handleSelect(faction.id)}
            onHover={() => setHoveredFaction(faction.id)}
            onLeave={() => setHoveredFaction(null)}
          />
        ))}
      </div>
      
      {/* Faction details */}
      <div className="w-full max-w-lg mb-6 min-h-[120px]">
        {factionData ? (
          <div 
            className="p-4 rounded-lg border transition-all duration-300"
            style={{
              backgroundColor: factionData.color + '10',
              borderColor: factionData.color + '40',
            }}
          >
            <div className="flex items-center gap-3 mb-2">
              <span 
                className="text-3xl"
                style={{ color: factionData.color }}
              >
                {factionData.emblem}
              </span>
              <div>
                <h2 
                  className="text-lg font-display tracking-wider"
                  style={{ color: factionData.color }}
                >
                  {factionData.name}
                </h2>
                <p className="text-xs text-steel-light/60 capitalize">
                  {factionData.personality} Doctrine
                </p>
              </div>
            </div>
            <p className="text-sm text-steel-light/80 leading-relaxed">
              {factionData.lore}
            </p>
            
            {/* Bonuses */}
            <div className="mt-3 flex flex-wrap gap-2">
              {factionData.bonuses && Object.entries(factionData.bonuses).map(([key, value]) => (
                <span 
                  key={key}
                  className="text-xs px-2 py-1 rounded bg-void-900/50 text-steel-light/70"
                >
                  {formatBonus(key, value)}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-lg border border-steel-light/10 text-center text-steel-light/40">
            <p className="text-sm">Select a faction to view details</p>
          </div>
        )}
      </div>
      
      {/* Confirm button */}
      <button
        onPointerUp={handleConfirm}
        disabled={!selectedFaction}
        className={`
          px-8 py-3 rounded font-display tracking-widest uppercase
          transition-all duration-300
          ${selectedFaction 
            ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30' 
            : 'bg-steel/10 text-steel-light/30 border border-steel-light/10 cursor-not-allowed'
          }
        `}
        style={{ touchAction: 'manipulation' }}
      >
        Begin Campaign
      </button>
    </div>
  )
}

// Individual faction card
function FactionCard({ faction, isSelected, onSelect, onHover, onLeave }) {
  return (
    <button
      onPointerUp={onSelect}
      onPointerEnter={onHover}
      onPointerLeave={onLeave}
      className={`
        faction-card p-4 rounded-lg border-2 transition-all duration-200
        flex flex-col items-center gap-2
        ${isSelected 
          ? 'ring-2 ring-offset-2 ring-offset-void-950' 
          : 'hover:scale-105'
        }
      `}
      style={{
        backgroundColor: faction.color + '15',
        borderColor: isSelected ? faction.color : faction.color + '40',
        ringColor: isSelected ? faction.color : 'transparent',
        touchAction: 'manipulation',
      }}
    >
      <span 
        className="text-4xl sm:text-5xl"
        style={{ color: faction.color }}
      >
        {faction.emblem}
      </span>
      <span 
        className="text-xs sm:text-sm font-display tracking-wider text-center"
        style={{ color: faction.color }}
      >
        {faction.name}
      </span>
    </button>
  )
}

// Format bonus text
function formatBonus(key, value) {
  const bonusLabels = {
    defenseBonus: `+${Math.round(value * 100)}% Defense`,
    attackBonus: `+${Math.round(value * 100)}% Attack`,
    buildingCostReduction: `-${Math.round(value * 100)}% Build Cost`,
    movementBonus: `+${value} Movement`,
    productionBonus: `+${Math.round(value * 100)}% Production`,
    supplyBonus: `+${Math.round(value * 100)}% Supply`,
    scavengeBonus: `+${Math.round(value * 100)}% Salvage`,
    territoryIncomeBonus: `+${Math.round(value * 100)}% Territory Income`,
  }
  return bonusLabels[key] || `${key}: ${value}`
}
