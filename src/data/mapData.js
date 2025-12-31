// Map data and generation for The Fractured Sphere

import { hexId, generateHexMap, hexDistance, getHexNeighbors } from '../utils/hexMath'
import { TERRAIN_TYPES } from './terrain'
import { FACTIONS } from './factions'

// Map configuration
export const MAP_CONFIG = {
  radius: 3, // Creates 37 hexes (1 + 6 + 12 + 18)
  hexSize: 50, // Pixel size of hexes
}

// Starting positions for factions (at cardinal edges)
export const FACTION_STARTS = {
  continuity: { q: 0, r: -3 },   // North
  ascendant: { q: 3, r: 0 },     // East  
  collective: { q: 0, r: 3 },    // South
  reclaimers: { q: -3, r: 0 },   // West
}

// Terrain distribution weights
const TERRAIN_WEIGHTS = {
  plains: 35,
  urban: 15,
  forest: 20,
  mountain: 10,
  coastal: 10,
  anomaly: 5,
  relay: 5,
}

// Seeded random for reproducible maps
function seededRandom(seed) {
  const x = Math.sin(seed++) * 10000
  return x - Math.floor(x)
}

// Select terrain based on weights
function selectTerrain(seed, position) {
  const { q, r } = position
  const distFromCenter = hexDistance(q, r, 0, 0)
  
  // Center hex is always urban (capital-worthy)
  if (distFromCenter === 0) return 'urban'
  
  // Faction starting positions get urban terrain
  for (const [factionId, pos] of Object.entries(FACTION_STARTS)) {
    if (q === pos.q && r === pos.r) return 'urban'
  }
  
  // Mountains more likely at edges
  const edgeBias = distFromCenter / MAP_CONFIG.radius
  
  // Calculate weighted random
  let totalWeight = 0
  const adjustedWeights = {}
  
  for (const [terrain, weight] of Object.entries(TERRAIN_WEIGHTS)) {
    let adjusted = weight
    if (terrain === 'mountain') adjusted *= (1 + edgeBias)
    if (terrain === 'anomaly') adjusted *= edgeBias
    if (terrain === 'coastal' && distFromCenter < 2) adjusted *= 0.3
    adjustedWeights[terrain] = adjusted
    totalWeight += adjusted
  }
  
  const roll = seededRandom(seed + q * 100 + r) * totalWeight
  let cumulative = 0
  
  for (const [terrain, weight] of Object.entries(adjustedWeights)) {
    cumulative += weight
    if (roll <= cumulative) return terrain
  }
  
  return 'plains'
}

// Generate initial hex data
export function generateMapData(seed = 42) {
  const hexes = generateHexMap(MAP_CONFIG.radius)
  const mapData = {}
  
  hexes.forEach((hex, index) => {
    const id = hexId(hex.q, hex.r)
    const terrain = selectTerrain(seed + index, hex)
    
    // Determine initial ownership
    let owner = null
    let isCapital = false
    
    for (const [factionId, pos] of Object.entries(FACTION_STARTS)) {
      if (hex.q === pos.q && hex.r === pos.r) {
        owner = factionId
        isCapital = true
        break
      }
    }
    
    mapData[id] = {
      id,
      q: hex.q,
      r: hex.r,
      terrain,
      owner,
      isCapital,
      buildings: [],
      units: [],
      visible: {}, // { factionId: true/false }
      explored: {}, // { factionId: true/false }
      resources: { ...TERRAIN_TYPES[terrain].resourceYield },
      supplyLevel: owner ? 1.0 : 0,
      contested: false,
    }
  })
  
  // Set initial visibility for faction capitals
  for (const [factionId, pos] of Object.entries(FACTION_STARTS)) {
    const capitalId = hexId(pos.q, pos.r)
    
    // Capital and neighbors are visible
    mapData[capitalId].visible[factionId] = true
    mapData[capitalId].explored[factionId] = true
    
    const neighbors = getHexNeighbors(pos.q, pos.r)
    neighbors.forEach(n => {
      const nId = hexId(n.q, n.r)
      if (mapData[nId]) {
        mapData[nId].visible[factionId] = true
        mapData[nId].explored[factionId] = true
      }
    })
  }
  
  return mapData
}

// Get hex by coordinates
export function getHex(mapData, q, r) {
  return mapData[hexId(q, r)] || null
}

// Get all hexes owned by a faction
export function getFactionHexes(mapData, factionId) {
  return Object.values(mapData).filter(hex => hex.owner === factionId)
}

// Get faction capital
export function getFactionCapital(mapData, factionId) {
  return Object.values(mapData).find(hex => hex.owner === factionId && hex.isCapital)
}

