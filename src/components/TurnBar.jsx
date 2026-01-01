// Turn phase indicator and controls

import { PHASES, PHASE_ORDER } from '../hooks/useGameState'
import { getCurrentSeason } from '../data/mapData'

const PHASE_LABELS = {
  [PHASES.PRODUCTION]: 'Production',
  [PHASES.DIPLOMACY]: 'Diplomacy',
  [PHASES.MOVEMENT]: 'Movement',
  [PHASES.COMBAT]: 'Combat',
}

const PHASE_ICONS = {
  [PHASES.PRODUCTION]: '⚙',
  [PHASES.DIPLOMACY]: '🤝',
  [PHASES.MOVEMENT]: '→',
  [PHASES.COMBAT]: '⚔',
}

export default function TurnBar({ 
  turn, 
  phase, 
  phaseIndex,
  onAdvancePhase,
  onEndTurn,
}) {
  const season = getCurrentSeason(turn)
  
  return (
    <div className="panel flex items-center justify-between gap-4">
      {/* Turn and season info */}
      <div className="flex items-center gap-4">
        <div>
          <div className="font-display text-lg text-steel-bright">
            Turn {turn}
          </div>
          <div className="text-xs text-steel-light font-mono">
            {season.name}
          </div>
        </div>
        
        {/* Season effect indicator */}
        <div className="text-xs text-steel-light/70 max-w-[150px]">
          {season.description}
        </div>
      </div>
      
      {/* Phase indicator */}
      <div className="flex items-center gap-2">
        {PHASE_ORDER.map((p, index) => {
          const isActive = index === phaseIndex
          const isCompleted = index < phaseIndex
          
          return (
            <div
              key={p}
              className={`
                flex items-center gap-1 px-3 py-1 rounded
                transition-all duration-300
                ${isActive 
                  ? 'bg-steel text-steel-bright' 
                  : isCompleted 
                    ? 'bg-steel/30 text-steel-light/60'
                    : 'text-steel-light/30'
                }
              `}
            >
              <span className="text-sm">{PHASE_ICONS[p]}</span>
              <span className="font-display text-xs tracking-wider uppercase">
                {PHASE_LABELS[p]}
              </span>
            </div>
          )
        })}
      </div>
      
      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onAdvancePhase}
          className="btn-primary"
        >
          Next Phase
        </button>
        
        <button
          onClick={onEndTurn}
          className="btn bg-warning/20 text-warning border-warning/30 hover:bg-warning/30"
        >
          End Turn
        </button>
      </div>
    </div>
  )
}
