// Central asset imports for The Fractured Sphere
// All game images are organized by category
// Images are imported dynamically to allow graceful fallback when missing

// Helper to safely import images
const tryImport = (importFn) => {
  try {
    return importFn()
  } catch (e) {
    return null
  }
}

// Dynamic imports for all assets - will be null if files don't exist
const assetModules = import.meta.glob('./images/**/*.png', { eager: true, import: 'default' })

// Extract asset by path pattern
const getAsset = (category, name) => {
  const path = `./images/${category}/${name}.png`
  return assetModules[path] || null
}

// Faction Emblems
export const FACTION_IMAGES = {
  continuity: getAsset('factions', 'continuity'),
  ascendant: getAsset('factions', 'ascendant'),
  collective: getAsset('factions', 'collective'),
  reclaimers: getAsset('factions', 'reclaimers'),
}

// Terrain
export const TERRAIN_IMAGES = {
  plains: getAsset('terrain', 'plains'),
  forest: getAsset('terrain', 'forest'),
  mountains: getAsset('terrain', 'mountains'),
  wasteland: getAsset('terrain', 'wastelands'),
  ruins: getAsset('terrain', 'ruins'),
  void_edge: getAsset('terrain', 'void'),
  farmland: getAsset('terrain', 'farmland'),
}

// Unit Branches
export const BRANCH_IMAGES = {
  ground: getAsset('branch', 'ground'),
  air: getAsset('branch', 'air'),
  armor: getAsset('branch', 'armor'),
}

// Buildings
export const BUILDING_IMAGES = {
  outpost: getAsset('building', 'outpost'),
  barracks: getAsset('building', 'barracks'),
  factory: getAsset('building', 'factory'),
  fortress: getAsset('building', 'fortress'),
}

// Resources
export const RESOURCE_IMAGES = {
  gold: getAsset('resource', 'gold'),
  iron: getAsset('resource', 'iron'),
  grain: getAsset('resource', 'grain'),
}

// Veterancy Levels
export const VETERANCY_IMAGES = {
  green: getAsset('veterancy', 'green'),
  trained: getAsset('veterancy', 'trained'),
  veteran: getAsset('veterancy', 'veteran'),
  elite: getAsset('veterancy', 'elite'),
  legendary: getAsset('veterancy', 'legendary'),
}

// Helper function to get faction image
export const getFactionImage = (factionId) => FACTION_IMAGES[factionId] || null

// Helper function to get terrain image
export const getTerrainImage = (terrainId) => TERRAIN_IMAGES[terrainId] || null

// Helper function to get branch image
export const getBranchImage = (branchId) => BRANCH_IMAGES[branchId] || null

// Helper function to get building image
export const getBuildingImage = (buildingId) => BUILDING_IMAGES[buildingId] || null

// Helper function to get resource image
export const getResourceImage = (resourceId) => RESOURCE_IMAGES[resourceId] || null

// Helper function to get veterancy image
export const getVeterancyImage = (vetLevel) => VETERANCY_IMAGES[vetLevel] || null
