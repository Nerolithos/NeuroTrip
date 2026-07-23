import type { NeuralLink, TraversalResult, TraversalStep } from '../types/neuralGraph'
import { createSeededRandom } from './seededRandom'

type TraverseOptions = {
  maxDepth: number
  maxVisited: number
  branchProbability: number
  seed: number
}

const toNodeId = (value: string | { id: string }) =>
  typeof value === 'string' ? value : value.id

const edgeKey = (left: string, right: string) =>
  left < right ? `${left}|${right}` : `${right}|${left}`

export const buildAdjacency = (links: NeuralLink[]) => {
  const adjacency = new Map<string, string[]>()

  links.forEach((link) => {
    const sourceId = toNodeId(link.source)
    const targetId = toNodeId(link.target)

    const sourceNeighbors = adjacency.get(sourceId) ?? []
    if (!sourceNeighbors.includes(targetId)) {
      sourceNeighbors.push(targetId)
    }
    adjacency.set(sourceId, sourceNeighbors)

    const targetNeighbors = adjacency.get(targetId) ?? []
    if (!targetNeighbors.includes(sourceId)) {
      targetNeighbors.push(sourceId)
    }
    adjacency.set(targetId, targetNeighbors)
  })

  return adjacency
}

export const bfsTraversal = (
  adjacency: Map<string, string[]>,
  startId: string,
  options: TraverseOptions,
): TraversalResult => {
  const random = createSeededRandom(options.seed)
  const visited = new Set<string>()
  const queue: TraversalStep[] = [{ nodeId: startId, depth: 0 }]
  const steps: TraversalStep[] = []

  visited.add(startId)

  while (queue.length > 0 && visited.size < options.maxVisited) {
    const current = queue.shift()
    if (!current) {
      continue
    }

    steps.push(current)
    if (current.depth >= options.maxDepth) {
      continue
    }

    const neighbors = [...(adjacency.get(current.nodeId) ?? [])]
    neighbors.sort(() => random() - 0.5)

    for (const neighbor of neighbors) {
      if (visited.has(neighbor)) {
        continue
      }

      if (current.depth > 0 && random() > options.branchProbability) {
        continue
      }

      visited.add(neighbor)
      queue.push({
        nodeId: neighbor,
        depth: current.depth + 1,
        parentId: current.nodeId,
      })

      if (visited.size >= options.maxVisited) {
        break
      }
    }
  }

  const byDepth = new Map<number, string[]>()
  steps.forEach((step) => {
    const list = byDepth.get(step.depth) ?? []
    list.push(step.nodeId)
    byDepth.set(step.depth, list)
  })

  return { steps, byDepth }
}

export const dfsTraversal = (
  adjacency: Map<string, string[]>,
  startId: string,
  options: TraverseOptions,
): TraversalResult => {
  const random = createSeededRandom(options.seed)
  const visited = new Set<string>()
  const stack: TraversalStep[] = [{ nodeId: startId, depth: 0 }]
  const steps: TraversalStep[] = []

  while (stack.length > 0 && visited.size < options.maxVisited) {
    const current = stack.pop()
    if (!current) {
      continue
    }

    if (visited.has(current.nodeId)) {
      continue
    }

    visited.add(current.nodeId)
    steps.push(current)

    if (current.depth >= options.maxDepth) {
      continue
    }

    const neighbors = [...(adjacency.get(current.nodeId) ?? [])]
    neighbors.sort(() => random() - 0.5)

    for (const neighbor of neighbors) {
      if (visited.has(neighbor)) {
        continue
      }

      if (current.depth > 0 && random() > options.branchProbability) {
        continue
      }

      stack.push({
        nodeId: neighbor,
        depth: current.depth + 1,
        parentId: current.nodeId,
      })

      if (visited.size + stack.length >= options.maxVisited) {
        break
      }
    }
  }

  const byDepth = new Map<number, string[]>()
  steps.forEach((step) => {
    const list = byDepth.get(step.depth) ?? []
    list.push(step.nodeId)
    byDepth.set(step.depth, list)
  })

  return { steps, byDepth }
}

export const findShortestPath = (
  adjacency: Map<string, string[]>,
  fromId: string,
  toId: string,
): string[] => {
  if (fromId === toId) {
    return [fromId]
  }

  const queue: string[] = [fromId]
  const visited = new Set<string>([fromId])
  const parent = new Map<string, string>()

  while (queue.length > 0) {
    const currentId = queue.shift()
    if (!currentId) {
      continue
    }

    const neighbors = adjacency.get(currentId) ?? []
    for (const neighbor of neighbors) {
      if (visited.has(neighbor)) {
        continue
      }

      parent.set(neighbor, currentId)
      if (neighbor === toId) {
        const path = [toId]
        let walk = toId
        while (parent.has(walk)) {
          const previous = parent.get(walk)
          if (!previous) {
            break
          }
          path.push(previous)
          walk = previous
        }
        return path.reverse()
      }

      visited.add(neighbor)
      queue.push(neighbor)
    }
  }

  return [fromId]
}

export const edgeId = (sourceId: string, targetId: string) => edgeKey(sourceId, targetId)
