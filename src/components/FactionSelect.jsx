// Faction selection screen

import { useState } from 'react'
import { FACTIONS } from '../data/factions'
import { getFactionImage } from '../assets'

function FactionCard({ faction, isSelected, onSelect }) {
  const emblemImage = getFactionImage(faction.id)
  
  return (
    <button
      onClick={() => onSelect(faction.id)}
      className={`
        relative p-3 sm:p-4 rounded-lg border-2 transition-all duration-300
        text-left w-full
        ${isSelected 
          ? 'border-current bg-current/10' 
          : 'border-steel-light/20 hover:border-steel-light/40 bg-steel/20'
        }
      `}
      style={{ 
        color: faction.color,
        borderColor: isSelected ? faction.color : undefined,
      }}
    >
      {/* Emblem and name */}
      <div className="flex items-center gap-3 sm:gap-4 mb-2 sm:mb-3">
        {emblemImage ? (
          <img 
            src={emblemImage} 
            alt={`${faction.name} emblem`}
            className="w-12 h-12 sm:w-16 sm:h-16 object-contain drop-shadow-lg"
          />
        ) : (
          <span className="text-2xl sm:text-3xl">{faction.emblem}</span>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-base sm:text-lg tracking-wide text-steel-bright truncate">
            {faction.name}
          </h3>
          <p className="text-xs text-steel-light/60 italic line-clamp-2">
            {faction.description}
          </p>
        </div>
      </div>
      
      {/* Bonuses */}
      <div className="space-y-1 mb-2 sm:mb-3">
        <div className="text-xs uppercase tracking-wider text-steel-light/50">
          Bonuses
        </div>
        <div className="text-xs font-mono text-steel-light">
          {Object.entries(faction.bonuses).map(([key, value]) => (
            <div key={key} className="flex justify-between">
              <span className="truncate mr-2">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
              <span className="text-success flex-shrink-0">
                +{Math.round(value * 100)}%
              </span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Personality */}
      <div className="text-xs">
        <span className="text-steel-light/50">Playstyle: </span>
        <span className="capitalize" style={{ color: faction.color }}>
          {faction.personality}
        </span>
      </div>
      
      {/* Selection indicator */}
      {isSelected && (
        <div 
          className="absolute top-2 right-2 w-3 h-3 rounded-full"
          style={{ backgroundColor: faction.color }}
        />
      )}
    </button>
  )
}

export default function FactionSelect({ onSelectFaction }) {
  const [selectedFaction, setSelectedFaction] = useState(null)
  const [showLore, setShowLore] = useState(false)
  
  const handleConfirm = () => {
    if (selectedFaction) {
      onSelectFaction(selectedFaction)
    }
  }
  
  const selectedFactionData = selectedFaction ? FACTIONS[selectedFaction] : null
  const selectedEmblem = selectedFaction ? getFactionImage(selectedFaction) : null
  
  return (
    <div className="fixed inset-0 bg-void-950 overflow-y-auto overflow-x-hidden -webkit-overflow-scrolling-touch">
      {/* Background effects */}
      <div className="fixed inset-0 bg-radial-glow opacity-50 pointer-events-none" />
      
      <div className="min-h-full flex flex-col items-center justify-start sm:justify-center p-4 sm:p-8">
      
      <div className="relative z-10 max-w-4xl w-full py-4 sm:py-0">
        {/* Title */}
        <div className="text-center mb-6 sm:mb-12">
          <h1 className="font-display text-xl sm:text-3xl md:text-4xl tracking-[0.15em] sm:tracking-[0.3em] text-steel-bright mb-2">
            THE FRACTURED SPHERE
          </h1>
          <p className="text-steel-light/60 font-body text-sm sm:text-base">
            Choose your faction to begin
          </p>
        </div>
        
        {/* Faction grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8">
          {Object.values(FACTIONS).map(faction => (
            <FactionCard
              key={faction.id}
              faction={faction}
              isSelected={selectedFaction === faction.id}
              onSelect={setSelectedFaction}
            />
          ))}
        </div>
        
        {/* Selected faction lore */}
        {selectedFactionData && (
          <div className="panel mb-6 sm:mb-8 animate-fade-in">
            <button
              onClick={() => setShowLore(!showLore)}
              className="w-full flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-3">
                {selectedEmblem && (
                  <img 
                    src={selectedEmblem} 
                    alt="" 
                    className="w-8 h-8 object-contain"
                  />
                )}
                <span className="font-display text-sm tracking-wider uppercase text-steel-light">
                  Faction Lore
                </span>
              </div>
              <span className="text-steel-light/50">
                {showLore ? '▲' : '▼'}
              </span>
            </button>
            
            {showLore && (
              <p className="mt-4 text-steel-light/80 font-body leading-relaxed animate-fade-in text-sm sm:text-base">
                {selectedFactionData.lore}
              </p>
            )}
          </div>
        )}
        
        {/* Confirm button */}
        <div className="flex justify-center pb-4 sm:pb-0">
          <button
            onClick={handleConfirm}
            disabled={!selectedFaction}
            className={`
              px-6 sm:px-8 py-2 sm:py-3 font-display text-xs sm:text-sm tracking-widest uppercase
              rounded border-2 transition-all duration-300
              ${selectedFaction 
                ? 'border-current bg-current/10 hover:bg-current/20' 
                : 'border-steel-light/20 text-steel-light/30 cursor-not-allowed'
              }
            `}
            style={{ 
              color: selectedFactionData?.color || '#8a9baa',
              borderColor: selectedFactionData?.color || undefined,
            }}
          >
            Begin Campaign
          </button>
        </div>
      </div>
      </div>
    </div>
  )
}
