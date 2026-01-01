// Hex map grid component

import { useMemo, useCallback, useState, useRef, useEffect } from 'react'
import HexTile from './HexTile'
import { hexId, axialToPixel } from '../utils/hexMath'
import { MAP_CONFIG } from '../data/mapData'

const HEX_SIZE = 50

export default function HexMap({ 
  mapData, 
  units,
  selectedHex,
  validMoves,
  validAttacks,
  playerFaction,
  onHexClick,
}) {
  const svgRef = useRef(null)
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, width: 800, height: 600 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  
  // Calculate map bounds
  const mapBounds = useMemo(() => {
    if (!mapData || Object.keys(mapData).length === 0) {
      return { minX: -200, maxX: 200, minY: -200, maxY: 200 }
    }
    
    let minX = Infinity, maxX = -Infinity
    let minY = Infinity, maxY = -Infinity
    
    Object.values(mapData).forEach(hex => {
      const { x, y } = axialToPixel(hex.q, hex.r, HEX_SIZE)
      minX = Math.min(minX, x - HEX_SIZE)
      maxX = Math.max(maxX, x + HEX_SIZE)
      minY = Math.min(minY, y - HEX_SIZE)
      maxY = Math.max(maxY, y + HEX_SIZE)
    })
    
    return { minX, maxX, minY, maxY }
  }, [mapData])
  
  // Center viewbox on map
  useEffect(() => {
    const padding = 100
    const width = mapBounds.maxX - mapBounds.minX + padding * 2
    const height = mapBounds.maxY - mapBounds.minY + padding * 2
    
    setViewBox({
      x: mapBounds.minX - padding,
      y: mapBounds.minY - padding,
      width,
      height,
    })
  }, [mapBounds])
  
  // Group units by hex
  const unitsByHex = useMemo(() => {
    const grouped = {}
    units.forEach(unit => {
      const key = hexId(unit.q, unit.r)
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(unit)
    })
    return grouped
  }, [units])
  
  // Create Set for quick lookup
  const validMoveSet = useMemo(() => 
    new Set(validMoves.map(m => hexId(m.q, m.r))),
    [validMoves]
  )
  
  const validAttackSet = useMemo(() =>
    new Set(validAttacks.map(a => hexId(a.q, a.r))),
    [validAttacks]
  )
  
  // Determine visibility for each hex
  const getVisibility = useCallback((hex) => {
    if (!playerFaction) return 'visible' // Show all in faction select
    if (hex.visible[playerFaction]) return 'visible'
    if (hex.explored[playerFaction]) return 'explored'
    return 'hidden'
  }, [playerFaction])
  
  // Pan handlers
  const handleMouseDown = (e) => {
    if (e.button === 1 || e.button === 2) { // Middle or right click
      setIsDragging(true)
      setDragStart({ x: e.clientX, y: e.clientY })
    }
  }
  
  const handleMouseMove = (e) => {
    if (!isDragging) return
    
    const dx = e.clientX - dragStart.x
    const dy = e.clientY - dragStart.y
    
    setViewBox(prev => ({
      ...prev,
      x: prev.x - dx,
      y: prev.y - dy,
    }))
    
    setDragStart({ x: e.clientX, y: e.clientY })
  }
  
  const handleMouseUp = () => {
    setIsDragging(false)
  }
  
  // Zoom handler
  const handleWheel = (e) => {
    e.preventDefault()
    const scaleFactor = e.deltaY > 0 ? 1.1 : 0.9
    
    setViewBox(prev => {
      const newWidth = prev.width * scaleFactor
      const newHeight = prev.height * scaleFactor
      
      // Clamp zoom
      if (newWidth < 400 || newWidth > 2000) return prev
      
      // Zoom toward center
      const dx = (newWidth - prev.width) / 2
      const dy = (newHeight - prev.height) / 2
      
      return {
        x: prev.x - dx,
        y: prev.y - dy,
        width: newWidth,
        height: newHeight,
      }
    })
  }
  
  if (!mapData || Object.keys(mapData).length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-steel-light">
        Loading map...
      </div>
    )
  }
  
  return (
    <div className="relative w-full h-full overflow-hidden bg-void-950">
      {/* Grid background */}
      <div className="absolute inset-0 grid-bg opacity-30" />
      
      <svg
        ref={svgRef}
        className="w-full h-full"
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onContextMenu={e => e.preventDefault()}
      >
        {/* Background radial gradient */}
        <defs>
          <radialGradient id="mapGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(138, 155, 170, 0.1)" />
            <stop offset="100%" stopColor="rgba(10, 10, 15, 0)" />
          </radialGradient>
        </defs>
        
        <rect
          x={viewBox.x}
          y={viewBox.y}
          width={viewBox.width}
          height={viewBox.height}
          fill="url(#mapGlow)"
        />
        
        {/* Hex tiles */}
        <g className="hex-grid">
          {Object.values(mapData).map(hex => {
            const key = hexId(hex.q, hex.r)
            const visibility = getVisibility(hex)
            
            return (
              <HexTile
                key={key}
                hex={hex}
                units={unitsByHex[key] || []}
                isSelected={selectedHex === key}
                isValidMove={validMoveSet.has(key)}
                isValidAttack={validAttackSet.has(key)}
                isPlayerOwned={hex.owner === playerFaction}
                visibility={visibility}
                onClick={onHexClick}
              />
            )
          })}
        </g>
      </svg>
      
      {/* Map controls hint */}
      <div className="absolute bottom-4 left-4 text-xs text-steel-light/50 font-mono">
        Scroll to zoom • Right-drag to pan
      </div>
    </div>
  )
}
