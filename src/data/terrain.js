// Terrain and building definitions for The Fractured Sphere

export const TERRAIN_TYPES = {
  plains: {
    id: 'plains',
    name: 'Open Wastes',
    description: 'Flat, exposed terrain. No cover, maximum mobility.',
    color: '#2a2a35',
    patternColor: '#35353f',
    movementCost: 1,
    defenseModifier: 0,
    supplyModifier: 1.0,
    canBuild: ['farm', 'mine', 'market', 'fortress', 'academy'],
    resourceYield: { gold: 1, iron: 1, grain: 2 },
  },

  urban: {
    id: 'urban',
    name: 'Hab-Cluster',
    description: 'Dense population center. High value, difficult to assault.',
    color: '#3a3a45',
    patternColor: '#454550',
    movementCost: 1,
    defenseModifier: 0.3,
    supplyModifier: 1.2,
    canBuild: ['market', 'fortress', 'academy'],
    resourceYield: { gold: 3, iron: 0, grain: 1 },
    specialRules: ['civilian_presence'],
  },

  forest: {
    id: 'forest',
    name: 'Bio-Dome',
    description: 'Artificial ecosystem. Provides cover and resources.',
    color: '#2a3a2a',
    patternColor: '#3a4a3a',
    movementCost: 2,
    defenseModifier: 0.2,
    supplyModifier: 0.9,
    canBuild: ['farm'],
    resourceYield: { gold: 0, iron: 0, grain: 3 },
    combatModifiers: {
      ground: { defense: 0.15 },
      armor: { attack: -0.1, movement: -1 },
    },
  },

  mountain: {
    id: 'mountain',
    name: 'Structural Ridge',
    description: 'Elevated position. Excellent defense, limited access.',
    color: '#4a4a55',
    patternColor: '#5a5a65',
    movementCost: 3,
    defenseModifier: 0.4,
    supplyModifier: 0.7,
    canBuild: ['fortress', 'relay'],
    resourceYield: { gold: 0, iron: 3, grain: 0 },
    combatModifiers: {
      ground: { defense: 0.2 },
      air: { attack: -0.15 },
      armor: { movement: -2 },
    },
  },

  coastal: {
    id: 'coastal',
    name: 'Port Sector',
    description: 'Access to trade routes and naval operations.',
    color: '#2a3a4a',
    patternColor: '#3a4a5a',
    movementCost: 1,
    defenseModifier: 0,
    supplyModifier: 1.3,
    canBuild: ['market', 'port', 'fortress'],
    resourceYield: { gold: 2, iron: 1, grain: 1 },
    specialRules: ['naval_access', 'trade_route'],
  },

  anomaly: {
    id: 'anomaly',
    name: 'Fracture Zone',
    description: 'Unstable region. Unpredictable effects.',
    color: '#4a2a4a',
    patternColor: '#5a3a5a',
    movementCost: 2,
    defenseModifier: 0,
    supplyModifier: 0.5,
    canBuild: [],
    resourceYield: { gold: 0, iron: 2, grain: 0 },
    specialRules: ['anomaly_effects', 'no_construction'],
    combatModifiers: {
      all: { attack: -0.1, defense: -0.1 },
    },
  },

  relay: {
    id: 'relay',
    name: 'Comm Hub',
    description: 'Strategic communication nexus.',
    color: '#3a3a4a',
    patternColor: '#4a4a5a',
    movementCost: 1,
    defenseModifier: 0.1,
    supplyModifier: 1.1,
    canBuild: ['relay', 'academy'],
    resourceYield: { gold: 2, iron: 0, grain: 0 },
    specialRules: ['comm_bonus'],
  },
}

