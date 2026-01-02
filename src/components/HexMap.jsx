// Hex map grid component with iOS-compatible touch support

import { useMemo, useCallback, useState, useRef, useEffect } from 'react'
import HexTile from './HexTile'
import { hexId, axialToPixel } from '../utils/hexMath'

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
  const containerRef = useRef(null)
  const [viewBox, setViewBox] = useState({ x: -300, y: -300, width: 600, height: 600 })
  const [scale, setScale] = useState(1)
  
  // Touch state for distinguishing tap vs pan
  const touchState = useRef({
    startX: 0,
    startY: 0,
    startTime: 0,
    isPanning: false,
    lastPinchDist: 0,
  })
  
  // Calculate map bounds and center viewbox
  useEffect(() => {
    if (!mapData || Object.keys(mapData).length === 0) return
    
    let minX = Infinity, maxX = -Infinity
    let minY = Infinity, maxY = -Infinity
    
    Object.values(mapData).forEach(hex => {
      const { x, y } = axialToPixel(hex.q, hex.r, HEX_SIZE)
      minX = Math.min(minX, x - HEX_SIZE)
      maxX = Math.max(maxX, x + HEX_SIZE)
      minY = Math.min(minY, y - HEX_SIZE)
      maxY = Math.max(maxY, y + HEX_SIZE)
    })
    
    const padding = 60
    const width = maxX - minX + padding * 2
    const height = maxY - minY + padding * 2
    
    setViewBox({
      x: minX - padding,
      y: minY - padding,
      width,
      height,
    })
  }, [mapData])
  
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
  
  // Create Sets for quick lookup
  const validMoveSet = useMemo(() => 
    new Set(validMoves.map(m => hexId(m.q, m.r))),
    [validMoves]
  )
  
  const validAttackSet = useMemo(() =>
    new Set(validAttacks.map(a => hexId(a.q, a.r))),
    [validAttacks]
  )
  
  // Visibility - show all hexes, dim unexplored slightly
  const getVisibility = useCallback((hex) => {
    if (!playerFaction) return 'visible'
    if (hex.visible?.[playerFaction]) return 'visible'
    if (hex.explored?.[playerFaction]) return 'explored'
    return 'unexplored'
  }, [playerFaction])
  
  // Handle hex click from HexTile
  const handleHexClick = useCallback((q, r) => {
    onHexClick?.(q, r)
  }, [onHexClick])
  
  // Mouse wheel zoom (desktop)
  const handleWheel = useCallback((e) => {
    e.preventDefault()
    const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9
    
    setViewBox(prev => {
      const newWidth = Math.max(200, Math.min(1200, prev.width * zoomFactor))
      const newHeight = Math.max(200, Math.min(1200, prev.height * zoomFactor))
      const centerX = prev.x + prev.width / 2
      const centerY = prev.y + prev.height / 2
      
      return {
        x: centerX - newWidth / 2,
        y: centerY - newHeight / 2,
        width: newWidth,
        height: newHeight,
      }
    })
    setScale(prev => Math.max(0.5, Math.min(2, prev / zoomFactor)))
  }, [])
  
  // Mouse pan (desktop - right click drag)
  const handleMouseDown = useCallback((e) => {
    if (e.button === 2 || e.button === 1) { // Right or middle click
      e.preventDefault()
      const startX = e.clientX
      const startY = e.clientY
      const startViewBox = { ...viewBox }
      
      const handleMouseMove = (moveE) => {
        const dx = (moveE.clientX - startX) * (viewBox.width / containerRef.current.clientWidth)
        const dy = (moveE.clientY - startY) * (viewBox.height / containerRef.current.clientHeight)
        setViewBox({
          ...startViewBox,
          x: startViewBox.x - dx,
          y: startViewBox.y - dy,
        })
      }
      
      const handleMouseUp = () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
      
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }
  }, [viewBox])
  
  // Touch handlers for iOS - handle tap vs pan/pinch
  const handleTouchStart = useCallback((e) => {
    const touch = e.touches[0]
    touchState.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      startTime: Date.now(),
      isPanning: false,
      lastPinchDist: 0,
    }
    
    // Pinch zoom setup
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      touchState.current.lastPinchDist = Math.sqrt(dx * dx + dy * dy)
    }
  }, [])
  
  const handleTouchMove = useCallback((e) => {
    if (e.touches.length === 1) {
      // Single finger pan
      const touch = e.touches[0]
      const dx = touch.clientX - touchState.current.startX
      const dy = touch.clientY - touchState.current.startY
      
      // If moved more than 10px, it's a pan not a tap
      if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
        touchState.current.isPanning = true
        
        const scaleFactor = viewBox.width / containerRef.current.clientWidth
        setViewBox(prev => ({
          ...prev,
          x: prev.x - dx * scaleFactor * 0.5,
          y: prev.y - dy * scaleFactor * 0.5,
        }))
        
        touchState.current.startX = touch.clientX
        touchState.current.startY = touch.clientY
      }
    } else if (e.touches.length === 2) {
      // Pinch zoom
      touchState.current.isPanning = true
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const dist = Math.sqrt(dx * dx + dy * dy)
      
      if (touchState.current.lastPinchDist > 0) {
        const zoomFactor = touchState.current.lastPinchDist / dist
        
        setViewBox(prev => {
          const newWidth = Math.max(200, Math.min(1200, prev.width * zoomFactor))
          const newHeight = Math.max(200, Math.min(1200, prev.height * zoomFactor))
          const centerX = prev.x + prev.width / 2
          const centerY = prev.y + prev.height / 2
          
          return {
            x: centerX - newWidth / 2,
            y: centerY - newHeight / 2,
            width: newWidth,
            height: newHeight,
          }
        })
      }
      
      touchState.current.lastPinchDist = dist
    }
  }, [viewBox])
  
  // Prevent context menu on right click
  const handleContextMenu = useCallback((e) => {
    e.preventDefault()
  }, [])
  
  // Attach wheel listener with passive: false for preventDefault
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    
    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => container.removeEventListener('wheel', handleWheel)
  }, [handleWheel])
  
  return (
    <div 
      ref={containerRef}
      className="w-full h-full bg-void-950 relative touch-none"
      onMouseDown={handleMouseDown}
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
    >
      <svg
        ref={svgRef}
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
        className="w-full h-full"
        style={{ touchAction: 'none' }}
      >
        {/* Background grid pattern */}
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(138, 155, 170, 0.1)" strokeWidth="0.5"/>
          </pattern>
        </defs>
        <rect x={viewBox.x} y={viewBox.y} width={viewBox.width} height={viewBox.height} fill="url(#grid)" />
        
        {/* Hex tiles */}
        <g>
          {Object.values(mapData).map(hex => {
            const key = hexId(hex.q, hex.r)
            const hexUnits = unitsByHex[key] || []
            const visibility = getVisibility(hex)
            
            return (
              <HexTile
                key={key}
                hex={hex}
                units={hexUnits}
                isSelected={selectedHex === key}
                isValidMove={validMoveSet.has(key)}
                isValidAttack={validAttackSet.has(key)}
                isPlayerOwned={hex.owner === playerFaction}
                visibility={visibility}
                onClick={handleHexClick}
                isPanning={() => touchState.current.isPanning}
              />
            )
          })}
        </g>
      </svg>
      
      {/* Controls hint */}
      <div className="absolute bottom-2 left-2 text-xs text-steel-light/40 font-mono pointer-events-none">
        <span className="hidden md:inline">Scroll: zoom • Right-drag: pan</span>
        <span className="md:hidden">Pinch: zoom • Drag: pan • Tap: select</span>
      </div>
    </div>
  )
}
