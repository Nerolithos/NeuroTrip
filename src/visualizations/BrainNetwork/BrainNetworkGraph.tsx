import { forceCenter, forceLink, forceManyBody, forceSimulation } from 'd3'
import { useMemo } from 'react'
import { connections, getBehaviorById, getRegionById } from '../../data'
import type { BehaviorId, RegionId } from '../../types/neuro'

type BrainNetworkGraphProps = {
  behaviorId: BehaviorId
  onNodeSelect?: (regionId: RegionId) => void
}

type GraphNode = {
  id: RegionId
  activation: number
  confidence: number
  x?: number
  y?: number
}

type GraphLink = {
  source: RegionId
  target: RegionId
  weight: number
}

const WIDTH = 560
const HEIGHT = 380

export const BrainNetworkGraph = ({ behaviorId, onNodeSelect }: BrainNetworkGraphProps) => {
  const behavior = getBehaviorById(behaviorId)

  const graphData = useMemo(() => {
    if (!behavior) {
      return { nodes: [] as GraphNode[], links: [] as GraphLink[] }
    }

    const nodes: GraphNode[] = behavior.regions.map((entry) => ({
      id: entry.regionId,
      activation: entry.activation,
      confidence: entry.confidence,
    }))

    const nodeIds = new Set(nodes.map((node) => node.id))
    const links: GraphLink[] = connections
      .filter((edge) => edge.behavior === behaviorId)
      .filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target))
      .map((edge) => ({
        source: edge.source,
        target: edge.target,
        weight: edge.weight,
      }))

    const simulation = forceSimulation(nodes)
      .force('charge', forceManyBody().strength(-190))
      .force('center', forceCenter(WIDTH / 2, HEIGHT / 2))
      .force(
        'link',
        forceLink<GraphNode, GraphLink>(links)
          .id((node) => node.id)
          .distance((link) => 220 - link.weight * 110),
      )
      .stop()

    for (let tick = 0; tick < 180; tick += 1) {
      simulation.tick()
    }

    simulation.stop()
    return { nodes, links }
  }, [behavior, behaviorId])

  if (!behavior) {
    return <p className="viz-fallback">No network data available for this behavior.</p>
  }

  return (
    <figure className="network-figure">
      <svg
        className="network-svg"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label="Functional network graph for selected behavior"
      >
        <defs>
          <linearGradient id="edge-glow" x1="0" x2="1">
            <stop offset="0%" stopColor="#47d5c2" />
            <stop offset="100%" stopColor="#ff8c66" />
          </linearGradient>
        </defs>

        {graphData.links.map((edge) => {
          const sourceNode = graphData.nodes.find((node) => node.id === edge.source)
          const targetNode = graphData.nodes.find((node) => node.id === edge.target)

          if (!sourceNode?.x || !sourceNode.y || !targetNode?.x || !targetNode.y) {
            return null
          }

          return (
            <line
              key={`${edge.source}-${edge.target}`}
              x1={sourceNode.x}
              y1={sourceNode.y}
              x2={targetNode.x}
              y2={targetNode.y}
              stroke="url(#edge-glow)"
              strokeWidth={1.2 + edge.weight * 4}
              strokeOpacity={0.56}
            />
          )
        })}

        {graphData.nodes.map((node) => {
          const region = getRegionById(node.id)
          if (!node.x || !node.y || !region) {
            return null
          }

          return (
            <g
              key={node.id}
              transform={`translate(${node.x}, ${node.y})`}
              className="network-node"
              onClick={() => onNodeSelect?.(node.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onNodeSelect?.(node.id)
                }
              }}
              role="button"
              tabIndex={0}
              aria-label={`Open ${region.name} scene`}
            >
              <circle
                r={16 + node.activation * 24}
                fill="#101a24"
                stroke="#76ffe0"
                strokeOpacity={0.45 + node.confidence * 0.45}
                strokeWidth={2.2}
              />
              <text y="4" textAnchor="middle" className="network-label">
                {region.name}
              </text>
              <title>
                {region.displayName}\nActivation: {Math.round(node.activation * 100)}%\nConfidence:{' '}
                {Math.round(node.confidence * 100)}%
              </title>
            </g>
          )
        })}
      </svg>
      <figcaption>
        Prototype values are illustrative, normalized, and aggregated for storytelling.
      </figcaption>
    </figure>
  )
}
