// Audio management hook for ambient music

import { useState, useEffect, useRef, useCallback } from 'react'

// Ambient music URL - using a free atmospheric track
// Replace with your own hosted audio file for production
const AMBIENT_MUSIC_URL = 'https://cdn.pixabay.com/audio/2022/10/25/audio_052b24f8e6.mp3'

export function useAudio() {
  const audioRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [isMuted, setIsMuted] = useState(() => {
    // Check localStorage for saved preference
    const saved = localStorage.getItem('fracturedSphere_audioMuted')
    return saved === 'true'
  })

  // Initialize audio on first user interaction
  const initializeAudio = useCallback(() => {
    if (audioRef.current) return audioRef.current

    const audio = new Audio(AMBIENT_MUSIC_URL)
    audio.loop = true
    audio.volume = 0.3
    audio.muted = isMuted
    audioRef.current = audio

    // Handle audio loading errors gracefully
    audio.addEventListener('error', (e) => {
      console.warn('Audio failed to load:', e)
    })

    setIsInitialized(true)
    return audio
  }, [isMuted])

  // Start playing music (called on "Begin Campaign" click)
  const startMusic = useCallback(() => {
    const audio = initializeAudio()
    if (audio && !isPlaying) {
      audio.play()
        .then(() => {
          setIsPlaying(true)
        })
        .catch((e) => {
          console.warn('Audio autoplay blocked:', e)
        })
    }
  }, [initializeAudio, isPlaying])

  // Toggle mute state
  const toggleMute = useCallback(() => {
    const newMuted = !isMuted
    setIsMuted(newMuted)
    localStorage.setItem('fracturedSphere_audioMuted', String(newMuted))
    
    if (audioRef.current) {
      audioRef.current.muted = newMuted
    }
  }, [isMuted])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  return {
    isPlaying,
    isInitialized,
    isMuted,
    startMusic,
    toggleMute,
  }
}
