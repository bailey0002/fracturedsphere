// TurnBar - kept for desktop/larger screens
// Mobile uses inline controls in GameBoard

import { PHASES, PHASE_ORDER, getCurrentSeason } from '../hooks/useGameState'

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
    <div className="flex items-center justify-between gap-4 p-3 bg-void-900 border border-steel-light/20 rounded">
      {/* Turn info */}
      <div className="flex items-center gap-3">
        <span className="font-display text-lg text-steel-bright">T{turn}</span>
        <span className="text-xs text-steel-light/60">{season.name}</span>
      </div>
      
      {/* Phase indicators */}
      <div className="flex items-center gap-1">
        {PHASE_ORDER.map((p, index) => (
          <div
            key={p}
            className={`
              px-2 py-1 rounded text-xs flex items-center gap-1
              ${index === phaseIndex 
                ? 'bg-continuity/30 text-continuity border border-continuity/50' 
                : index < phaseIndex
                  ? 'text-steel-light/40'
                  : 'text-steel-light/20'
              }
            `}
          >
            <span>{PHASE_ICONS[p]}</span>
            <span className="hidden sm:inline">{PHASE_LABELS[p]}</span>
          </div>
        ))}
      </div>
      
      {/* Controls */}
      <div className="flex items-center gap-2">
        <button onClick={onAdvancePhase} className="btn-primary text-xs py-1.5 px-3">
          Next
        </button>
        <button 
          onClick={onEndTurn}
          className="btn bg-warning/20 text-warning border-warning/30 text-xs py-1.5 px-3"
        >
          End
        </button>
      </div>
    </div>
  )
}
