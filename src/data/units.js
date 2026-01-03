// Unit definitions for The Fractured Sphere

export const UNIT_BRANCHES = {
  GROUND: 'ground',
  AIR: 'air',
  ARMOR: 'armor',
}

export const VETERANCY_LEVELS = {
  GREEN: { id: 'green', name: 'Green', multiplier: 1.0, icon: 'â—‹' },
  TRAINED: { id: 'trained', name: 'Trained', multiplier: 1.15, icon: 'â—' },
  VETERAN: { id: 'veteran', name: 'Veteran', multiplier: 1.3, icon: 'â—' },
  ELITE: { id: 'elite', name: 'Elite', multiplier: 1.5, icon: 'â—†' },
  LEGENDARY: { id: 'legendary', name: 'Legendary', multiplier: 1.75, icon: 'â˜…' },
}

export const VETERANCY_ORDER = ['green', 'trained', 'veteran', 'elite', 'legendary']

export const EXPERIENCE_THRESHOLDS = {
  trained: 20,
  veteran: 50,
  elite: 100,
  legendary: 200,
}

export const UNITS = {
  // Ground Branch
  infantry: {
    id: 'infantry',
    name: 'Shock Troopers',
    branch: UNIT_BRANCHES.GROUND,
    description: 'Standard infantry unit. Versatile and cost-effective.',
    cost: { gold: 50, iron: 20 },
    upkeep: { gold: 5 },
    trainTime: 1,
    stats: {
      attack: 10,
      defense: 8,
      movement: 2,
      sight: 2,
    },
    abilities: [],
    svgPath: 'M50 20 L60 35 L55 35 L55 70 L65 70 L65 85 L35 85 L35 70 L45 70 L45 35 L40 35 Z',
  },
  
  garrison: {
    id: 'garrison',
    name: 'Garrison Force',
    branch: UNIT_BRANCHES.GROUND,
    description: 'Defensive specialists. Strong in fortified positions.',
    cost: { gold: 40, iron: 30 },
    upkeep: { gold: 4 },
    trainTime: 1,
    stats: {
      attack: 6,
      defense: 14,
      movement: 1,
      sight: 2,
    },
    abilities: ['fortify'],
    svgPath: 'M30 30 L70 30 L70 50 L60 50 L60 85 L40 85 L40 50 L30 50 Z',
  },
  
  cavalry: {
    id: 'cavalry',
    name: 'Strike Cavalry',
    branch: UNIT_BRANCHES.GROUND,
    description: 'Fast attack unit. Excels at flanking maneuvers.',
    cost: { gold: 80, iron: 30 },
    upkeep: { gold: 8 },
    trainTime: 2,
    stats: {
      attack: 14,
      defense: 6,
      movement: 4,
      sight: 3,
    },
    abilities: ['charge', 'flanking'],
    svgPath: 'M25 50 L45 30 L50 35 L55 30 L75 50 L55 45 L55 85 L45 85 L45 45 Z',
  },
  
  // Air Branch
  interceptor: {
    id: 'interceptor',
    name: 'Interceptor Wing',
    branch: UNIT_BRANCHES.AIR,
    description: 'Air superiority fighter. Counters other air units.',
    cost: { gold: 100, iron: 50 },
    upkeep: { gold: 12 },
    trainTime: 2,
    stats: {
      attack: 12,
      defense: 8,
      movement: 5,
      sight: 4,
    },
    abilities: ['air_superiority'],
    svgPath: 'M50 15 L65 50 L55 50 L55 70 L70 85 L50 75 L30 85 L45 70 L45 50 L35 50 Z',
  },
  
  bomber: {
    id: 'bomber',
    name: 'Strike Bomber',
    branch: UNIT_BRANCHES.AIR,
    description: 'Ground attack aircraft. Devastating against structures.',
    cost: { gold: 120, iron: 60 },
    upkeep: { gold: 15 },
    trainTime: 3,
    stats: {
      attack: 18,
      defense: 6,
      movement: 3,
      sight: 3,
    },
    abilities: ['bombing_run', 'anti_structure'],
    svgPath: 'M50 10 L60 30 L80 35 L60 40 L60 70 L75 85 L50 80 L25 85 L40 70 L40 40 L20 35 L40 30 Z',
  },
  
  scout: {
    id: 'scout',
    name: 'Recon Drone',
    branch: UNIT_BRANCHES.AIR,
    description: 'Fast reconnaissance. Reveals fog of war.',
    cost: { gold: 40, iron: 20 },
    upkeep: { gold: 4 },
    trainTime: 1,
    stats: {
      attack: 2,
      defense: 4,
      movement: 6,
      sight: 5,
    },
    abilities: ['scout', 'stealth'],
    svgPath: 'M50 20 L60 40 L55 40 L55 60 L60 60 L50 80 L40 60 L45 60 L45 40 L40 40 Z',
  },
  
  // Armor Branch
  tank: {
    id: 'tank',
    name: 'Main Battle Tank',
    branch: UNIT_BRANCHES.ARMOR,
    description: 'Heavy assault vehicle. High attack and defense.',
    cost: { gold: 150, iron: 100 },
    upkeep: { gold: 18 },
    trainTime: 3,
    stats: {
      attack: 20,
      defense: 16,
      movement: 2,
      sight: 2,
    },
    abilities: ['armored', 'breakthrough'],
    svgPath: 'M20 50 L30 35 L70 35 L80 50 L80 65 L75 70 L25 70 L20 65 Z M35 45 L35 55 L50 55 L50 25 L45 25 L45 45 Z',
  },
  
  walker: {
    id: 'walker',
    name: 'Assault Walker',
    branch: UNIT_BRANCHES.ARMOR,
    description: 'All-terrain mech. Ignores terrain penalties.',
    cost: { gold: 180, iron: 120 },
    upkeep: { gold: 20 },
    trainTime: 4,
    stats: {
      attack: 16,
      defense: 14,
      movement: 3,
      sight: 3,
    },
    abilities: ['all_terrain', 'crushing'],
    svgPath: 'M40 20 L60 20 L60 40 L70 45 L70 60 L60 65 L60 85 L55 85 L55 70 L45 70 L45 85 L40 85 L40 65 L30 60 L30 45 L40 40 Z',
  },
  
  artillery: {
    id: 'artillery',
    name: 'Siege Artillery',
    branch: UNIT_BRANCHES.ARMOR,
    description: 'Long-range bombardment. Cannot move and fire same turn.',
    cost: { gold: 140, iron: 80 },
    upkeep: { gold: 16 },
    trainTime: 3,
    stats: {
      attack: 24,
      defense: 6,
      movement: 1,
      sight: 4,
      range: 3,
    },
    abilities: ['siege', 'indirect_fire'],
    svgPath: 'M25 60 L40 60 L40 50 L35 50 L50 20 L65 50 L60 50 L60 60 L75 60 L75 75 L25 75 Z',
  },
}

