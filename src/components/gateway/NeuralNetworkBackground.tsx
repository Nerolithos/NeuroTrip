import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  select,
} from 'd3'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { NeuralNode } from '../../types/neuralGraph'
import {
  createBrainBoundaryPoints,
  createBrainShape,
  createClusterAnchors,
  isInsideBrainShape,
  projectInsideBrainShape,
} from '../../utils/brainShape'
import { generateNeuralGraph, resolveGatewayDensity } from '../../utils/generateNeuralGraph'
import { createSeededRandom, hashSeed } from '../../utils/seededRandom'
import {
  bfsTraversal,
  buildAdjacency,
  dfsTraversal,
  edgeId,
  findShortestPath,
} from '../../utils/traverseNeuralGraph'

type AnchorPoint = {
  x: number
  y: number
}

type NeuralNetworkBackgroundProps = {
  reducedMotion: boolean
  ctaAnchor: AnchorPoint | null
  ctaEngaged: boolean
  hoverPulse: number
  clickPulse: number
}

type ViewportSize = {
  width: number
  height: number
}

const BASE_SEED = hashSeed('gateway-neural-space-v2')

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

const sourceTargetIds = (source: string | NeuralNode, target: string | NeuralNode) => {
  const sourceId = typeof source === 'string' ? source : source.id
  const targetId = typeof target === 'string' ? target : target.id
  return { sourceId, targetId }
}

type TraversalKind = 'bfs' | 'dfs'

