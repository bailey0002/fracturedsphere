// Hex grid mathematics and utilities for The Fractured Sphere

// Pointy-top hex dimensions
export const getHexDimensions = (size) => ({
  width: Math.sqrt(3) * size,
  height: 2 * size,
  horizontalSpacing: Math.sqrt(3) * size,
  verticalSpacing: 1.5 * size,
})

// Generate SVG path for a pointy-top hexagon
export const getHexPath = (size) => {
  const angles = [30, 90, 150, 210, 270, 330]
  const points = angles.map(angle => {
    const rad = (Math.PI / 180) * angle
    return `${size * Math.cos(rad)},${size * Math.sin(rad)}`
  })
  return `M ${points.join(' L ')} Z`
}

// Get corner positions for a hex
export const getHexCorners = (centerX, centerY, size) => {
  const corners = []
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i + 30)
    corners.push({
      x: centerX + size * Math.cos(angle),
      y: centerY + size * Math.sin(angle),
    })
  }
  return corners
}

// Convert axial to pixel coordinates (pointy-top)
export const axialToPixel = (q, r, size) => {
  const x = size * (Math.sqrt(3) * q + Math.sqrt(3) / 2 * r)
  const y = size * (3 / 2 * r)
  return { x, y }
}

// Convert pixel to axial coordinates
export const pixelToAxial = (x, y, size) => {
  const q = (Math.sqrt(3) / 3 * x - 1 / 3 * y) / size
  const r = (2 / 3 * y) / size
  return axialRound(q, r)
}

// Axial to cube coordinates
export const axialToCube = (q, r) => ({ x: q, y: -q - r, z: r })

// Cube to axial coordinates
export const cubeToAxial = (cube) => ({ q: cube.x, r: cube.z })

// Round cube coordinates
export const cubeRound = (cube) => {
  let rx = Math.round(cube.x)
  let ry = Math.round(cube.y)
  let rz = Math.round(cube.z)

  const xDiff = Math.abs(rx - cube.x)
  const yDiff = Math.abs(ry - cube.y)
  const zDiff = Math.abs(rz - cube.z)

  if (xDiff > yDiff && xDiff > zDiff) {
    rx = -ry - rz
  } else if (yDiff > zDiff) {
    ry = -rx - rz
  } else {
    rz = -rx - ry
  }

  return { x: rx, y: ry, z: rz }
}

// Round axial coordinates to nearest hex
export const axialRound = (q, r) => {
  const cube = axialToCube(q, r)
  const rounded = cubeRound(cube)
  return cubeToAxial(rounded)
}

// Calculate distance between two hexes
export const hexDistance = (q1, r1, q2, r2) => {
  return (Math.abs(q1 - q2) + Math.abs(q1 + r1 - q2 - r2) + Math.abs(r1 - r2)) / 2
}

// Create hex ID from coordinates
export const hexId = (q, r) => `${q},${r}`

// Parse hex ID to coordinates
export const parseHexId = (id) => {
  const [q, r] = id.split(',').map(Number)
  return { q, r }
}

// Get hex neighbors (6 directions)
export const getHexNeighbors = (q, r) => {
  const directions = [
    { q: 1, r: 0 },   // East
    { q: 1, r: -1 },  // Northeast
    { q: 0, r: -1 },  // Northwest
    { q: -1, r: 0 },  // West
    { q: -1, r: 1 },  // Southwest
    { q: 0, r: 1 },   // Southeast
  ]
  return directions.map(d => ({ q: q + d.q, r: r + d.r }))
}

// Check if hex is in bounds
export const isInBounds = (q, r, radius) => {
  return hexDistance(q, r, 0, 0) <= radius
}

// Get all hexes in a ring at distance n from center
export const getHexRing = (centerQ, centerR, radius) => {
  if (radius === 0) return [{ q: centerQ, r: centerR }]
  
  const results = []
  const directions = [
    { q: 1, r: 0 },
    { q: 0, r: 1 },
    { q: -1, r: 1 },
    { q: -1, r: 0 },
    { q: 0, r: -1 },
    { q: 1, r: -1 },
  ]
  
  // Start at the hex radius steps away in one direction
  let hex = { q: centerQ + radius * -1, r: centerR + radius * 1 }
  
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < radius; j++) {
      results.push({ ...hex })
      hex = { q: hex.q + directions[i].q, r: hex.r + directions[i].r }
    }
  }
  
  return results
}

// Line drawing between hexes (for paths, supply lines)
export const hexLineDraw = (q1, r1, q2, r2) => {
  const n = hexDistance(q1, r1, q2, r2)
  if (n === 0) return [{ q: q1, r: r1 }]
  
  const results = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const qLerp = q1 + (q2 - q1) * t
    const rLerp = r1 + (r2 - r1) * t
    const cube = cubeRound(axialToCube(qLerp, rLerp))
    results.push(cubeToAxial(cube))
  }
  return results
}

// Field of view calculation
export const calculateFOV = (q, r, range, blockedHexes = new Set()) => {
  const visible = new Set()
  visible.add(`${q},${r}`)
  
  for (let ring = 1; ring <= range; ring++) {
    const ringHexes = getHexRing(q, r, ring)
    for (const hex of ringHexes) {
      const line = hexLineDraw(q, r, hex.q, hex.r)
      let blocked = false
      for (let i = 1; i < line.length - 1; i++) {
        if (blockedHexes.has(`${line[i].q},${line[i].r}`)) {
          blocked = true
          break
        }
      }
      if (!blocked) {
        visible.add(`${hex.q},${hex.r}`)
      }
    }
  }
  
  return visible
}

// Get direction from one hex to another
export const getDirection = (fromQ, fromR, toQ, toR) => {
  const dq = toQ - fromQ
  const dr = toR - fromR
  
  const directions = [
    { q: 1, r: 0, name: 'E' },
    { q: 1, r: -1, name: 'NE' },
    { q: 0, r: -1, name: 'NW' },
    { q: -1, r: 0, name: 'W' },
    { q: -1, r: 1, name: 'SW' },
    { q: 0, r: 1, name: 'SE' },
  ]
  
  const length = hexDistance(fromQ, fromR, toQ, toR)
  if (length === 0) return null
  
  const nq = dq / length
  const nr = dr / length
  
  let closest = directions[0]
  let closestDist = Infinity
  
  for (const dir of directions) {
    const dist = Math.abs(dir.q - nq) + Math.abs(dir.r - nr)
    if (dist < closestDist) {
      closestDist = dist
      closest = dir
    }
  }
  
  return closest.name
}

// Generate all hexes for a hexagonal map of given radius
export const generateHexMap = (radius) => {
  const hexes = []
  for (let q = -radius; q <= radius; q++) {
    const r1 = Math.max(-radius, -q - radius)
    const r2 = Math.min(radius, -q + radius)
    for (let r = r1; r <= r2; r++) {
      hexes.push({ q, r, s: -q - r })
    }
  }
  return hexes
}
