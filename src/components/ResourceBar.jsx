// Resource display bar

import { getResourceColor } from '../data/terrain'

const RESOURCE_ICONS = {
  gold: '◈',
  iron: '⬡',
  grain: '❋',
  influence: '✧',
}

function ResourceDisplay({ resource, amount }) {
  const color = getResourceColor(resource)
  const icon = RESOURCE_ICONS[resource] || '●'
  
  return (
    <div className="flex items-center gap-2">
      <span style={{ color }} className="text-lg">{icon}</span>
      <div>
        <div className="font-mono text-sm text-steel-bright">
          {Math.floor(amount)}
        </div>
        <div className="text-[10px] uppercase tracking-wider text-steel-light/50">
          {resource}
        </div>
      </div>
    </div>
  )
}

export default function ResourceBar({ resources, factionColor }) {
  if (!resources) return null
  
  return (
    <div 
      className="panel flex items-center gap-6"
      style={{ borderLeftColor: factionColor, borderLeftWidth: 3 }}
    >
      <ResourceDisplay resource="gold" amount={resources.gold || 0} />
      <div className="w-px h-8 bg-steel-light/20" />
      <ResourceDisplay resource="iron" amount={resources.iron || 0} />
      <div className="w-px h-8 bg-steel-light/20" />
      <ResourceDisplay resource="grain" amount={resources.grain || 0} />
      <div className="w-px h-8 bg-steel-light/20" />
      <ResourceDisplay resource="influence" amount={resources.influence || 0} />
    </div>
  )
}