export const NeuralNetworkBackground = ({
  reducedMotion,
  ctaAnchor,
  ctaEngaged,
  hoverPulse,
  clickPulse,
}: NeuralNetworkBackgroundProps) => {
  const svgRef = useRef<SVGSVGElement>(null)
  const ctaAnchorRef = useRef<AnchorPoint | null>(ctaAnchor)
  const hoverPulseRef = useRef(hoverPulse)
  const clickPulseRef = useRef(clickPulse)

  const [viewport, setViewport] = useState<ViewportSize>({
    width: window.innerWidth,
    height: window.innerHeight,
  })

  const cleanupTimersRef = useRef<(() => void) | null>(null)
  const triggerHoverWaveRef = useRef<(() => void) | null>(null)
  const triggerClickWaveRef = useRef<(() => void) | null>(null)
  const pausePropagationRef = useRef<((durationMs: number) => void) | null>(null)

  ctaAnchorRef.current = ctaAnchor

  useEffect(() => {
    const onResize = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }

    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
    }
  }, [])

  const density = useMemo(
    () => resolveGatewayDensity(viewport.width, reducedMotion),
    [viewport.width, reducedMotion],
  )

  const brainShape = useMemo(
    () => createBrainShape(viewport.width, viewport.height, density.mobile),
    [density.mobile, viewport.height, viewport.width],
  )

  const clusterAnchors = useMemo(
    () => createClusterAnchors(brainShape, density.clusterCount),
    [brainShape, density.clusterCount],
  )

  const boundaryPoints = useMemo(
    () => createBrainBoundaryPoints(brainShape, Math.floor(density.nodeCount * 0.42)),
    [brainShape, density.nodeCount],
  )

  const graph = useMemo(
    () =>
      generateNeuralGraph({
        width: viewport.width,
        height: viewport.height,
        nodeCount: density.nodeCount,
        clusterCount: density.clusterCount,
        seed: BASE_SEED + density.nodeCount * 17 + density.clusterCount * 29,
        mobile: density.mobile,
        clusterAnchors,
        boundaryPoints,
        boundaryNodeCount: Math.floor(density.nodeCount * 0.42),
        projectPoint: (x, y) => projectInsideBrainShape(brainShape, x, y),
      }),
    [
      boundaryPoints,
      brainShape,
      clusterAnchors,
      density.clusterCount,
      density.mobile,
      density.nodeCount,
      viewport.height,
      viewport.width,
    ],
  )

  useEffect(() => {
    if (!svgRef.current) {
      return
    }

    const svg = select(svgRef.current)
    svg.selectAll('*').remove()
    svg.attr('viewBox', `0 0 ${viewport.width} ${viewport.height}`)

    const layerEdges = svg.append('g').attr('class', 'gateway-edges')
    const layerHalos = svg.append('g').attr('class', 'gateway-halos')
    const layerNodes = svg.append('g').attr('class', 'gateway-nodes')

    const lines = layerEdges
      .selectAll('line')
      .data(graph.links)
      .join('line')
      .attr('class', 'gateway-edge')

    const halos = layerHalos
      .selectAll('circle')
      .data(graph.nodes)
      .join('circle')
      .attr('class', 'gateway-halo')

    const nodes = layerNodes
      .selectAll('circle')
      .data(graph.nodes)
      .join('circle')
      .attr('class', 'gateway-node')

    const adjacency = buildAdjacency(graph.links)
    const nodeLookup = new Map(graph.nodes.map((node) => [node.id, node]))

    const nodeActivation = new Map<string, number>()
    const edgeActivation = new Map<string, number>()
    const timeoutIds = new Set<number>()
    const randomForWave = () => BASE_SEED + Math.floor(performance.now())
    const randomPicker = createSeededRandom(BASE_SEED + viewport.width + viewport.height)
    const nodePhase = new Map(
      graph.nodes.map((node) => [
        node.id,
        (node.id.charCodeAt(node.id.length - 1) + node.id.charCodeAt(0)) * 0.21,
      ]),
    )
    const pointerState = { x: 0, y: 0, active: false }

    let autoWaveTimer = 0
    let decayFrame = 0
    let pauseUntil = 0
    let waveIndex = 0

    const scheduleTimeout = (callback: () => void, delay: number) => {
      const timeoutId = window.setTimeout(() => {
        timeoutIds.delete(timeoutId)
        callback()
      }, delay)
      timeoutIds.add(timeoutId)
      return timeoutId
    }

    const stopAllTimers = () => {
      timeoutIds.forEach((timeoutId) => {
        window.clearTimeout(timeoutId)
      })
      timeoutIds.clear()

      if (autoWaveTimer) {
        window.clearTimeout(autoWaveTimer)
        autoWaveTimer = 0
      }
    }

    const activateNode = (nodeId: string, amount: number) => {
      const current = nodeActivation.get(nodeId) ?? 0
      nodeActivation.set(nodeId, Math.max(current, amount))
    }

    const activateEdge = (sourceId: string, targetId: string, amount: number) => {
      const key = edgeId(sourceId, targetId)
      const current = edgeActivation.get(key) ?? 0
      edgeActivation.set(key, Math.max(current, amount))
    }

    const nearestNodeId = (point: AnchorPoint | null) => {
      if (!point) {
        return null
      }

      let nearestId: string | null = null
      let nearestDistance = Number.POSITIVE_INFINITY

      graph.nodes.forEach((node) => {
        const x = node.x ?? viewport.width * 0.7
        const y = node.y ?? viewport.height * 0.5
        const distance = Math.hypot(x - point.x, y - point.y)

        if (distance < nearestDistance) {
          nearestDistance = distance
          nearestId = node.id
        }
      })

      return nearestId
    }

    const chooseAutoOrigin = () => {
      const candidates = graph.nodes.map((node) => node.id)
      if (candidates.length === 0) {
        return ''
      }
      const index = Math.floor(randomPicker() * candidates.length)
      return candidates[index] ?? candidates[0] ?? ''
    }

    const chooseDistantHub = (targetId: string) => {
      const target = nodeLookup.get(targetId)
      if (!target) {
        return chooseAutoOrigin()
      }

      const hubs = graph.hubNodeIds.length > 0 ? graph.hubNodeIds : graph.nodes.map((node) => node.id)

      const ranked = hubs
        .map((nodeId) => {
          const node = nodeLookup.get(nodeId)
          if (!node) {
            return { nodeId, score: -1 }
          }

          const dx = (node.x ?? 0) - (target.x ?? 0)
          const dy = (node.y ?? 0) - (target.y ?? 0)
          const score = Math.hypot(dx, dy) + (node.x ?? 0) * 0.12
          return { nodeId, score }
        })
        .sort((left, right) => right.score - left.score)

      return ranked[0]?.nodeId ?? chooseAutoOrigin()
    }

    const runWaveFrom = (originId: string, mode: 'auto' | 'focus', kind?: TraversalKind) => {
      if (!originId) {
        return
      }

      const traversalKind: TraversalKind = kind ?? (waveIndex % 2 === 0 ? 'bfs' : 'dfs')
      const traversal = (traversalKind === 'bfs' ? bfsTraversal : dfsTraversal)(adjacency, originId, {
        maxDepth: mode === 'focus' ? 3 : graph.nodes.length,
        maxVisited: mode === 'focus' ? Math.min(graph.nodes.length, 26) : graph.nodes.length,
        branchProbability: mode === 'focus' ? 0.94 : 1,
        seed: randomForWave(),
      })

      if (reducedMotion) {
        traversal.steps.forEach((step) => {
          activateNode(step.nodeId, 0.6)
          if (step.parentId) {
            activateEdge(step.parentId, step.nodeId, 0.5)
          }
        })
        return
      }

      const layerDelay = mode === 'focus' ? (density.mobile ? 96 : 82) : density.mobile ? 66 : 58
      const sortedDepth = [...traversal.byDepth.keys()].sort((left, right) => left - right)

      sortedDepth.forEach((depth) => {
        scheduleTimeout(() => {
          const layerNodesByDepth = traversal.byDepth.get(depth) ?? []
          const intensity = clamp(1 - depth * 0.08, 0.38, 1)
          layerNodesByDepth.forEach((nodeId) => activateNode(nodeId, intensity))

          traversal.steps
            .filter((step) => step.depth === depth && step.parentId)
            .forEach((step) => {
              activateEdge(step.parentId as string, step.nodeId, clamp(intensity * 0.95, 0.24, 1))
            })
        }, depth * layerDelay)
      })
    }

    const runPathToAnchor = (boost: 'hover' | 'click') => {
      const targetId = nearestNodeId(ctaAnchorRef.current)
      if (!targetId) {
        runWaveFrom(chooseAutoOrigin(), 'focus', 'bfs')
        return
      }

      const sourceId = chooseDistantHub(targetId)
      const path = findShortestPath(adjacency, sourceId, targetId)
      const baseIntensity = boost === 'click' ? 1 : 0.86
      const interval = boost === 'click' ? 86 : 114

      path.forEach((nodeId, index) => {
        scheduleTimeout(() => {
          activateNode(nodeId, clamp(baseIntensity - index * 0.06, 0.35, 1))
          if (index > 0) {
            const parentId = path[index - 1]
            if (parentId) {
              activateEdge(parentId, nodeId, clamp(baseIntensity - index * 0.08, 0.28, 0.9))
            }
          }
        }, interval * index)
      })

      scheduleTimeout(() => {
        runWaveFrom(targetId, 'focus', 'bfs')
      }, interval * path.length + 30)
    }

    const runWaveFromPointer = (point: AnchorPoint) => {
      const originId = nearestNodeId(point)
      if (!originId) {
        return
      }

      pauseUntil = Date.now() + 1800
      activateNode(originId, 1)
      runWaveFrom(originId, 'focus', 'bfs')
      scheduleTimeout(() => {
        runWaveFrom(originId, 'focus', 'dfs')
      }, 130)
    }

    const scheduleAutoWave = () => {
      const loop = () => {
        const delay = 2800 + Math.floor(Math.random() * 1700)
        autoWaveTimer = window.setTimeout(() => {
          if (Date.now() >= pauseUntil) {
            const traversalKind: TraversalKind = waveIndex % 2 === 0 ? 'bfs' : 'dfs'
            runWaveFrom(chooseAutoOrigin(), 'auto', traversalKind)
            waveIndex += 1
          }
          loop()
        }, delay)
      }

      loop()
    }

    const applyVisualState = () => {
      const groups = ['cluster-a', 'cluster-b', 'cluster-c', 'cluster-d', 'cluster-e', 'cluster-f']
      const now = performance.now()

      nodes
        .attr('r', (node) => {
          const active = nodeActivation.get(node.id) ?? 0
          const phase = nodePhase.get(node.id) ?? 0
          const pulse = active > 0.05 ? Math.sin(now * 0.02 + phase) * active * 3.2 : 0
          return node.radius + active * 5.6 + pulse
        })
        .attr('opacity', (node) => {
          const active = nodeActivation.get(node.id) ?? 0
          return clamp(0.64 + active * 0.36, 0.56, 1)
        })
        .attr('class', (node) => `gateway-node ${groups[node.group % groups.length] ?? 'cluster-a'}`)

      halos
        .attr('r', (node) => {
          const active = nodeActivation.get(node.id) ?? 0
          return node.radius * (1.3 + active * 5.2)
        })
        .attr('opacity', (node) => {
          const active = nodeActivation.get(node.id) ?? 0
          return clamp(0.14 + active * 0.62, 0.1, 0.78)
        })

      lines
        .attr('stroke-width', (link) => {
          const ids = sourceTargetIds(link.source, link.target)
          const active = edgeActivation.get(edgeId(ids.sourceId, ids.targetId)) ?? 0
          return 0.86 + link.weight * 1.25 + active * 3.4
        })
        .attr('opacity', (link) => {
          const ids = sourceTargetIds(link.source, link.target)
          const active = edgeActivation.get(edgeId(ids.sourceId, ids.targetId)) ?? 0
          return clamp(0.3 + link.weight * 0.22 + active * 0.72, 0.28, 1)
        })
        .attr('stroke', (link) => {
          const ids = sourceTargetIds(link.source, link.target)
          const active = edgeActivation.get(edgeId(ids.sourceId, ids.targetId)) ?? 0
          if (active > 0.72) {
            return 'rgba(232, 255, 129, 0.98)'
          }
          if (active > 0.38) {
            return 'rgba(178, 241, 178, 0.86)'
          }
          return 'rgba(176, 196, 208, 0.38)'
        })
        .attr('stroke-dasharray', (link) => {
          const ids = sourceTargetIds(link.source, link.target)
          const active = edgeActivation.get(edgeId(ids.sourceId, ids.targetId)) ?? 0
          return active > 0.32 ? '4 3' : 'none'
        })
        .attr('stroke-dashoffset', (link) => {
          const ids = sourceTargetIds(link.source, link.target)
          const active = edgeActivation.get(edgeId(ids.sourceId, ids.targetId)) ?? 0
          if (active <= 0.32) {
            return 0
          }
          return -((now * (0.06 + active * 0.22)) % 22)
        })
    }

    const decayLoop = () => {
      nodeActivation.forEach((value, nodeId) => {
        const next = value * (reducedMotion ? 0.9 : 0.88)
        if (next < 0.02) {
          nodeActivation.delete(nodeId)
        } else {
          nodeActivation.set(nodeId, next)
        }
      })

      edgeActivation.forEach((value, edgeKey) => {
        const next = value * (reducedMotion ? 0.9 : 0.86)
        if (next < 0.02) {
          edgeActivation.delete(edgeKey)
        } else {
          edgeActivation.set(edgeKey, next)
        }
      })

      applyVisualState()
      decayFrame = window.requestAnimationFrame(decayLoop)
    }

    const simulation = forceSimulation(graph.nodes)
      .force(
        'link',
        forceLink<NeuralNode, (typeof graph.links)[number]>(graph.links)
          .id((node) => node.id)
          .distance((link) => 88 + (1 - link.weight) * 68)
          .strength((link) => 0.08 + link.weight * 0.22),
      )
      .force('charge', forceManyBody().strength(density.mobile ? -28 : -36))
      .force('center', forceCenter(brainShape.centerX, brainShape.centerY))
      .force('collide', forceCollide<NeuralNode>().radius((node) => node.radius + 5).strength(0.65))
      .force(
        'x',
        forceX<NeuralNode>((node) => {
          const anchor = clusterAnchors[node.group] ?? { x: brainShape.centerX, y: brainShape.centerY }
          return anchor.x
        }).strength(0.04),
      )
      .force(
        'y',
        forceY<NeuralNode>((node) => {
          const anchor = clusterAnchors[node.group] ?? { x: brainShape.centerX, y: brainShape.centerY }
          return anchor.y
        }).strength(0.036),
      )
      .velocityDecay(reducedMotion ? 0.4 : 0.5)

    simulation.on('tick', () => {
      if (!reducedMotion && pointerState.active && !density.mobile) {
        graph.nodes.forEach((node) => {
          const nodeX = node.x ?? 0
          const nodeY = node.y ?? 0
          const dx = nodeX - pointerState.x
          const dy = nodeY - pointerState.y
          const dist = Math.hypot(dx, dy)

          if (dist > 0 && dist < 150) {
            const force = ((150 - dist) / 150) * 0.012
            node.vx = (node.vx ?? 0) + (dx / dist) * force
            node.vy = (node.vy ?? 0) + (dy / dist) * force
          }
        })
      }

      graph.nodes.forEach((node) => {
        const currentX = node.x ?? brainShape.centerX
        const currentY = node.y ?? brainShape.centerY
        if (!isInsideBrainShape(brainShape, currentX, currentY)) {
          const projected = projectInsideBrainShape(brainShape, currentX, currentY)
          node.x = currentX + (projected.x - currentX) * 0.58
          node.y = currentY + (projected.y - currentY) * 0.58
          node.vx = (node.vx ?? 0) * 0.78
          node.vy = (node.vy ?? 0) * 0.78
        }
      })

      lines
        .attr('x1', (link) => ((typeof link.source === 'string' ? null : link.source.x) ?? 0))
        .attr('y1', (link) => ((typeof link.source === 'string' ? null : link.source.y) ?? 0))
        .attr('x2', (link) => ((typeof link.target === 'string' ? null : link.target.x) ?? 0))
        .attr('y2', (link) => ((typeof link.target === 'string' ? null : link.target.y) ?? 0))

      nodes
        .attr('cx', (node) => node.x ?? 0)
        .attr('cy', (node) => node.y ?? 0)

      halos
        .attr('cx', (node) => node.x ?? 0)
        .attr('cy', (node) => node.y ?? 0)
    })

    if (reducedMotion) {
      for (let iteration = 0; iteration < 160; iteration += 1) {
        simulation.tick()
      }
      simulation.stop()
    } else {
      simulation.alpha(0.9)
      simulation.alphaTarget(0.018)
      simulation.restart()
    }

    const onPointerMove = (event: PointerEvent) => {
      pointerState.active = event.pointerType === 'mouse'
      pointerState.x = event.clientX
      pointerState.y = event.clientY
    }

    const onPointerLeave = () => {
      pointerState.active = false
    }

    const onSvgPointerDown = (event: PointerEvent) => {
      runWaveFromPointer({
        x: event.clientX,
        y: event.clientY,
      })
    }

    svgRef.current.addEventListener('pointerdown', onSvgPointerDown, { passive: true })

    if (!reducedMotion) {
      window.addEventListener('pointermove', onPointerMove, { passive: true })
      window.addEventListener('pointerleave', onPointerLeave, { passive: true })
    }

    pausePropagationRef.current = (durationMs: number) => {
      pauseUntil = Date.now() + durationMs
    }

    triggerHoverWaveRef.current = () => {
      pauseUntil = Date.now() + 1800
      runPathToAnchor('hover')
    }

    triggerClickWaveRef.current = () => {
      pauseUntil = Date.now() + 2600
      runPathToAnchor('click')
    }

    scheduleAutoWave()
    decayFrame = window.requestAnimationFrame(decayLoop)

    cleanupTimersRef.current = () => {
      stopAllTimers()
      window.cancelAnimationFrame(decayFrame)
      simulation.stop()
      svgRef.current?.removeEventListener('pointerdown', onSvgPointerDown)
      if (!reducedMotion) {
        window.removeEventListener('pointermove', onPointerMove)
        window.removeEventListener('pointerleave', onPointerLeave)
      }
    }

    return () => {
      cleanupTimersRef.current?.()
    }
  }, [
    brainShape,
    clusterAnchors,
    density.clusterCount,
    density.mobile,
    graph,
    reducedMotion,
    viewport.height,
    viewport.width,
  ])

  useEffect(() => {
    if (hoverPulse === hoverPulseRef.current) {
      return
    }

    hoverPulseRef.current = hoverPulse
    triggerHoverWaveRef.current?.()
  }, [hoverPulse])

  useEffect(() => {
    if (clickPulse === clickPulseRef.current) {
      return
    }

    clickPulseRef.current = clickPulse
    triggerClickWaveRef.current?.()
  }, [clickPulse])

  useEffect(() => {
    if (ctaEngaged) {
      pausePropagationRef.current?.(900)
    }
  }, [ctaEngaged])

  useEffect(() => {
    return () => {
      cleanupTimersRef.current?.()
    }
  }, [])

  return (
    <div className="gateway-neural-bg" aria-hidden="true">
      <svg ref={svgRef} className="gateway-neural-svg" />
    </div>
  )
}
