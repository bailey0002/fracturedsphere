// Chronicle - Narrative console for The Fractured Sphere
// Displays game events as a scrollable log with optional voice narration

import { useRef, useEffect, memo } from 'react'
import { CHRONICLE_TYPES } from '../hooks/useChronicle'

// Entry type styling
const TYPE_STYLES = {
  [CHRONICLE_TYPES.TURN_START]: 'text-amber-400 font-semibold',
  [CHRONICLE_TYPES.PHASE_CHANGE]: 'text-steel-bright font-medium',
  [CHRONICLE_TYPES.COMBAT_RESULT]: 'text-red-400',
  [CHRONICLE_TYPES.CAPTURE]: 'text-emerald-400',
  [CHRONICLE_TYPES.INCOME]: 'text-green-400',
  [CHRONICLE_TYPES.BUILD_COMPLETE]: 'text-blue-400',
  [CHRONICLE_TYPES.UNIT_TRAINED]: 'text-cyan-400',
  [CHRONICLE_TYPES.UNIT_MOVE]: 'text-steel-light/70',
  [CHRONICLE_TYPES.DIPLOMACY]: 'text-purple-400',
  [CHRONICLE_TYPES.VICTORY]: 'text-yellow-400 font-bold',
  [CHRONICLE_TYPES.SYSTEM]: 'text-steel-light/60 italic',
}

// Individual chronicle entry
const ChronicleEntry = memo(function ChronicleEntry({ entry }) {
  const style = TYPE_STYLES[entry.type] || 'text-steel-light/80'
  
  return (
    <div className={`chronicle-entry py-1 ${style}`}>
      {entry.important && (
        <span className="text-amber-500 mr-1">▸</span>
      )}
      <span>{entry.text}</span>
    </div>
  )
})

// Chronicle component
export default function Chronicle({ 
  entries = [], 
  voiceEnabled = false, 
  voiceReady = false,
  onVoiceToggle,
  maxHeight = '200px',
}) {
  const logRef = useRef(null)
  
  // Auto-scroll to bottom on new entries
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [entries.length])
  
  return (
    <div className="chronicle flex flex-col bg-void-950/90 border border-steel-light/20 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="chronicle-header flex items-center justify-between px-3 py-2 border-b border-steel-light/20 bg-void-900/50">
        <span className="text-xs font-display tracking-widest uppercase text-steel-light">
          ⟨ The Chronicle ⟩
        </span>
        
        {/* Voice toggle button */}
        <button
          onPointerUp={onVoiceToggle}
          className={`
            w-8 h-8 flex items-center justify-center rounded
            transition-all duration-200
            ${voiceEnabled 
              ? 'text-amber-400 bg-amber-400/10' 
              : 'text-steel-light/50 hover:text-steel-light hover:bg-steel-light/10'
            }
            ${!voiceReady ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
          disabled={!voiceReady}
          title={voiceEnabled ? 'Disable voice narration' : 'Enable voice narration'}
          style={{ touchAction: 'manipulation' }}
        >
          {voiceEnabled ? '🔊' : '🔇'}
        </button>
      </div>
      
      {/* Log area */}
      <div 
        ref={logRef}
        className="chronicle-log flex-1 overflow-y-auto px-3 py-2 text-sm font-mono"
        style={{ 
          maxHeight,
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {entries.length === 0 ? (
          <div className="text-steel-light/40 italic text-center py-4">
            The Chronicle awaits...
          </div>
        ) : (
          entries.map((entry) => (
            <ChronicleEntry key={entry.id} entry={entry} />
          ))
        )}
      </div>
    </div>
  )
}
