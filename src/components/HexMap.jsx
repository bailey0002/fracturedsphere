// HexMap.jsx - Mobile-first hex grid with iOS-compatible touch
// Uses PointerEvents for universal mouse/touch support

import { useMemo, useCallback, useState, useEffect } from 'react'
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
  const [viewBox, setViewBox] = useState({ x: -300, y: -300, width: 600, height: 600 })
  
  // Calculate map bounds and center viewbox on load
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
    setViewBox({
      x: minX - padding,
      y: minY - padding,
      width: maxX - minX + padding * 2,
      height: maxY - minY + padding * 2,
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
  
  // Simple visibility check with optional chaining
  const getVisibility = useCallback((hex) => {
    if (!playerFaction) return 'visible'
    if (hex.visible?.[playerFaction]) return 'visible'
    if (hex.explored?.[playerFaction]) return 'explored'
    return 'unexplored'
  }, [playerFaction])
  
  // Handle hex selection - called from HexTile
  const handleHexClick = useCallback((q, r) => {
    onHexClick?.(q, r)
  }, [onHexClick])
  
  if (!mapData || Object.keys(mapData).length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-steel-light">
        <span className="animate-pulse">Loading map...</span>
      </div>
    )
  }
  
  return (
    <div className="w-full h-full bg-void-950 overflow-auto">
      <svg
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
        className="w-full h-full min-w-[300px] min-h-[300px]"
        preserveAspectRatio="xMidYMid meet"
        style={{ touchAction: 'pan-x pan-y' }}
      >
        {/* Background */}
        <defs>
          <radialGradient id="mapGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(138, 155, 170, 0.08)" />
            <stop offset="100%" stopColor="rgba(10, 10, 15, 0)" />
          </radialGradient>
        </defs>
        
        <rect 
          x={viewBox.x} 
          y={viewBox.y} 
          width={viewBox.width} 
          height={viewBox.height} 
          fill="#0a0a12" 
        />
        <rect 
          x={viewBox.x} 
          y={viewBox.y} 
          width={viewBox.width} 
          height={viewBox.height} 
          fill="url(#mapGlow)" 
        />
        
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
              />
            )
          })}
        </g>
      </svg>
    </div>
  )
}