// Calculate territory count
export function getTerritoryCount(mapData, factionId) {
  return Object.values(mapData).filter(hex => hex.owner === factionId).length
}

// Check if hex is adjacent to faction territory
export function isAdjacentToFaction(mapData, q, r, factionId) {
  const neighbors = getHexNeighbors(q, r)
  return neighbors.some(n => {
    const hex = mapData[hexId(n.q, n.r)]
    return hex && hex.owner === factionId
  })
}

// Update visibility for a faction based on their units and buildings
export function updateFactionVisibility(mapData, factionId, units) {
  // Reset current visibility (keep explored)
  Object.values(mapData).forEach(hex => {
    hex.visible[factionId] = false
  })
  
  // Owned hexes are always visible
  Object.values(mapData).forEach(hex => {
    if (hex.owner === factionId) {
      hex.visible[factionId] = true
      hex.explored[factionId] = true
      
      // Adjacent hexes too
      const neighbors = getHexNeighbors(hex.q, hex.r)
      neighbors.forEach(n => {
        const nHex = mapData[hexId(n.q, n.r)]
        if (nHex) {
          nHex.visible[factionId] = true
          nHex.explored[factionId] = true
        }
      })
    }
  })
  
  // Unit sight ranges
  units.filter(u => u.owner === factionId).forEach(unit => {
    const sightRange = unit.stats?.sight || 2
    for (let dist = 0; dist <= sightRange; dist++) {
      // Simple circle - could use proper FOV later
      Object.values(mapData).forEach(hex => {
        if (hexDistance(unit.q, unit.r, hex.q, hex.r) <= dist) {
          hex.visible[factionId] = true
          hex.explored[factionId] = true
        }
      })
    }
  })
  
  return mapData
}

// Initial resources for each faction
export const STARTING_RESOURCES = {
  gold: 200,
  iron: 100,
  grain: 150,
  influence: 10,
}

// Season definitions
export const SEASONS = {
  spring: {
    id: 'spring',
    name: 'Spring',
    description: 'Growth season. Increased grain production.',
    effects: {
      grainProduction: 1.25,
      movementCost: 1.0,
    },
    duration: 5, // turns
  },
  summer: {
    id: 'summer',
    name: 'Summer',
    description: 'Campaign season. Normal operations.',
    effects: {
      grainProduction: 1.0,
      movementCost: 1.0,
    },
    duration: 5,
  },
  autumn: {
    id: 'autumn',
    name: 'Autumn',
    description: 'Harvest. Bonus gold from trade.',
    effects: {
      grainProduction: 1.5,
      goldProduction: 1.2,
      movementCost: 1.0,
    },
    duration: 5,
  },
  winter: {
    id: 'winter',
    name: 'Winter',
    description: 'Harsh conditions. Reduced movement and attrition.',
    effects: {
      grainProduction: 0.5,
      movementCost: 1.5,
      attrition: 0.05, // 5% unit loss per turn without supply
    },
    duration: 5,
  },
}

export const SEASON_ORDER = ['spring', 'summer', 'autumn', 'winter']

// Get current season based on turn
export function getCurrentSeason(turn) {
  const totalTurns = Object.values(SEASONS).reduce((sum, s) => sum + s.duration, 0)
  const turnInYear = turn % totalTurns
  
  let accumulated = 0
  for (const seasonId of SEASON_ORDER) {
    accumulated += SEASONS[seasonId].duration
    if (turnInYear < accumulated) {
      return SEASONS[seasonId]
    }
  }
  return SEASONS.spring
}

// Victory conditions
export const VICTORY_CONDITIONS = {
  domination: {
    id: 'domination',
    name: 'Domination',
    description: 'Control 75% of all territories',
    check: (mapData, factionId) => {
      const total = Object.keys(mapData).length
      const owned = getTerritoryCount(mapData, factionId)
      return owned / total >= 0.75
    },
  },
  economic: {
    id: 'economic',
    name: 'Economic Victory',
    description: 'Accumulate 1000 gold while controlling 50% of territories',
    check: (mapData, factionId, resources) => {
      const total = Object.keys(mapData).length
      const owned = getTerritoryCount(mapData, factionId)
      return resources.gold >= 1000 && owned / total >= 0.5
    },
  },
  elimination: {
    id: 'elimination',
    name: 'Elimination',
    description: 'Eliminate all other factions (capture all capitals)',
    check: (mapData, factionId) => {
      const otherCapitals = Object.values(mapData).filter(
        hex => hex.isCapital && hex.owner !== factionId && hex.owner !== null
      )
      return otherCapitals.length === 0
    },
  },
}
