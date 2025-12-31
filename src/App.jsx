// Main application component

import { useState, useCallback } from 'react'
import { useGameState } from './hooks/useGameState'
import FactionSelect from './components/FactionSelect'
import GameBoard from './components/GameBoard'

// Game screens
const SCREENS = {
  TITLE: 'title',
  FACTION_SELECT: 'faction_select',
  GAME: 'game',
}

function TitleScreen({ onStart }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-void-950">
      {/* Background effects */}
      <div className="absolute inset-0 bg-radial-glow opacity-30" />
      
      {/* Scan line effect */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="w-full h-1 bg-steel-light/5 animate-scan-line" />
      </div>
      
      <div className="relative z-10 text-center">
        {/* Logo/Title */}
        <div className="mb-12">
          <h1 className="font-display text-5xl md:text-7xl tracking-[0.4em] text-steel-bright mb-4 animate-fade-in">
            THE FRACTURED
          </h1>
          <h1 className="font-display text-5xl md:text-7xl tracking-[0.4em] text-continuity animate-fade-in" style={{ animationDelay: '0.2s' }}>
            SPHERE
          </h1>
        </div>
        
        {/* Subtitle */}
        <p className="font-body text-lg text-steel-light/60 mb-12 animate-fade-in" style={{ animationDelay: '0.4s' }}>
          A game of strategy in the ruins of a Dyson sphere
        </p>
        
        {/* Start button */}
        <button
          onClick={onStart}
          className="
            px-12 py-4 font-display text-lg tracking-widest uppercase
            border-2 border-steel-light/50 text-steel-bright
            rounded transition-all duration-300
            hover:border-continuity hover:text-continuity hover:bg-continuity/10
            hover:shadow-glow-md
            animate-fade-in
          "
          style={{ animationDelay: '0.6s' }}
        >
          Begin
        </button>
        
        {/* Version */}
        <div className="mt-12 text-xs font-mono text-steel-light/30 animate-fade-in" style={{ animationDelay: '0.8s' }}>
          v0.2.0 — Phase 2 Build
        </div>
      </div>
      
      {/* Decorative elements */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-4">
        {['continuity', 'ascendant', 'collective', 'reclaimers'].map((faction, i) => (
          <div
            key={faction}
            className={`w-2 h-2 rounded-full bg-${faction} opacity-50 animate-pulse`}
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>
    </div>
  )
}

export default function App() {
  const [screen, setScreen] = useState(SCREENS.TITLE)
  const { state, actions, dispatch } = useGameState()
  
  const handleStart = useCallback(() => {
    setScreen(SCREENS.FACTION_SELECT)
  }, [])
  
  const handleSelectFaction = useCallback((factionId) => {
    actions.startGame(factionId)
    setScreen(SCREENS.GAME)
  }, [actions])
  
  // Render based on current screen
  switch (screen) {
    case SCREENS.TITLE:
      return <TitleScreen onStart={handleStart} />
    
    case SCREENS.FACTION_SELECT:
      return <FactionSelect onSelectFaction={handleSelectFaction} />
    
    case SCREENS.GAME:
      return <GameBoard state={state} actions={actions} dispatch={dispatch} />
    
    default:
      return <TitleScreen onStart={handleStart} />
  }
}
