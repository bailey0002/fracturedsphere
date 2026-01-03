// Chronicle system for The Fractured Sphere
// Manages narrative log entries and optional voice synthesis

import { useState, useCallback, useRef, useEffect } from 'react'
import { FACTIONS } from '../data/factions'

// Chronicle entry types
export const CHRONICLE_TYPES = {
  TURN_START: 'turn_start',
  PHASE_CHANGE: 'phase_change',
  UNIT_MOVE: 'unit_move',
  ATTACK_DECLARED: 'attack_declared',
  COMBAT_RESULT: 'combat_result',
  BUILD_COMPLETE: 'build_complete',
  UNIT_TRAINED: 'unit_trained',
  INCOME: 'income',
  CAPTURE: 'capture',
  DIPLOMACY: 'diplomacy',
  VICTORY: 'victory',
  SYSTEM: 'system',
}

// Narrative templates by type and faction
const NARRATIVE_TEMPLATES = {
  turn_start: {
    continuity: [
      "Cycle {turn}. The Preservation Council convenes.",
      "Turn {turn}. Continuity endures through vigilance.",
      "Cycle {turn} begins. The old ways guide us forward.",
    ],
    ascendant: [
      "Cycle {turn}. The Ascendant hunger for transcendence.",
      "Turn {turn}. Destiny awaits those bold enough to seize it.",
      "Cycle {turn} begins. Evolution demands sacrifice.",
    ],
    collective: [
      "Cycle {turn}. The Collective processes... adapts... expands.",
      "Turn {turn}. Unity of purpose. Unity of action.",
      "Cycle {turn} begins. All minds converge on victory.",
    ],
    reclaimers: [
      "Cycle {turn}. The Reclaimers survey the wreckage of gods.",
      "Turn {turn}. Salvage is survival. Survival is victory.",
      "Cycle {turn} begins. What was lost shall be reclaimed.",
    ],
    generic: [
      "Turn {turn} begins.",
      "Cycle {turn} commences.",
    ],
  },
  
  phase_change: {
    command: [
      "⟨ COMMAND PHASE ⟩ Issue your orders.",
      "The war council awaits your directives.",
      "Command authority transferred. Awaiting orders.",
    ],
    conflict: [
      "⟨ CONFLICT PHASE ⟩ Engage the enemy.",
      "Battle stations. All forces on alert.",
      "Combat protocols engaged. Select your targets.",
    ],
    maneuver: [
      "⟨ MANEUVER PHASE ⟩ Reposition forces.",
      "Non-combat movement authorized.",
      "Strategic repositioning underway.",
    ],
  },
  
  combat_result: {
    victory_decisive: [
      "Decisive victory at {location}! {winner} forces overwhelm the defenders.",
      "The battle for {location} ends in total victory. {loser} forces routed.",
      "{location} falls! {winner} claims the field without contest.",
    ],
    victory_close: [
      "Victory at {location}, but at heavy cost.",
      "A pyrrhic triumph. {location} is ours, but the price was steep.",
      "{winner} prevails at {location} after fierce resistance.",
    ],
    defeat: [
      "Defeat at {location}. Our forces have been repelled.",
      "The assault on {location} has failed. Fall back and regroup.",
      "{location} holds against our assault. Casualties are significant.",
    ],
  },
  
  capture: [
    "{faction} claims {location}. The banner rises over new territory.",
    "{location} falls under {faction} control.",
    "Territory secured: {location} now belongs to {faction}.",
  ],
  
  unit_move: [
    "{unit} advances to {destination}.",
    "{unit} repositions to {destination}.",
    "Movement complete: {unit} at {destination}.",
  ],
  
  income: [
    "Resource convoys arrive: +{gold} gold, +{iron} iron, +{grain} grain.",
    "Tribute collected from {territories} territories.",
    "The treasury grows: +{gold} gold from loyal subjects.",
  ],
  
  build_complete: [
    "{building} construction complete at {location}.",
    "New {building} operational in {location}.",
    "{location} now hosts a {building}.",
  ],
  
  unit_trained: [
    "{unit} ready for deployment at {location}.",
    "New {unit} mustered from {location}.",
    "Reinforcements: {unit} joins the war effort.",
  ],
  
  system: [
    "{message}",
  ],
}

// Interpolate template with data
function interpolate(template, data) {
  return template.replace(/{(\w+)}/g, (match, key) => data[key] ?? match)
}

// Select random template
function selectTemplate(templates) {
  return templates[Math.floor(Math.random() * templates.length)]
}

