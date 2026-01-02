// Hex map grid component with touch support

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
  const containerRef = useRef(null)
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, width: 800, height: 600 })
  const [isPanning, setIsPanning] = useState(false)
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 })
  const [scale, setScale] = useState(1)
  
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
  
  // Center viewbox on map initially
  useEffect(() => {
    const padding = 80
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
  
  // Simplified visibility - show all hexes, just dim unexplored ones slightly
  const getVisibility = useCallback((hex) => {
    if (!playerFaction) return 'visible'
    // Show everything but mark explored status
    if (hex.visible?.[playerFaction]) return 'visible'
    if (hex.explored?.[playerFaction]) return 'explored'
    // Still show unexplored hexes, just slightly dimmed
    return 'unexplored'
  }, [playerFaction])
  
  // Get event coordinates (works for both mouse and touch)
  const getEventPos = (e) => {
    if (e.touches && e.touches.length > 0) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY }
    }
    return { x: e.clientX, y: e.clientY }
  }
  
  // Pan start
  const handlePanStart = (e) => {
    // Don't pan on hex clicks - only on two-finger touch or mouse drag
    if (e.touches && e.touches.length < 2) return
    if (e.type === 'mousedown' && e.button !== 1 && e.button !== 2) return
    
    setIsPanning(true)
    setLastPos(getEventPos(e))
    e.preventDefault()
  }
  
  // Pan move
  const handlePanMove = (e) => {
    if (!isPanning) return
    
    const pos = getEventPos(e)
    const dx = (pos.x - lastPos.x) * (viewBox.width / containerRef.current.clientWidth)
    const dy = (pos.y - lastPos.y) * (viewBox.height / containerRef.current.clientHeight)
    
    setViewBox(prev => ({
      ...prev,
      x: prev.x - dx,
      y: prev.y - dy,
    }))
    
    setLastPos(pos)
  }
  
  // Pan end
  const handlePanEnd = () => {
    setIsPanning(false)
  }
  
  // Zoom handler (mouse wheel)
  const handleWheel = (e) => {
    e.preventDefault()
    const scaleFactor = e.deltaY > 0 ? 1.1 : 0.9
    
    setViewBox(prev => {
      const newWidth = prev.width * scaleFactor
      const newHeight = prev.height * scaleFactor
      
      // Clamp zoom
      if (newWidth < 300 || newWidth > 2000) return prev
      
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
  
  // Pinch zoom for touch
  const lastPinchDist = useRef(0)
  
  const handleTouchMove = (e) => {
    if (e.touches.length === 2) {
      // Pinch zoom
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const dist = Math.sqrt(dx * dx + dy * dy)
      
      if (lastPinchDist.current > 0) {
        const scaleFactor = lastPinchDist.current / dist
        
        setViewBox(prev => {
          const newWidth = prev.width * scaleFactor
          const newHeight = prev.height * scaleFactor
          
          if (newWidth < 300 || newWidth > 2000) return prev
          
          const dxView = (newWidth - prev.width) / 2
          const dyView = (newHeight - prev.height) / 2
          
          return {
            x: prev.x - dxView,
            y: prev.y - dyView,
            width: newWidth,
            height: newHeight,
          }
        })
      }
      
      lastPinchDist.current = dist
      e.preventDefault()
    } else if (isPanning) {
      handlePanMove(e)
    }
  }
  
  const handleTouchEnd = () => {
    lastPinchDist.current = 0
    setIsPanning(false)
  }
  
  if (!mapData || Object.keys(mapData).length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-steel-light">
        Loading map...
      </div>
    )
  }
  
  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-void-950 touch-none"
    >
      {/* Grid background */}
      <div className="absolute inset-0 grid-bg opacity-30" />
      
      <svg
        className="w-full h-full"
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
        onMouseDown={handlePanStart}
        onMouseMove={handlePanMove}
        onMouseUp={handlePanEnd}
        onMouseLeave={handlePanEnd}
        onTouchStart={handlePanStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
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
      <div className="absolute bottom-2 left-2 text-xs text-steel-light/50 font-mono hidden md:block">
        Scroll: zoom • Right-drag: pan
      </div>
      <div className="absolute bottom-2 left-2 text-xs text-steel-light/50 font-mono md:hidden">
        Pinch: zoom • Two-finger drag: pan
      </div>
    </div>
  )
}
