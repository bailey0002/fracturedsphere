// Individual hex tile component with touch support

import { memo, useMemo } from 'react'
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
  visibility, // 'visible', 'explored', 'unexplored'
  onClick 
}) {
  const { q, r, terrain, owner, isCapital } = hex
  const terrainData = TERRAIN_TYPES[terrain] || TERRAIN_TYPES.plains
  const factionData = owner ? FACTIONS[owner] : null
  
  // Calculate pixel position
  const { x, y } = useMemo(() => axialToPixel(q, r, HEX_SIZE), [q, r])
  
  // Generate hex path
  const hexPath = useMemo(() => getHexPath(HEX_SIZE - 2), [])
  
  // Determine fill color based on terrain and ownership
  const fillColor = useMemo(() => {
    let baseColor = terrainData.color
    
    // Blend with faction color if owned
    if (owner && factionData) {
      return factionData.color + '40' // 25% opacity overlay
    }
    
    return baseColor
  }, [terrain, owner, factionData, terrainData])
  
  // Stroke color for selection states
  const strokeColor = useMemo(() => {
    if (isSelected) return '#ffffff'
    if (isValidMove) return '#55a870'
    if (isValidAttack) return '#c45555'
    if (owner && factionData) return factionData.color
    return 'rgba(138, 155, 170, 0.3)'
  }, [isSelected, isValidMove, isValidAttack, owner, factionData])
  
  const strokeWidth = isSelected || isValidMove || isValidAttack ? 3 : 1
  
  // Visibility opacity - show everything, just dim unexplored slightly
  const opacity = visibility === 'unexplored' ? 0.6 : visibility === 'explored' ? 0.8 : 1
  
  // Handle click/tap
  const handleClick = (e) => {
    e.stopPropagation()
    onClick(q, r)
  }
  
  return (
    <g 
      transform={`translate(${x}, ${y})`}
      onClick={handleClick}
      onTouchEnd={(e) => {
        e.stopPropagation()
        // Prevent double-firing on touch devices
        if (e.cancelable) e.preventDefault()
        onClick(q, r)
      }}
      style={{ cursor: 'pointer' }}
      className="hex-tile"
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
      <path
        d={hexPath}
        fill={terrainData.patternColor || 'transparent'}
        opacity={0.3 * opacity}
        style={{ pointerEvents: 'none' }}
      />
      
      {/* Faction ownership indicator - center dot */}
      {owner && (
        <circle
          cx={0}
          cy={-8}
          r={6}
          fill={factionData?.color || '#888'}
          opacity={opacity}
          style={{ pointerEvents: 'none' }}
        />
      )}
      
      {/* Capital indicator */}
      {isCapital && (
        <text
          x={0}
          y={-4}
          textAnchor="middle"
          fontSize={16}
          fill="#ffd700"
          fontWeight="bold"
          style={{ pointerEvents: 'none' }}
        >
          ★
        </text>
      )}
      
      {/* Unit indicator */}
      {units.length > 0 && (
        <g transform={`translate(0, 12)`}>
          <circle
            cx={0}
            cy={0}
            r={12}
            fill={FACTIONS[units[0].owner]?.color || '#888'}
            stroke="#fff"
            strokeWidth={2}
            style={{ pointerEvents: 'none' }}
          />
          <text
            x={0}
            y={4}
            textAnchor="middle"
            fontSize={12}
            fill="#fff"
            fontWeight="bold"
            style={{ pointerEvents: 'none' }}
          >
            {units.length}
          </text>
        </g>
      )}
      
      {/* Valid move indicator - pulsing circle */}
      {isValidMove && (
        <circle
          cx={0}
          cy={0}
          r={HEX_SIZE * 0.4}
          fill="rgba(85, 168, 112, 0.2)"
          stroke="#55a870"
          strokeWidth={2}
          strokeDasharray="6 3"
          className="animate-pulse"
          style={{ pointerEvents: 'none' }}
        />
      )}
      
      {/* Valid attack indicator */}
      {isValidAttack && (
        <>
          <circle
            cx={0}
            cy={0}
            r={HEX_SIZE * 0.4}
            fill="rgba(196, 85, 85, 0.3)"
            stroke="#c45555"
            strokeWidth={3}
            style={{ pointerEvents: 'none' }}
          />
          <text
            x={0}
            y={5}
            textAnchor="middle"
            fontSize={20}
            fill="#ff6666"
            style={{ pointerEvents: 'none' }}
          >
            ⚔
          </text>
        </>
      )}
      
      {/* Selection ring */}
      {isSelected && (
        <path
          d={hexPath}
          fill="none"
          stroke="#ffffff"
          strokeWidth={3}
          className="animate-pulse"
          style={{ pointerEvents: 'none' }}
        />
      )}
      
      {/* Terrain label for unexplored (hint) */}
      {visibility === 'unexplored' && !owner && (
        <text
          x={0}
          y={4}
          textAnchor="middle"
          fontSize={8}
          fill="rgba(138, 155, 170, 0.5)"
          style={{ pointerEvents: 'none' }}
        >
          ?
        </text>
      )}
    </g>
  )
}

export default memo(HexTile)
