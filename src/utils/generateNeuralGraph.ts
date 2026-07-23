import type { NeuralGraph, NeuralLink, NeuralNode } from '../types/neuralGraph'
import { createSeededRandom } from './seededRandom'

type GenerateGraphOptions = {
  width: number
  height: number
  nodeCount: number
  clusterCount: number
  seed: number
  mobile: boolean
  clusterAnchors?: Array<{ x: number; y: number }>
  boundaryPoints?: Array<{ x: number; y: number }>
  boundaryNodeCount?: number
  projectPoint?: (x: number, y: number) => { x: number; y: number }
}

export const resolveGatewayDensity = (width: number, reducedMotion: boolean) => {
  const mobile = width < 820
  const hardwareConcurrency =
    typeof navigator === 'undefined' ? 8 : Math.max(1, navigator.hardwareConcurrency ?? 8)
  const lowPerformance = reducedMotion || hardwareConcurrency <= 4 || width < 1100

  return {
    mobile,
    lowPerformance,
    nodeCount: mobile ? 64 : lowPerformance ? 98 : 136,
    clusterCount: mobile ? 4 : lowPerformance ? 5 : 6,
  }
}

const distance = (left: NeuralNode, right: NeuralNode) => {
  const dx = (left.x ?? 0) - (right.x ?? 0)
  const dy = (left.y ?? 0) - (right.y ?? 0)
  return Math.hypot(dx, dy)
}

const keyOf = (leftId: string, rightId: string) =>
  leftId < rightId ? `${leftId}|${rightId}` : `${rightId}|${leftId}`

const randomBetween = (random: () => number, min: number, max: number) =>
  min + random() * (max - min)

const connect = (
  links: NeuralLink[],
  edgeSet: Set<string>,
  sourceId: string,
  targetId: string,
  weight: number,
) => {
  if (sourceId === targetId) {
    return
  }

  const edgeKey = keyOf(sourceId, targetId)
  if (edgeSet.has(edgeKey)) {
    return
  }

  edgeSet.add(edgeKey)
  links.push({
    source: sourceId,
    target: targetId,
    weight,
  })
}

const collectComponents = (nodes: NeuralNode[], links: NeuralLink[]) => {
  const adjacency = new Map<string, string[]>()

  nodes.forEach((node) => {
    adjacency.set(node.id, [])
  })

  links.forEach((link) => {
    const sourceId = typeof link.source === 'string' ? link.source : link.source.id
    const targetId = typeof link.target === 'string' ? link.target : link.target.id
    const sourceNeighbors = adjacency.get(sourceId)
    const targetNeighbors = adjacency.get(targetId)

    if (sourceNeighbors && targetNeighbors) {
      sourceNeighbors.push(targetId)
      targetNeighbors.push(sourceId)
    }
  })

  const visited = new Set<string>()
  const components: string[][] = []

  nodes.forEach((node) => {
    if (visited.has(node.id)) {
      return
    }

    const queue = [node.id]
    const component: string[] = []
    visited.add(node.id)

    while (queue.length > 0) {
      const next = queue.shift()
      if (!next) {
        continue
      }

      component.push(next)
      const neighbors = adjacency.get(next) ?? []
      neighbors.forEach((neighborId) => {
        if (visited.has(neighborId)) {
          return
        }
        visited.add(neighborId)
        queue.push(neighborId)
      })
    }

    components.push(component)
  })

  return components
}

