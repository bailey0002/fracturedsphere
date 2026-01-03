// HexTile - Individual hex with iOS-compatible touch handling
// Uses onPointerUp for universal mouse/touch support

import { memo, useMemo, useCallback } from 'react'
import { axialToPixel, getHexPath } from '../utils/hexMath'
import { TERRAIN_TYPES } from '../data/terrain'
import { FACTIONS } from '../data/factions'
import { UNITS, VETERANCY_LEVELS } from '../data/units'

const HEX_SIZE = 50

function HexTile({ 
  hex, 
  units = [],
  isSelected, 
  isValidMove, 
  isValidAttack,
  isPlayerOwned,
  visibility = 'visible',
  onTap,
}) {
  const { q, r, terrain, owner, isCapital, buildings = [] } = hex
  const terrainData = TERRAIN_TYPES[terrain] || TERRAIN_TYPES.plains
  const factionData = owner ? FACTIONS[owner] : null
  
  // Calculate pixel position
  const position = useMemo(() => axialToPixel(q, r, HEX_SIZE), [q, r])
  
  // Generate hex path
  const hexPath = useMemo(() => getHexPath(HEX_SIZE - 2), [])
  
  // Determine fill color
  const fillColor = useMemo(() => {
    if (visibility === 'hidden') return '#0a0a12'
    if (visibility === 'explored') return terrainData.color + '80'
    return terrainData.color
  }, [visibility, terrainData.color])
  
  // Determine stroke style
  const strokeStyle = useMemo(() => {
    if (isSelected) {
      return { color: '#ffffff', width: 3, dashArray: 'none' }
    }
    if (isValidMove) {
      return { color: '#55a870', width: 2.5, dashArray: '6 3' }
    }
    if (isValidAttack) {
      return { color: '#c45555', width: 2.5, dashArray: 'none' }
    }
    if (owner && factionData) {
      return { color: factionData.color, width: 1.5, dashArray: 'none' }
    }
    return { color: 'rgba(138, 155, 170, 0.3)', width: 1, dashArray: 'none' }
  }, [isSelected, isValidMove, isValidAttack, owner, factionData])
  
  // Visibility opacity
  const opacity = visibility === 'hidden' ? 0.15 : visibility === 'explored' ? 0.6 : 1
  
  // Handle tap with PointerEvents
  const handlePointerUp = useCallback((e) => {
    e.stopPropagation()
    onTap?.(q, r)
  }, [onTap, q, r])
  
  // Prevent context menu on long press
  const handleContextMenu = useCallback((e) => {
    e.preventDefault()
  }, [])
  
  // Unit display
  const unitDisplay = useMemo(() => {
    if (units.length === 0 || visibility === 'hidden') return null
    
    const primaryUnit = units[0]
    const unitFaction = FACTIONS[primaryUnit.owner]
    const unitDef = UNITS[primaryUnit.type]
    const vetLevel = VETERANCY_LEVELS[primaryUnit.veterancy?.toUpperCase()] || VETERANCY_LEVELS.GREEN
    
    // Health bar width (0-100%)
    const healthPercent = Math.max(0, Math.min(100, primaryUnit.health || 100))
    const healthColor = healthPercent > 60 ? '#55a870' : healthPercent > 30 ? '#c4a35a' : '#c45555'
    
    return (
      <g transform="translate(0, 12)" style={{ pointerEvents: 'none' }}>
        {/* Unit circle */}
        <circle
          cx={0}
          cy={0}
          r={14}
          fill={unitFaction?.color || '#888'}
          stroke="#000"
          strokeWidth={2}
        />
        
        {/* Unit count or veterancy icon */}
        <text
          x={0}
          y={4}
          textAnchor="middle"
          fontSize={units.length > 1 ? 11 : 10}
          fill="#fff"
          fontWeight="bold"
          fontFamily="monospace"
        >
          {units.length > 1 ? units.length : vetLevel.icon}
        </text>
        
        {/* Health bar */}
        {healthPercent < 100 && (
          <g transform="translate(-12, 16)">
            <rect x={0} y={0} width={24} height={4} fill="#1a1a25" rx={1} />
            <rect 
              x={0} 
              y={0} 
              width={24 * (healthPercent / 100)} 
              height={4} 
              fill={healthColor}
              rx={1}
            />
          </g>
        )}
        
        {/* Moved/attacked indicator */}
        {(primaryUnit.movedThisTurn || primaryUnit.attackedThisTurn) && (
          <circle
            cx={10}
            cy={-10}
            r={4}
            fill="#1a1a25"
            stroke={primaryUnit.attackedThisTurn ? '#c45555' : '#c4a35a'}
            strokeWidth={1.5}
          />
        )}
      </g>
    )
  }, [units, visibility])
  
  // Building indicator
  const buildingDisplay = useMemo(() => {
    if (buildings.length === 0 || visibility !== 'visible') return null
    
    return (
      <g transform="translate(-15, -15)" style={{ pointerEvents: 'none' }}>
        <rect
          x={0}
          y={0}
          width={12}
          height={12}
          rx={2}
          fill={factionData?.color || '#888'}
          opacity={0.9}
        />
        <text
          x={6}
          y={9}
          textAnchor="middle"
          fontSize={8}
          fill="#fff"
          fontWeight="bold"
        >
          {buildings.length}
        </text>
      </g>
    )
  }, [buildings, visibility, factionData])
  
  return (
    <g 
      transform={`translate(${position.x}, ${position.y})`}
      className="hex-tile"
      style={{ 
        cursor: 'pointer',
        touchAction: 'manipulation',
      }}
    >
      {/* Transparent hit area for better touch targeting */}
      <circle
        cx={0}
        cy={0}
        r={HEX_SIZE}
        fill="transparent"
        onPointerUp={handlePointerUp}
        onContextMenu={handleContextMenu}
        style={{ touchAction: 'manipulation' }}
      />
      
      {/* Base hex shape */}
      <path
        d={hexPath}
        fill={fillColor}
        stroke={strokeStyle.color}
        strokeWidth={strokeStyle.width}
        strokeDasharray={strokeStyle.dashArray}
        opacity={opacity}
        style={{ pointerEvents: 'none' }}
      />
      
      {/* Terrain pattern overlay */}
      {visibility === 'visible' && (
        <path
          d={hexPath}
          fill={terrainData.patternColor || terrainData.color}
          opacity={0.25}
          style={{ pointerEvents: 'none' }}
        />
      )}
      
      {/* Faction ownership fill */}
      {owner && factionData && visibility === 'visible' && (
        <path
          d={hexPath}
          fill={factionData.color}
          opacity={0.15}
          style={{ pointerEvents: 'none' }}
        />
      )}
      
      {/* Valid move indicator - pulsing dashed ring */}
      {isValidMove && (
        <circle
          cx={0}
          cy={0}
          r={HEX_SIZE * 0.65}
          fill="rgba(85, 168, 112, 0.15)"
          stroke="#55a870"
          strokeWidth={2}
          strokeDasharray="6 4"
          style={{ pointerEvents: 'none' }}
          className="animate-pulse"
        />
      )}
      
      {/* Valid attack indicator - solid red ring */}
      {isValidAttack && (
        <circle
          cx={0}
          cy={0}
          r={HEX_SIZE * 0.65}
          fill="rgba(196, 85, 85, 0.2)"
          stroke="#c45555"
          strokeWidth={2.5}
          style={{ pointerEvents: 'none' }}
        />
      )}
      
      {/* Selection ring */}
      {isSelected && (
        <circle
          cx={0}
          cy={0}
          r={HEX_SIZE * 0.7}
          fill="none"
          stroke="#ffffff"
          strokeWidth={2}
          strokeDasharray="4 2"
          style={{ pointerEvents: 'none' }}
          className="animate-spin-slow"
        />
      )}
      
      {/* Capital indicator */}
      {isCapital && visibility === 'visible' && (
        <text
          x={15}
          y={-15}
          textAnchor="middle"
          fontSize={16}
          fill="#ffd700"
          style={{ pointerEvents: 'none' }}
        >
          ★
        </text>
      )}
      
      {/* Terrain icon (when no units) */}
      {units.length === 0 && visibility === 'visible' && (
        <text
          x={0}
          y={4}
          textAnchor="middle"
          fontSize={12}
          fill="rgba(138, 155, 170, 0.5)"
          style={{ pointerEvents: 'none' }}
        >
          {terrainData.id === 'mountain' ? '▲' : 
           terrainData.id === 'forest' ? '♣' :
           terrainData.id === 'coastal' ? '~' :
           terrainData.id === 'urban' ? '⌂' :
           terrainData.id === 'anomaly' ? '◊' :
           terrainData.id === 'relay' ? '◎' : ''}
        </text>
      )}
      
      {/* Explored but not visible fog */}
      {visibility === 'explored' && (
        <path
          d={hexPath}
          fill="rgba(10, 10, 18, 0.5)"
          style={{ pointerEvents: 'none' }}
        />
      )}
      
      {/* Hidden fog */}
      {visibility === 'hidden' && (
        <g style={{ pointerEvents: 'none' }}>
          <path
            d={hexPath}
            fill="rgba(10, 10, 18, 0.85)"
          />
          <text
            x={0}
            y={5}
            textAnchor="middle"
            fontSize={18}
            fill="rgba(138, 155, 170, 0.3)"
          >
            ?
          </text>
        </g>
      )}
      
      {/* Building indicator */}
      {buildingDisplay}
      
      {/* Unit display */}
      {unitDisplay}
    </g>
  )
}

// Memoize to prevent unnecessary re-renders
export default memo(HexTile)
