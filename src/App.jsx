// App.jsx - Main application for The Fractured Sphere
// Wires up game state, chronicle, AI, and components

import { useState, useCallback } from 'react'
import { useGameState } from './hooks/useGameState'
import { useChronicle, CHRONICLE_TYPES } from './hooks/useChronicle'
import { useAI } from './hooks/useAI'
import FactionSelect from './components/FactionSelect'
import GameBoard from './components/GameBoard'

export default function App() {
  const [showFactionSelect, setShowFactionSelect] = useState(true)
  
  // Initialize game state hook
  const { state, actions, computed } = useGameState()
  
  // Initialize chronicle hook
  const chronicle = useChronicle()
  
  // Initialize AI hook (pass chronicle for logging)
  useAI(state, actions, { ...chronicle, CHRONICLE_TYPES })
  
  // Handle faction selection
  const handleFactionSelect = useCallback((factionId) => {
    // Start the game
    actions.startGame(factionId)
    
    // Add initial chronicle entry
    chronicle.addEntry(CHRONICLE_TYPES.SYSTEM, {
      message: 'The campaign begins...',
      faction: factionId,
    }, { important: true, speak: true })
    
    // Hide faction select
    setShowFactionSelect(false)
  }, [actions, chronicle])
  
  // Show faction select screen if game hasn't started
  if (showFactionSelect || !state.gameStarted) {
    return <FactionSelect onSelect={handleFactionSelect} />
  }
  
  // Main game
  return (
    <GameBoard
      state={state}
      actions={actions}
      computed={computed}
      chronicle={chronicle}
    />
  )
}
