// Individual hex tile component with iOS touch support

import { memo, useMemo, useCallback, useRef } from 'react'
import { axialToPixel, getHexPath } from '../utils/hexMath'
import { TERRAIN_TYPES } from '../data/terrain'
import { FACTIONS } from '../data/factions'

const HEX_SIZE = 50

function HexTile({ 
  hex, 
  units,
  isSelected, 
  isValidMove, 
  isValidAttack,
  isPlayerOwned,
  visibility,
  onClick,
  isPanning, // Function to check if currently panning
}) {
  const { q, r, terrain, owner, isCapital } = hex
  const terrainData = TERRAIN_TYPES[terrain] || TERRAIN_TYPES.plains
  const factionData = owner ? FACTIONS[owner] : null
  
  // Touch tracking for this hex
  const touchRef = useRef({ startX: 0, startY: 0, moved: false })
  
  // Calculate pixel position
  const { x, y } = useMemo(() => axialToPixel(q, r, HEX_SIZE), [q, r])
  
  // Generate hex path
  const hexPath = useMemo(() => getHexPath(HEX_SIZE - 2), [])
  
  // Colors
  const fillColor = useMemo(() => {
    if (owner && factionData) {
      return factionData.color + '40' // 25% opacity faction overlay
    }
    return terrainData.color
  }, [terrain, owner, factionData, terrainData])
  
  const strokeColor = useMemo(() => {
    if (isSelected) return '#ffffff'
    if (isValidMove) return '#55a870'
    if (isValidAttack) return '#c45555'
    if (owner && factionData) return factionData.color
    return 'rgba(138, 155, 170, 0.3)'
  }, [isSelected, isValidMove, isValidAttack, owner, factionData])
  
  const strokeWidth = isSelected || isValidMove || isValidAttack ? 3 : 1
  
  // Visibility opacity
  const opacity = visibility === 'unexplored' ? 0.6 : visibility === 'explored' ? 0.85 : 1
  
  // Click handler (mouse)
  const handleClick = useCallback((e) => {
    e.stopPropagation()
    onClick?.(q, r)
  }, [onClick, q, r])
  
  // Touch handlers - track start position to detect tap vs drag
  const handleTouchStart = useCallback((e) => {
    const touch = e.touches[0]
    touchRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      moved: false,
    }
  }, [])
  
  const handleTouchMove = useCallback((e) => {
    const touch = e.touches[0]
    const dx = Math.abs(touch.clientX - touchRef.current.startX)
    const dy = Math.abs(touch.clientY - touchRef.current.startY)
    
    // If moved more than 10px, mark as moved (not a tap)
    if (dx > 10 || dy > 10) {
      touchRef.current.moved = true
    }
  }, [])
  
  const handleTouchEnd = useCallback((e) => {
    e.stopPropagation()
    
    // Only trigger click if we didn't pan and parent isn't panning
    if (!touchRef.current.moved && (!isPanning || !isPanning())) {
      onClick?.(q, r)
    }
  }, [onClick, q, r, isPanning])
  
  // Unit display
  const unitDisplay = useMemo(() => {
    if (units.length === 0) return null
    
    const totalStrength = units.reduce((sum, u) => sum + (u.strength || 1), 0)
    const unitFaction = units[0].faction
    const unitColor = FACTIONS[unitFaction]?.color || '#fff'
    
    return (
      <g>
        {/* Unit circle */}
        <circle
          cx={x}
          cy={y + 8}
          r={14}
          fill={unitColor}
          stroke="#000"
          strokeWidth={2}
          opacity={0.9}
        />
        {/* Unit count/strength */}
        <text
          x={x}
          y={y + 13}
          textAnchor="middle"
          fontSize="12"
          fontWeight="bold"
          fill="#000"
        >
          {totalStrength}
        </text>
      </g>
    )
  }, [units, x, y])
  
  return (
    <g 
      style={{ opacity, cursor: 'pointer' }}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Hex shape */}
      <path
        d={hexPath}
        transform={`translate(${x}, ${y})`}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
      />
      
      {/* Valid move indicator - pulsing dashed circle */}
      {isValidMove && (
        <circle
          cx={x}
          cy={y}
          r={HEX_SIZE - 10}
          fill="none"
          stroke="#55a870"
          strokeWidth={2}
          strokeDasharray="6 4"
          className="animate-pulse"
        />
      )}
      
      {/* Valid attack indicator */}
      {isValidAttack && (
        <>
          <circle
            cx={x}
            cy={y}
            r={HEX_SIZE - 10}
            fill="rgba(196, 85, 85, 0.2)"
            stroke="#c45555"
            strokeWidth={2}
          />
          <text
            x={x}
            y={y - 15}
            textAnchor="middle"
            fontSize="16"
          >
            ⚔️
          </text>
        </>
      )}
      
      {/* Terrain icon */}
      <text
        x={x}
        y={y - 8}
        textAnchor="middle"
        fontSize="14"
        opacity={0.7}
      >
        {terrainData.icon}
      </text>
      
      {/* Capital star */}
      {isCapital && (
        <text
          x={x + 18}
          y={y - 15}
          textAnchor="middle"
          fontSize="18"
          fill="#ffd700"
        >
          ★
        </text>
      )}
      
      {/* Unexplored marker */}
      {visibility === 'unexplored' && !owner && (
        <text
          x={x}
          y={y + 5}
          textAnchor="middle"
          fontSize="20"
          fill="rgba(138, 155, 170, 0.5)"
        >
          ?
        </text>
      )}
      
      {/* Units */}
      {unitDisplay}
    </g>
  )
}

export default memo(HexTile)