export const generateNeuralGraph = ({
  width,
  height,
  nodeCount,
  clusterCount,
  seed,
  mobile,
  clusterAnchors,
  boundaryPoints,
  boundaryNodeCount,
  projectPoint,
}: GenerateGraphOptions): NeuralGraph => {
  const random = createSeededRandom(seed)
  const safeWidth = Math.max(width, 360)
  const safeHeight = Math.max(height, 520)

  const nodes: NeuralNode[] = []
  const links: NeuralLink[] = []
  const edgeSet = new Set<string>()

  const clusterCenters = Array.from({ length: clusterCount }, (_, index) => {
    const anchor = clusterAnchors?.[index]
    if (anchor) {
      return anchor
    }

    const horizontalBias = 0.53 + (index / Math.max(clusterCount - 1, 1)) * 0.38
    return {
      x: safeWidth * horizontalBias + randomBetween(random, -safeWidth * 0.06, safeWidth * 0.06),
      y:
        safeHeight * (0.2 + (index / Math.max(clusterCount - 1, 1)) * 0.62) +
        randomBetween(random, -safeHeight * 0.08, safeHeight * 0.08),
    }
  })

  const hubsPerCluster = mobile ? 1 : 2
  const clusterUseCount = new Array(clusterCount).fill(0)
  const boundaryCount = Math.min(
    boundaryNodeCount ?? Math.floor(nodeCount * 0.26),
    boundaryPoints?.length ?? 0,
  )

  for (let index = 0; index < nodeCount; index += 1) {
    const boundary = index < boundaryCount
    const group = boundary ? index % clusterCount : Math.floor(random() * clusterCount)
    const center = clusterCenters[group] ?? { x: safeWidth * 0.65, y: safeHeight * 0.5 }

    const spreadX = safeWidth * (mobile ? 0.11 : 0.14)
    const spreadY = safeHeight * (mobile ? 0.12 : 0.16)

    const fallbackX = center.x + randomBetween(random, -spreadX, spreadX)
    const fallbackY = center.y + randomBetween(random, -spreadY, spreadY)
    const boundaryPoint = boundary ? boundaryPoints?.[index] : null
    const roughX = boundaryPoint?.x ?? fallbackX
    const roughY = boundaryPoint?.y ?? fallbackY
    const projected = projectPoint ? projectPoint(roughX, roughY) : { x: roughX, y: roughY }

    const localIndex = clusterUseCount[group] ?? 0
    clusterUseCount[group] = localIndex + 1
    const hub = localIndex < hubsPerCluster && random() > 0.42

    nodes.push({
      id: `node-${index}`,
      group,
      hub: boundary ? hub && random() > 0.5 : hub,
      boundary,
      radius: boundary
        ? randomBetween(random, 2.6, 4.8)
        : hub
          ? randomBetween(random, 3.7, 6.2)
          : randomBetween(random, 1.9, 4.3),
      x: projected.x,
      y: projected.y,
      fx: boundary ? projected.x : null,
      fy: boundary ? projected.y : null,
      vx: 0,
      vy: 0,
    })
  }

  const boundaryNodes = nodes.filter((node) => node.boundary)
  boundaryNodes.forEach((node, index) => {
    const next = boundaryNodes[(index + 1) % boundaryNodes.length]
    const skip = boundaryNodes[(index + 2) % boundaryNodes.length]
    if (next) {
      connect(links, edgeSet, node.id, next.id, randomBetween(random, 0.5, 0.9))
    }
    if (skip && random() > 0.52) {
      connect(links, edgeSet, node.id, skip.id, randomBetween(random, 0.28, 0.55))
    }
  })

  const byCluster = new Map<number, NeuralNode[]>()
  nodes.forEach((node) => {
    const existing = byCluster.get(node.group) ?? []
    existing.push(node)
    byCluster.set(node.group, existing)
  })

  byCluster.forEach((clusterNodes) => {
    clusterNodes.forEach((node) => {
      const nearest = [...clusterNodes]
        .filter((candidate) => candidate.id !== node.id)
        .sort((left, right) => distance(node, left) - distance(node, right))
        .slice(0, mobile ? 2 : 3)

      nearest.forEach((neighbor) => {
        connect(
          links,
          edgeSet,
          node.id,
          neighbor.id,
          randomBetween(random, 0.35, 0.95),
        )
      })
    })
  })

  boundaryNodes.forEach((node) => {
    const interior = nodes
      .filter((candidate) => !candidate.boundary)
      .sort((left, right) => distance(node, left) - distance(node, right))
      .slice(0, 2)

    interior.forEach((target) => {
      connect(links, edgeSet, node.id, target.id, randomBetween(random, 0.3, 0.64))
    })
  })

  const hubNodes = nodes.filter((node) => node.hub)
  for (let index = 0; index < clusterCount - 1; index += 1) {
    const from = hubNodes.find((node) => node.group === index)
    const to = hubNodes.find((node) => node.group === index + 1)
    if (from && to) {
      connect(links, edgeSet, from.id, to.id, randomBetween(random, 0.45, 0.88))
    }
  }

  const extraBridges = mobile ? clusterCount : clusterCount + 2
  for (let bridge = 0; bridge < extraBridges; bridge += 1) {
    const left = hubNodes[Math.floor(random() * hubNodes.length)]
    const right = hubNodes[Math.floor(random() * hubNodes.length)]
    if (left && right && left.group !== right.group) {
      connect(links, edgeSet, left.id, right.id, randomBetween(random, 0.25, 0.7))
    }
  }

  let components = collectComponents(nodes, links)
  while (components.length > 1) {
    const first = components[0]
    const second = components[1]
    if (!first || !second) {
      break
    }

    const leftId = first[Math.floor(random() * first.length)]
    const rightId = second[Math.floor(random() * second.length)]

    if (leftId && rightId) {
      connect(links, edgeSet, leftId, rightId, randomBetween(random, 0.3, 0.6))
    }

    components = collectComponents(nodes, links)
  }

  const hubNodeIds = hubNodes.map((node) => node.id)
  return { nodes, links, hubNodeIds }
}
