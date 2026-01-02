// Audio control - speaker toggle button

import { useAudio } from '../hooks/useAudio'

export default function AudioControl() {
  const { isInitialized, isMuted, toggleMute } = useAudio()
  
  // Don't show until audio is initialized
  if (!isInitialized) return null
  
  return (
    <button
      onClick={toggleMute}
      className="p-2 rounded-lg bg-void-900/80 border border-steel-light/20 
                 hover:bg-steel/20 transition-colors text-steel-light"
      title={isMuted ? 'Unmute' : 'Mute'}
      aria-label={isMuted ? 'Unmute audio' : 'Mute audio'}
    >
      {isMuted ? (
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          className="w-4 h-4"
        >
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <line x1="23" y1="9" x2="17" y2="15" />
          <line x1="17" y1="9" x2="23" y2="15" />
        </svg>
      ) : (
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          className="w-4 h-4"
        >
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
        </svg>
      )}
    </button>
  )
}