// Generate narrative text for an entry
export function generateNarrative(type, data = {}) {
  const typeTemplates = NARRATIVE_TEMPLATES[type]
  if (!typeTemplates) return data.message || ''
  
  // Check for faction-specific templates
  if (data.faction && typeTemplates[data.faction]) {
    return interpolate(selectTemplate(typeTemplates[data.faction]), data)
  }
  
  // Check for subtype templates (e.g., combat_result.victory_decisive)
  if (data.subtype && typeTemplates[data.subtype]) {
    return interpolate(selectTemplate(typeTemplates[data.subtype]), data)
  }
  
  // Use generic templates if available
  if (typeTemplates.generic) {
    return interpolate(selectTemplate(typeTemplates.generic), data)
  }
  
  // If templates is an array (not faction-keyed)
  if (Array.isArray(typeTemplates)) {
    return interpolate(selectTemplate(typeTemplates), data)
  }
  
  return data.message || ''
}

// Chronicle hook
export function useChronicle() {
  const [entries, setEntries] = useState([])
  const [voiceEnabled, setVoiceEnabled] = useState(false)
  const [voiceReady, setVoiceReady] = useState(false)
  const synthRef = useRef(null)
  const voicesLoadedRef = useRef(false)
  
  // Initialize speech synthesis
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      return
    }
    
    synthRef.current = window.speechSynthesis
    
    // Load voices (may be async on some browsers)
    const loadVoices = () => {
      const voices = synthRef.current.getVoices()
      if (voices.length > 0) {
        voicesLoadedRef.current = true
        setVoiceReady(true)
      }
    }
    
    loadVoices()
    
    // Chrome loads voices asynchronously
    if (synthRef.current.onvoiceschanged !== undefined) {
      synthRef.current.onvoiceschanged = loadVoices
    }
    
    return () => {
      if (synthRef.current) {
        synthRef.current.cancel()
      }
    }
  }, [])
  
  // Text-to-speech function
  const speak = useCallback((text) => {
    if (!synthRef.current || !voiceReady || !voiceEnabled) return
    
    // Cancel any ongoing speech
    synthRef.current.cancel()
    
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.9
    utterance.pitch = 0.85 // Slightly lower for gravitas
    utterance.volume = 0.8
    
    // Try to find a good voice
    const voices = synthRef.current.getVoices()
    const preferred = voices.find(v =>
      v.name.includes('Daniel') || // macOS
      v.name.includes('Google UK English Male') ||
      v.name.includes('Microsoft David') ||
      (v.lang.startsWith('en') && v.name.toLowerCase().includes('male'))
    ) || voices.find(v => v.lang.startsWith('en'))
    
    if (preferred) {
      utterance.voice = preferred
    }
    
    synthRef.current.speak(utterance)
  }, [voiceReady, voiceEnabled])
  
  // Add a chronicle entry
  const addEntry = useCallback((type, data = {}, options = {}) => {
    const text = generateNarrative(type, data)
    
    const entry = {
      id: Date.now() + Math.random(),
      type,
      text,
      timestamp: new Date(),
      faction: data.faction || null,
      important: options.important || false,
    }
    
    setEntries(prev => [...prev, entry])
    
    // Speak if voice enabled and entry is important
    if (options.important || options.speak) {
      speak(text)
    }
    
    return entry
  }, [speak])
  
  // Add raw text entry (for custom messages)
  const addRawEntry = useCallback((text, type = CHRONICLE_TYPES.SYSTEM, options = {}) => {
    const entry = {
      id: Date.now() + Math.random(),
      type,
      text,
      timestamp: new Date(),
      faction: options.faction || null,
      important: options.important || false,
    }
    
    setEntries(prev => [...prev, entry])
    
    if (options.important || options.speak) {
      speak(text)
    }
    
    return entry
  }, [speak])
  
  // Toggle voice narration
  const toggleVoice = useCallback(() => {
    setVoiceEnabled(prev => {
      const newValue = !prev
      // If enabling, speak a confirmation
      if (newValue && synthRef.current && voiceReady) {
        const utterance = new SpeechSynthesisUtterance("Voice narration enabled.")
        utterance.rate = 0.9
        utterance.pitch = 0.85
        synthRef.current.speak(utterance)
      }
      return newValue
    })
  }, [voiceReady])
  
  // Clear all entries
  const clearEntries = useCallback(() => {
    setEntries([])
  }, [])
  
  // Stop current speech
  const stopSpeech = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.cancel()
    }
  }, [])
  
  return {
    entries,
    addEntry,
    addRawEntry,
    voiceEnabled,
    voiceReady,
    toggleVoice,
    speak,
    stopSpeech,
    clearEntries,
  }
}

export default useChronicle