// Combat doctrines
export const DOCTRINES = {
  assault: {
    id: 'assault',
    name: 'Assault',
    description: 'Aggressive attack. High risk, high reward.',
    attackModifier: 0.3,
    defenseModifier: -0.2,
    casualtyModifier: 0.2,
    bestAgainst: ['defensive', 'attrition'],
    weakAgainst: ['flanking'],
  },
  defensive: {
    id: 'defensive',
    name: 'Defensive',
    description: 'Hold the line. Minimizes casualties.',
    attackModifier: -0.2,
    defenseModifier: 0.4,
    casualtyModifier: -0.3,
    bestAgainst: ['blitz'],
    weakAgainst: ['siege', 'assault'],
  },
  flanking: {
    id: 'flanking',
    name: 'Flanking',
    description: 'Exploit weaknesses. Requires mobile forces.',
    attackModifier: 0.2,
    defenseModifier: 0,
    casualtyModifier: 0,
    requirements: { minMovement: 3 },
    bestAgainst: ['assault', 'siege'],
    weakAgainst: ['defensive'],
  },
  siege: {
    id: 'siege',
    name: 'Siege',
    description: 'Methodical assault on fortifications.',
    attackModifier: 0.1,
    defenseModifier: 0.2,
    turnsRequired: 2,
    fortificationDamage: 0.5,
    bestAgainst: ['defensive'],
    weakAgainst: ['flanking', 'blitz'],
  },
  blitz: {
    id: 'blitz',
    name: 'Blitz',
    description: 'Lightning assault. First strike advantage.',
    attackModifier: 0.2,
    defenseModifier: -0.3,
    firstStrike: true,
    moraleDamage: 0.3,
    casualtyModifier: 0.15,
    requirements: { minMovement: 2 },
    bestAgainst: ['flanking', 'attrition'],
    weakAgainst: ['defensive'],
  },
  attrition: {
    id: 'attrition',
    name: 'Attrition',
    description: 'Gradual pressure. Low risk, time-consuming.',
    attackModifier: -0.2,
    defenseModifier: 0.1,
    casualtyModifier: -0.4,
    turnsRequired: 3,
    supplyCost: 0.5,
    bestAgainst: ['siege'],
    weakAgainst: ['assault', 'blitz'],
  },
}

// Helper functions
export const getUnitById = (id) => UNITS[id] || null

export const getVeterancyLevel = (experience) => {
  if (experience >= EXPERIENCE_THRESHOLDS.legendary) return VETERANCY_LEVELS.LEGENDARY
  if (experience >= EXPERIENCE_THRESHOLDS.elite) return VETERANCY_LEVELS.ELITE
  if (experience >= EXPERIENCE_THRESHOLDS.veteran) return VETERANCY_LEVELS.VETERAN
  if (experience >= EXPERIENCE_THRESHOLDS.trained) return VETERANCY_LEVELS.TRAINED
  return VETERANCY_LEVELS.GREEN
}

export const calculateUnitStrength = (unit, veterancy = 'green') => {
  const baseStats = UNITS[unit.type]
  const vetLevel = VETERANCY_LEVELS[veterancy.toUpperCase()] || VETERANCY_LEVELS.GREEN
  
  return {
    attack: Math.floor(baseStats.stats.attack * vetLevel.multiplier),
    defense: Math.floor(baseStats.stats.defense * vetLevel.multiplier),
  }
}

export const getBranchColor = (branch) => {
  switch (branch) {
    case UNIT_BRANCHES.GROUND: return '#4a9b6b'
    case UNIT_BRANCHES.AIR: return '#c4a35a'
    case UNIT_BRANCHES.ARMOR: return '#4a7c9b'
    default: return '#8a9baa'
  }
}
