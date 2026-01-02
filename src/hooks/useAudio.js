// Audio management hook

import { useState, useEffect, useRef, useCallback } from 'react'

// Free ambient music (replace with your own track if desired)
const AMBIENT_MUSIC_URL = 'https://cdn.pixabay.com/audio/2024/02/14/audio_8e2ef3d8db.mp3'

export function useAudio() {
  const audioRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [isMuted, setIsMuted] = useState(() => {
    // Load mute preference from localStorage
    if (typeof window !== 'undefined') {
      return localStorage.getItem('audioMuted') === 'true'
    }
    return false
  })
  
  // Initialize audio element
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio(AMBIENT_MUSIC_URL)
      audioRef.current.loop = true
      audioRef.current.volume = 0.3
      audioRef.current.muted = isMuted
    }
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])
  
  // Start music (call this on user interaction)
  const startMusic = useCallback(() => {
    if (audioRef.current && !isPlaying) {
      audioRef.current.play()
        .then(() => {
          setIsPlaying(true)
          setIsInitialized(true)
        })
        .catch(err => {
          console.log('Audio autoplay blocked:', err)
        })
    }
  }, [isPlaying])
  
  // Toggle mute
  const toggleMute = useCallback(() => {
    const newMuted = !isMuted
    setIsMuted(newMuted)
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('audioMuted', String(newMuted))
    }
    
    if (audioRef.current) {
      audioRef.current.muted = newMuted
    }
  }, [isMuted])
  
  return {
    isPlaying,
    isInitialized,
    isMuted,
    startMusic,
    toggleMute,
  }
}

export default useAudio
