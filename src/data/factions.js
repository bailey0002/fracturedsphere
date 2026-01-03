// Faction definitions for The Fractured Sphere

export const FACTIONS = {
  continuity: {
    id: 'continuity',
    name: 'The Continuity',
    description: 'Preservers of the old order. They believe stability comes through tradition.',
    color: '#4a7c9b',
    secondaryColor: '#3a6c8b',
    emblem: 'â—‡',
    personality: 'defensive',
    priorities: ['defense', 'economy', 'expansion'],
    aiTraits: {
      aggression: 0.3,
      expansion: 0.5,
      diplomacy: 0.7,
      riskTolerance: 0.3,
    },
    bonuses: {
      defenseBonus: 0.15,
      buildingCostReduction: 0.1,
    },
    startingUnits: ['infantry', 'infantry', 'garrison'],
    lore: 'When the Sphere fractured, the Continuity preserved what records they could. They see themselves as custodians of humanity\'s future.',
  },
  
  ascendant: {
    id: 'ascendant',
    name: 'The Ascendant',
    description: 'Ambitious expansionists. They believe humanity must evolve or die.',
    color: '#c4a35a',
    secondaryColor: '#b4934a',
    emblem: 'â–³',
    personality: 'aggressive',
    priorities: ['expansion', 'military', 'economy'],
    aiTraits: {
      aggression: 0.8,
      expansion: 0.9,
      diplomacy: 0.3,
      riskTolerance: 0.7,
    },
    bonuses: {
      attackBonus: 0.15,
      movementBonus: 1,
    },
    startingUnits: ['infantry', 'cavalry', 'cavalry'],
    lore: 'The Ascendant rose from the military castes of the old Sphere. They believe only through strength can humanity claim its birthright among the stars.',
  },
  
  collective: {
    id: 'collective',
    name: 'The Collective',
    description: 'United through shared consciousness. They seek harmony through connection.',
    color: '#9b4a4a',
    secondaryColor: '#8b3a3a',
    emblem: 'â—‹',
    personality: 'balanced',
    priorities: ['economy', 'defense', 'expansion'],
    aiTraits: {
      aggression: 0.5,
      expansion: 0.6,
      diplomacy: 0.5,
      riskTolerance: 0.5,
    },
    bonuses: {
      productionBonus: 0.2,
      supplyBonus: 0.15,
    },
    startingUnits: ['infantry', 'infantry', 'worker'],
    lore: 'The Collective emerged from the Sphere\'s networked habitats. Their neural links create unprecedented coordinationâ€”some call it unity, others call it loss of self.',
  },
  
  reclaimers: {
    id: 'reclaimers',
    name: 'The Reclaimers',
    description: 'Scavengers and survivors. They thrive in the broken places.',
    color: '#4a9b6b',
    secondaryColor: '#3a8b5b',
    emblem: 'â—ˆ',
    personality: 'opportunistic',
    priorities: ['economy', 'expansion', 'military'],
    aiTraits: {
      aggression: 0.6,
      expansion: 0.7,
      diplomacy: 0.4,
      riskTolerance: 0.6,
    },
    bonuses: {
      scavengeBonus: 0.25,
      territoryIncomeBonus: 0.1,
    },
    startingUnits: ['infantry', 'scout', 'scout'],
    lore: 'When others mourned the Sphere\'s fracture, the Reclaimers saw opportunity. They know every ruin, every salvage point, every forgotten cache.',
  },
}

// Diplomatic relations
export const RELATIONS = {
  ALLIED: 'allied',
  CORDIAL: 'cordial',
  NEUTRAL: 'neutral',
  HOSTILE: 'hostile',
  WAR: 'war',
}

// Diplomatic actions
export const DIPLOMATIC_ACTIONS = {
  DECLARE_WAR: {
    id: 'declare_war',
    name: 'Declare War',
    cost: { influence: 0 },
    minRelation: RELATIONS.NEUTRAL,
    resultRelation: RELATIONS.WAR,
  },
  PROPOSE_CEASEFIRE: {
    id: 'propose_ceasefire',
    name: 'Propose Ceasefire',
    cost: { influence: 20, gold: 100 },
    minRelation: RELATIONS.WAR,
    successChance: 0.4,
    resultRelation: RELATIONS.HOSTILE,
  },
  IMPROVE_RELATIONS: {
    id: 'improve_relations',
    name: 'Diplomatic Outreach',
    cost: { influence: 15, gold: 50 },
    minRelation: RELATIONS.HOSTILE,
    successChance: 0.6,
    resultRelation: '+1',
  },
  PROPOSE_ALLIANCE: {
    id: 'propose_alliance',
    name: 'Propose Alliance',
    cost: { influence: 50, gold: 200 },
    minRelation: RELATIONS.CORDIAL,
    successChance: 0.3,
    resultRelation: RELATIONS.ALLIED,
  },
}

export const getFactionById = (id) => FACTIONS[id] || null

export const getRelationColor = (relation) => {
  switch (relation) {
    case RELATIONS.ALLIED: return '#55a870'
    case RELATIONS.CORDIAL: return '#6bc78f'
    case RELATIONS.NEUTRAL: return '#8a9baa'
    case RELATIONS.HOSTILE: return '#c4a855'
    case RELATIONS.WAR: return '#c45555'
    default: return '#8a9baa'
  }
}

export const getRelationLabel = (relation) => {
  switch (relation) {
    case RELATIONS.ALLIED: return 'Allied'
    case RELATIONS.CORDIAL: return 'Cordial'
    case RELATIONS.NEUTRAL: return 'Neutral'
    case RELATIONS.HOSTILE: return 'Hostile'
    case RELATIONS.WAR: return 'At War'
    default: return 'Unknown'
  }
}
