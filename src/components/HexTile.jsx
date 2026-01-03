// HexTile.jsx - Individual hex with iOS-compatible touch handling
// Uses onPointerUp for universal mouse/touch support

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
    if (visibility === 'unexplored') return '#0a0a12'
    if (owner && factionData) {
      return factionData.color + '40' // 25% opacity faction overlay
    }
    return terrainData.color
  }, [terrain, owner, factionData, terrainData, visibility])
  
  const strokeColor = useMemo(() => {
    if (isSelected) return '#ffffff'
    if (isValidMove) return '#55a870'
    if (isValidAttack) return '#c45555'
    if (owner && factionData) return factionData.color
    return 'rgba(138, 155, 170, 0.3)'
  }, [isSelected, isValidMove, isValidAttack, owner, factionData])
  
  const strokeWidth = isSelected ? 3 : (isValidMove || isValidAttack) ? 2.5 : 1
  
  // Visibility opacity
  const opacity = visibility === 'unexplored' ? 0.4 : visibility === 'explored' ? 0.7 : 1
  
  // Handle tap/click using PointerUp (works on both mouse and touch)
  const handlePointerUp = useCallback((e) => {
    e.stopPropagation()
    onClick?.(q, r)
  }, [onClick, q, r])
  
  // Unit display
  const unitDisplay = useMemo(() => {
    if (units.length === 0 || visibility === 'unexplored') return null
    
    const unit = units[0]
    const unitFaction = FACTIONS[unit.owner]
    
    return (
      <g transform={`translate(0, ${HEX_SIZE * 0.25})`} style={{ pointerEvents: 'none' }}>
        <circle
          cx={0}
          cy={0}
          r={12}
          fill={unitFaction?.color || '#888'}
          stroke="#fff"
          strokeWidth={1.5}
        />
        <text
          x={0}
          y={4}
          textAnchor="middle"
          fontSize={11}
          fill="#fff"
          fontWeight="bold"
          fontFamily="monospace"
        >
          {units.length}
        </text>
      </g>
    )
  }, [units, visibility])
  
  return (
    <g 
      transform={`translate(${x}, ${y})`}
      onPointerUp={handlePointerUp}
      style={{ cursor: 'pointer' }}
    >
      {/* Base hex shape */}
      <path
        d={hexPath}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        opacity={opacity}
      />
      
      {/* Terrain pattern overlay */}
      {visibility === 'visible' && (
        <path
          d={hexPath}
          fill={terrainData.patternColor || terrainData.color}
          opacity={0.2}
          style={{ pointerEvents: 'none' }}
        />
      )}
      
      {/* Valid move indicator - pulsing dashed circle */}
      {isValidMove && (
        <circle
          cx={0}
          cy={0}
          r={HEX_SIZE * 0.35}
          fill="rgba(85, 168, 112, 0.15)"
          stroke="#55a870"
          strokeWidth={2}
          strokeDasharray="6 4"
          style={{ pointerEvents: 'none' }}
          className="animate-pulse"
        />
      )}
      
      {/* Valid attack indicator - solid red */}
      {isValidAttack && (
        <circle
          cx={0}
          cy={0}
          r={HEX_SIZE * 0.35}
          fill="rgba(196, 85, 85, 0.25)"
          stroke="#c45555"
          strokeWidth={2.5}
          style={{ pointerEvents: 'none' }}
        />
      )}
      
      {/* Faction ownership indicator */}
      {owner && visibility === 'visible' && !isCapital && (
        <circle
          cx={0}
          cy={-HEX_SIZE * 0.25}
          r={6}
          fill={factionData?.color || '#888'}
          opacity={0.9}
          style={{ pointerEvents: 'none' }}
        />
      )}
      
      {/* Capital indicator */}
      {isCapital && visibility === 'visible' && (
        <text
          x={0}
          y={-HEX_SIZE * 0.2}
          textAnchor="middle"
          fontSize={16}
          fill="#ffd700"
          style={{ pointerEvents: 'none' }}
        >
          ★
        </text>
      )}
      
      {/* Units */}
      {unitDisplay}
      
      {/* Selection highlight */}
      {isSelected && (
        <path
          d={hexPath}
          fill="none"
          stroke="#ffffff"
          strokeWidth={3}
          opacity={0.8}
          style={{ pointerEvents: 'none' }}
        />
      )}
    </g>
  )
}

export default memo(HexTile)
