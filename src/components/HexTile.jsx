// Individual hex tile component

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
  visibility, // 'visible', 'explored', 'hidden'
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
    if (visibility === 'hidden') return '#0a0a0f'
    
    let baseColor = terrainData.color
    
    // Blend with faction color if owned
    if (owner && factionData) {
      // Mix terrain and faction colors
      return factionData.color + '40' // 25% opacity overlay
    }
    
    return baseColor
  }, [terrain, owner, factionData, visibility, terrainData])
  
  // Stroke color for selection states
  const strokeColor = useMemo(() => {
    if (isSelected) return '#ffffff'
    if (isValidMove) return '#55a870'
    if (isValidAttack) return '#c45555'
    if (owner && factionData) return factionData.color
    return 'rgba(138, 155, 170, 0.3)'
  }, [isSelected, isValidMove, isValidAttack, owner, factionData])
  
  const strokeWidth = isSelected || isValidMove || isValidAttack ? 2 : 1
  
  // Fog/visibility styling
  const opacity = visibility === 'hidden' ? 0.1 : visibility === 'explored' ? 0.5 : 1
  
  return (
    <g 
      transform={`translate(${x}, ${y})`}
      onClick={() => onClick(q, r)}
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
      {visibility === 'visible' && (
        <path
          d={hexPath}
          fill={terrainData.patternColor}
          opacity={0.3}
          style={{ pointerEvents: 'none' }}
        />
      )}
      
      {/* Faction ownership indicator */}
      {owner && visibility === 'visible' && (
        <circle
          cx={0}
          cy={0}
          r={HEX_SIZE * 0.15}
          fill={factionData?.color || '#888'}
          opacity={0.8}
        />
      )}
      
      {/* Capital indicator */}
      {isCapital && visibility === 'visible' && (
        <text
          x={0}
          y={4}
          textAnchor="middle"
          fontSize={14}
          fill="#fff"
          style={{ pointerEvents: 'none' }}
        >
          â˜…
        </text>
      )}
      
      {/* Unit indicator */}
      {units.length > 0 && visibility === 'visible' && (
        <g transform={`translate(0, ${HEX_SIZE * 0.35})`}>
          <circle
            cx={0}
            cy={0}
            r={10}
            fill={FACTIONS[units[0].owner]?.color || '#888'}
            stroke="#fff"
            strokeWidth={1}
          />
          <text
            x={0}
            y={4}
            textAnchor="middle"
            fontSize={10}
            fill="#fff"
            fontWeight="bold"
          >
            {units.length}
          </text>
        </g>
      )}
      
      {/* Valid move indicator */}
      {isValidMove && (
        <circle
          cx={0}
          cy={0}
          r={HEX_SIZE * 0.3}
          fill="none"
          stroke="#55a870"
          strokeWidth={2}
          strokeDasharray="4 4"
          opacity={0.8}
        />
      )}
      
      {/* Valid attack indicator */}
      {isValidAttack && (
        <circle
          cx={0}
          cy={0}
          r={HEX_SIZE * 0.35}
          fill="rgba(196, 85, 85, 0.2)"
          stroke="#c45555"
          strokeWidth={2}
        />
      )}
      
      {/* Selection ring */}
      {isSelected && (
        <path
          d={hexPath}
          fill="none"
          stroke="#ffffff"
          strokeWidth={3}
          className="hex-selected-ring"
        />
      )}
      
      {/* Coordinates (debug) */}
      {/* 
      <text
        x={0}
        y={-HEX_SIZE * 0.5}
        textAnchor="middle"
        fontSize={8}
        fill="#666"
      >
        {q},{r}
      </text>
      */}
    </g>
  )
}

export default memo(HexTile)