// Building definitions
export const BUILDINGS = {
  farm: {
    id: 'farm',
    name: 'Agri-Dome',
    description: 'Produces grain for population and armies.',
    cost: { gold: 60, iron: 20 },
    buildTime: 2,
    production: { grain: 3 },
    maintenance: { gold: 5 },
    maxPerTerritory: 2,
    effects: {
      populationGrowth: 0.1,
    },
    svgPath: 'M20 70 L50 30 L80 70 L70 70 L70 85 L30 85 L30 70 Z',
  },

  mine: {
    id: 'mine',
    name: 'Extraction Hub',
    description: 'Extracts iron and rare materials.',
    cost: { gold: 80, iron: 30 },
    buildTime: 2,
    production: { iron: 3 },
    maintenance: { gold: 8 },
    maxPerTerritory: 1,
    effects: {},
    svgPath: 'M25 40 L50 20 L75 40 L75 70 L60 70 L60 85 L40 85 L40 70 L25 70 Z',
  },

  market: {
    id: 'market',
    name: 'Trade Exchange',
    description: 'Generates gold through commerce.',
    cost: { gold: 100, iron: 40 },
    buildTime: 2,
    production: { gold: 5 },
    maintenance: { gold: 3 },
    maxPerTerritory: 1,
    effects: {
      tradeBonus: 0.15,
    },
    svgPath: 'M20 50 L40 30 L60 30 L80 50 L80 85 L20 85 Z M35 55 L35 75 L45 75 L45 55 Z M55 55 L55 75 L65 75 L65 55 Z',
  },

  fortress: {
    id: 'fortress',
    name: 'Defense Bastion',
    description: 'Fortifies territory against assault.',
    cost: { gold: 150, iron: 100 },
    buildTime: 3,
    production: {},
    maintenance: { gold: 12 },
    maxPerTerritory: 1,
    effects: {
      defenseBonus: 0.3,
      garrisonCapacity: 3,
    },
    svgPath: 'M20 85 L20 40 L35 40 L35 25 L50 15 L65 25 L65 40 L80 40 L80 85 Z M40 50 L40 65 L60 65 L60 50 Z',
  },

  academy: {
    id: 'academy',
    name: 'War Academy',
    description: 'Trains elite units and provides veterancy bonus.',
    cost: { gold: 120, iron: 60 },
    buildTime: 3,
    production: { influence: 1 },
    maintenance: { gold: 10 },
    maxPerTerritory: 1,
    effects: {
      veterancyBonus: 0.2,
      trainTimeReduction: 0.25,
    },
    svgPath: 'M50 15 L75 35 L75 55 L65 55 L65 85 L35 85 L35 55 L25 55 L25 35 Z M45 45 L45 60 L55 60 L55 45 Z',
  },

  port: {
    id: 'port',
    name: 'Orbital Dock',
    description: 'Enables trade routes and naval units.',
    cost: { gold: 120, iron: 60 },
    buildTime: 2,
    production: { gold: 2 },
    maintenance: { gold: 10 },
    maxPerTerritory: 1,
    requirements: { terrain: ['coastal'] },
    effects: {
      enableNaval: true,
      tradeRoute: true,
      supplyBonus: 0.3,
    },
    svgPath: 'M20 70 L35 50 L65 50 L80 70 L80 80 L20 80 Z M30 55 L30 45 L40 40 L50 45 L50 55 Z',
  },

  relay: {
    id: 'relay',
    name: 'Comm Relay',
    description: 'Extends supply lines and provides intel.',
    cost: { gold: 80, iron: 50 },
    buildTime: 1,
    production: { influence: 1 },
    maintenance: { gold: 8 },
    maxPerTerritory: 1,
    effects: {
      supplyRange: 2,
      sightBonus: 1,
      commandBonus: 0.1,
    },
    svgPath: 'M50 15 L55 40 L75 45 L55 50 L60 80 L50 55 L40 80 L45 50 L25 45 L45 40 Z',
  },
}

// Helper functions
export const getTerrainById = (id) => TERRAIN_TYPES[id] || TERRAIN_TYPES.plains
export const getBuildingById = (id) => BUILDINGS[id] || null

export const canBuildOnTerrain = (buildingId, terrainId) => {
  const terrain = TERRAIN_TYPES[terrainId]
  if (!terrain) return false
  return terrain.canBuild.includes(buildingId)
}

export const calculateTerrainBonus = (terrainId, unitBranch) => {
  const terrain = TERRAIN_TYPES[terrainId]
  if (!terrain || !terrain.combatModifiers) return {}
  return terrain.combatModifiers[unitBranch] || {}
}

export const getResourceColor = (resource) => {
  switch (resource) {
    case 'gold': return '#c4a35a'
    case 'iron': return '#8a9baa'
    case 'grain': return '#6bc78f'
    case 'influence': return '#9b6bc7'
    default: return '#8a9baa'
  }
}
