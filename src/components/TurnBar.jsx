// Turn phase bar - mobile optimized

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
    <div className="panel p-2 sm:p-3">
      {/* Mobile layout: stacked */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        
        {/* Row 1: Turn info + Active phase (mobile) or full phase bar (desktop) */}
        <div className="flex items-center justify-between sm:justify-start sm:gap-4">
          {/* Turn number and season */}
          <div className="flex items-center gap-2">
            <div className="font-display text-base sm:text-lg text-steel-bright">
              T{turn}
            </div>
            <div className="text-xs text-steel-light/70 font-mono hidden sm:block">
              {season.name}
            </div>
          </div>
          
          {/* Mobile: Show ONLY active phase prominently */}
          <div className="sm:hidden flex items-center gap-2 px-3 py-1 bg-continuity/30 rounded border border-continuity/50">
            <span className="text-base">{PHASE_ICONS[phase]}</span>
            <span className="font-display text-xs tracking-wider uppercase text-steel-bright">
              {PHASE_LABELS[phase]}
            </span>
            <span className="text-xs text-steel-light/50">
              ({phaseIndex + 1}/4)
            </span>
          </div>
          
          {/* Desktop: Full phase indicator bar */}
          <div className="hidden sm:flex items-center gap-1">
            {PHASE_ORDER.map((p, index) => {
              const isActive = index === phaseIndex
              const isCompleted = index < phaseIndex
              
              return (
                <div
                  key={p}
                  className={`
                    flex items-center gap-1 px-2 py-1 rounded text-xs
                    transition-all duration-300
                    ${isActive 
                      ? 'bg-continuity/30 text-steel-bright border border-continuity/50' 
                      : isCompleted 
                        ? 'bg-steel/20 text-steel-light/50'
                        : 'text-steel-light/30'
                    }
                  `}
                >
                  <span>{PHASE_ICONS[p]}</span>
                  <span className="font-display tracking-wider uppercase hidden lg:inline">
                    {PHASE_LABELS[p]}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
        
        {/* Row 2 (mobile) / inline (desktop): Action buttons */}
        <div className="flex items-center gap-2 justify-end">
          <button
            onClick={onAdvancePhase}
            className="btn-primary text-xs sm:text-sm py-1.5 px-3"
          >
            Next
          </button>
          
          <button
            onClick={onEndTurn}
            className="btn bg-warning/20 text-warning border-warning/30 hover:bg-warning/30 text-xs sm:text-sm py-1.5 px-3"
          >
            End Turn
          </button>
        </div>
      </div>
    </div>
  )
}
