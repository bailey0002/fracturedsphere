// Audio management hook for ambient music

import { useState, useEffect, useRef, useCallback } from 'react'

// Free ambient music - dark atmospheric sci-fi
// Using a reliable CDN source
const AMBIENT_MUSIC_URL = 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0c6ff1bab.mp3'

export function useAudio() {
  const audioRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [isMuted, setIsMuted] = useState(() => {
    try {
      const saved = localStorage.getItem('fracturedSphere_audioMuted')
      return saved === 'true'
    } catch {
      return false
    }
  })

  const initializeAudio = useCallback(() => {
    if (audioRef.current) return audioRef.current

    const audio = new Audio(AMBIENT_MUSIC_URL)
    audio.loop = true
    audio.volume = 0.25
    audio.muted = isMuted
    audio.crossOrigin = 'anonymous'
    audioRef.current = audio

    audio.addEventListener('error', (e) => {
      console.warn('Audio failed to load:', e.target.error)
    })

    audio.addEventListener('canplaythrough', () => {
      console.log('Audio loaded and ready')
    })

    setIsInitialized(true)
    return audio
  }, [isMuted])

  const startMusic = useCallback(() => {
    const audio = initializeAudio()
    if (audio && !isPlaying) {
      // Small delay helps with mobile autoplay
      setTimeout(() => {
        audio.play()
          .then(() => {
            setIsPlaying(true)
            console.log('Audio playing')
          })
          .catch((e) => {
            console.warn('Audio play failed:', e.message)
            // Still mark as initialized so speaker button shows
            setIsPlaying(false)
          })
      }, 100)
    }
  }, [initializeAudio, isPlaying])

  const toggleMute = useCallback(() => {
    const newMuted = !isMuted
    setIsMuted(newMuted)
    
    try {
      localStorage.setItem('fracturedSphere_audioMuted', String(newMuted))
    } catch {
      // localStorage might not be available
    }
    
    if (audioRef.current) {
      audioRef.current.muted = newMuted
      
      // If unmuting and not playing, try to play
      if (!newMuted && !isPlaying) {
        audioRef.current.play()
          .then(() => setIsPlaying(true))
          .catch(() => {})
      }
    }
  }, [isMuted, isPlaying])

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
