import type { SimulationLinkDatum, SimulationNodeDatum } from 'd3-force'

export type NeuralNode = SimulationNodeDatum & {
  id: string
  group: number
  depth?: number
  radius: number
  hub: boolean
  boundary: boolean
  x?: number
  y?: number
  vx?: number
  vy?: number
}

export type NeuralLink = SimulationLinkDatum<NeuralNode> & {
  source: string | NeuralNode
  target: string | NeuralNode
  weight: number
}

export type NeuralGraph = {
  nodes: NeuralNode[]
  links: NeuralLink[]
  hubNodeIds: string[]
}

export type TraversalStep = {
  nodeId: string
  depth: number
  parentId?: string
}

export type TraversalResult = {
  steps: TraversalStep[]
  byDepth: Map<number, string[]>
}
