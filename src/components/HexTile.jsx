// Individual hex tile - uses pointer events for universal touch/mouse support

import { memo, useMemo, useCallback } from 'react'
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
}) {
  const { q, r, terrain, owner, isCapital } = hex
  const terrainData = TERRAIN_TYPES[terrain] || TERRAIN_TYPES.plains
  const factionData = owner ? FACTIONS[owner] : null
  
  // Calculate pixel position
  const { x, y } = useMemo(() => axialToPixel(q, r, HEX_SIZE), [q, r])
  
  // Generate hex path
  const hexPath = useMemo(() => getHexPath(HEX_SIZE - 2), [])
  
  // Colors
  const fillColor = useMemo(() => {
    if (owner && factionData) {
      return factionData.color + '40'
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
  
  // Universal click/tap handler using onPointerUp
  // PointerEvents work consistently across mouse and touch
  const handlePointerUp = useCallback((e) => {
    e.stopPropagation()
    e.preventDefault()
    onClick?.(q, r)
  }, [onClick, q, r])
  
  // Unit display
  const unitDisplay = useMemo(() => {
    if (units.length === 0) return null
    
    const totalStrength = units.reduce((sum, u) => sum + (u.strength || 1), 0)
    const unitFaction = units[0].faction
    const unitColor = FACTIONS[unitFaction]?.color || '#fff'
    
    return (
      <g>
        <circle
          cx={x}
          cy={y + 8}
          r={14}
          fill={unitColor}
          stroke="#000"
          strokeWidth={2}
          opacity={0.9}
        />
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
      onPointerUp={handlePointerUp}
    >
      {/* Hex shape - main tap target */}
      <path
        d={hexPath}
        transform={`translate(${x}, ${y})`}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        style={{ pointerEvents: 'all' }}
      />
      
      {/* Valid move indicator */}
      {isValidMove && (
        <circle
          cx={x}
          cy={y}
          r={HEX_SIZE - 10}
          fill="rgba(85, 168, 112, 0.15)"
          stroke="#55a870"
          strokeWidth={2}
          strokeDasharray="6 4"
          style={{ pointerEvents: 'none' }}
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
            style={{ pointerEvents: 'none' }}
          />
          <text
            x={x}
            y={y - 15}
            textAnchor="middle"
            fontSize="16"
            style={{ pointerEvents: 'none' }}
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
        style={{ pointerEvents: 'none' }}
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
          style={{ pointerEvents: 'none' }}
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
          style={{ pointerEvents: 'none' }}
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
