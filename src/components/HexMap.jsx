// HexMap - Pan/zoom hex map with iOS-compatible touch controls
// Uses PointerEvents for universal mouse/touch support

import { useMemo, useCallback, useState, useRef, useEffect } from 'react'
import HexTile from './HexTile'
import { hexId, axialToPixel } from '../utils/hexMath'

const HEX_SIZE = 50
const MIN_ZOOM = 0.5
const MAX_ZOOM = 2.5
const PAN_THRESHOLD = 5 // Pixels before considering it a pan (not tap)

export default function HexMap({ 
  mapData, 
  units = [],
  selectedHex,
  validMoves = [],
  validAttacks = [],
  playerFaction,
  onHexTap,
}) {
  const containerRef = useRef(null)
  const svgRef = useRef(null)
  
  // View state: center position and zoom level
  const [viewState, setViewState] = useState({
    x: 0,
    y: 0,
    zoom: 1.0,
  })
  
  // Interaction tracking
  const interactionRef = useRef({
    isPanning: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    startViewX: 0,
    startViewY: 0,
    lastTapTime: 0,
    hasMoved: false,
  })
  
  // Calculate map bounds on load
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
    
    // Center the view on the map
    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2
    
    setViewState(prev => ({
      ...prev,
      x: centerX,
      y: centerY,
    }))
  }, [mapData])
  
  // Group units by hex
  const unitsByHex = useMemo(() => {
    const grouped = {}
    units.forEach(unit => {
      if (unit.health <= 0) return
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
  
  // Visibility check
  const getVisibility = useCallback((hex) => {
    if (!playerFaction) return 'visible'
    if (hex.visible?.[playerFaction]) return 'visible'
    if (hex.explored?.[playerFaction]) return 'explored'
    return 'hidden'
  }, [playerFaction])
  
  // Calculate viewBox based on view state and container size
  const viewBox = useMemo(() => {
    const container = containerRef.current
    if (!container) {
      return { x: -400, y: -400, width: 800, height: 800 }
    }
    
    const width = container.clientWidth / viewState.zoom
    const height = container.clientHeight / viewState.zoom
    
    return {
      x: viewState.x - width / 2,
      y: viewState.y - height / 2,
      width,
      height,
    }
  }, [viewState])
  
  // PointerEvent handlers for pan
  const handlePointerDown = useCallback((e) => {
    // Only handle primary button or touch
    if (e.button !== 0 && e.pointerType !== 'touch') return
    
    const interaction = interactionRef.current
    
    // Check for double-tap to zoom
    const now = Date.now()
    if (now - interaction.lastTapTime < 300 && !interaction.hasMoved) {
      // Double tap - toggle zoom
      setViewState(prev => ({
        ...prev,
        zoom: prev.zoom < 1.5 ? 2.0 : 1.0,
      }))
      interaction.lastTapTime = 0
      return
    }
    interaction.lastTapTime = now
    
    interaction.isPanning = false // Will become true if we move
    interaction.hasMoved = false
    interaction.pointerId = e.pointerId
    interaction.startX = e.clientX
    interaction.startY = e.clientY
    interaction.startViewX = viewState.x
    interaction.startViewY = viewState.y
    
    // Capture pointer for smooth tracking
    e.currentTarget.setPointerCapture(e.pointerId)
  }, [viewState])
  
  const handlePointerMove = useCallback((e) => {
    const interaction = interactionRef.current
    if (interaction.pointerId !== e.pointerId) return
    
    const dx = e.clientX - interaction.startX
    const dy = e.clientY - interaction.startY
    
    // Only start panning if moved more than threshold
    if (Math.abs(dx) > PAN_THRESHOLD || Math.abs(dy) > PAN_THRESHOLD) {
      interaction.isPanning = true
      interaction.hasMoved = true
      
      setViewState(prev => ({
        ...prev,
        x: interaction.startViewX - dx / prev.zoom,
        y: interaction.startViewY - dy / prev.zoom,
      }))
    }
  }, [])
  
  const handlePointerUp = useCallback((e) => {
    const interaction = interactionRef.current
    if (interaction.pointerId === e.pointerId) {
      interaction.isPanning = false
      interaction.pointerId = null
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
  }, [])
  
  const handlePointerCancel = useCallback((e) => {
    const interaction = interactionRef.current
    interaction.isPanning = false
    interaction.pointerId = null
  }, [])
  
  // Wheel zoom (desktop)
  const handleWheel = useCallback((e) => {
    e.preventDefault()
    
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    
    setViewState(prev => {
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev.zoom * delta))
      return { ...prev, zoom: newZoom }
    })
  }, [])
  
  // Attach wheel listener with passive: false
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    
    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => container.removeEventListener('wheel', handleWheel)
  }, [handleWheel])
  
  // Handle hex tap (passed to HexTile)
  const handleHexTap = useCallback((q, r) => {
    // Don't fire tap if we were panning
    if (interactionRef.current.hasMoved) return
    onHexTap?.(q, r)
  }, [onHexTap])
  
  // Zoom buttons
  const handleZoomIn = useCallback(() => {
    setViewState(prev => ({
      ...prev,
      zoom: Math.min(MAX_ZOOM, prev.zoom * 1.3),
    }))
  }, [])
  
  const handleZoomOut = useCallback(() => {
    setViewState(prev => ({
      ...prev,
      zoom: Math.max(MIN_ZOOM, prev.zoom / 1.3),
    }))
  }, [])
  
  const handleResetView = useCallback(() => {
    setViewState(prev => ({
      ...prev,
      zoom: 1.0,
    }))
  }, [])
  
  if (!mapData || Object.keys(mapData).length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-steel-light">
        <span className="animate-pulse">Loading map...</span>
      </div>
    )
  }
  
  return (
    <div 
      ref={containerRef}
      className="hex-map relative w-full h-full bg-void-950 overflow-hidden"
      style={{ touchAction: 'none' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
    >
      <svg
        ref={svgRef}
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
        style={{ touchAction: 'none' }}
      >
        {/* Background */}
        <defs>
          <radialGradient id="mapGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(138, 155, 170, 0.08)" />
            <stop offset="100%" stopColor="rgba(10, 10, 15, 0)" />
          </radialGradient>
          
          <pattern id="gridPattern" width="30" height="30" patternUnits="userSpaceOnUse">
            <path 
              d="M 30 0 L 0 0 0 30" 
              fill="none" 
              stroke="rgba(138, 155, 170, 0.05)" 
              strokeWidth="0.5"
            />
          </pattern>
        </defs>
        
        {/* Background fill */}
        <rect 
          x={viewBox.x - 500} 
          y={viewBox.y - 500} 
          width={viewBox.width + 1000} 
          height={viewBox.height + 1000} 
          fill="#0a0a12" 
        />
        
        {/* Grid pattern */}
        <rect 
          x={viewBox.x - 500} 
          y={viewBox.y - 500} 
          width={viewBox.width + 1000} 
          height={viewBox.height + 1000} 
          fill="url(#gridPattern)" 
        />
        
        {/* Center glow */}
        <circle cx={0} cy={0} r={300} fill="url(#mapGlow)" />
        
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
                onTap={handleHexTap}
              />
            )
          })}
        </g>
      </svg>
      
      {/* Zoom controls */}
      <div 
        className="absolute bottom-4 right-4 flex flex-col gap-2"
        style={{ touchAction: 'manipulation' }}
      >
        <button
          onPointerUp={handleZoomIn}
          className="w-10 h-10 flex items-center justify-center
                     bg-void-900/80 hover:bg-void-800/80
                     border border-steel-light/20 rounded
                     text-steel-light text-lg font-bold
                     transition-all duration-200"
          style={{ touchAction: 'manipulation' }}
        >
          +
        </button>
        <button
          onPointerUp={handleResetView}
          className="w-10 h-10 flex items-center justify-center
                     bg-void-900/80 hover:bg-void-800/80
                     border border-steel-light/20 rounded
                     text-steel-light text-sm
                     transition-all duration-200"
          style={{ touchAction: 'manipulation' }}
        >
          ⟲
        </button>
        <button
          onPointerUp={handleZoomOut}
          className="w-10 h-10 flex items-center justify-center
                     bg-void-900/80 hover:bg-void-800/80
                     border border-steel-light/20 rounded
                     text-steel-light text-lg font-bold
                     transition-all duration-200"
          style={{ touchAction: 'manipulation' }}
        >
          −
        </button>
      </div>
      
      {/* Zoom level indicator */}
      <div className="absolute bottom-4 left-4 text-xs text-steel-light/40 font-mono">
        {Math.round(viewState.zoom * 100)}%
      </div>
    </div>
  )
}
