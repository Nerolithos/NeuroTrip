type Point = {
  x: number
  y: number
}

export type BrainShape = {
  centerX: number
  centerY: number
  width: number
  height: number
  outline: Point[]
}

const REFERENCE_OUTLINE: ReadonlyArray<Point> = [
  { x: -0.02, y: -0.49 },
  { x: -0.07, y: -0.47 },
  { x: -0.12, y: -0.5 },
  { x: -0.18, y: -0.46 },
  { x: -0.24, y: -0.49 },
  { x: -0.3, y: -0.44 },
  { x: -0.36, y: -0.46 },
  { x: -0.42, y: -0.4 },
  { x: -0.48, y: -0.37 },
  { x: -0.51, y: -0.32 },
  { x: -0.56, y: -0.27 },
  { x: -0.58, y: -0.21 },
  { x: -0.62, y: -0.16 },
  { x: -0.61, y: -0.09 },
  { x: -0.59, y: -0.03 },
  { x: -0.61, y: 0.04 },
  { x: -0.58, y: 0.1 },
  { x: -0.6, y: 0.16 },
  { x: -0.56, y: 0.22 },
  { x: -0.55, y: 0.29 },
  { x: -0.49, y: 0.33 },
  { x: -0.47, y: 0.39 },
  { x: -0.41, y: 0.41 },
  { x: -0.36, y: 0.46 },
  { x: -0.3, y: 0.45 },
  { x: -0.24, y: 0.49 },
  { x: -0.17, y: 0.46 },
  { x: -0.1, y: 0.49 },
  { x: -0.03, y: 0.47 },
  { x: 0.03, y: 0.48 },
  { x: 0.1, y: 0.45 },
  { x: 0.17, y: 0.47 },
  { x: 0.23, y: 0.42 },
  { x: 0.29, y: 0.43 },
  { x: 0.33, y: 0.37 },
  { x: 0.36, y: 0.48 },
  { x: 0.39, y: 0.59 },
  { x: 0.45, y: 0.64 },
  { x: 0.5, y: 0.59 },
  { x: 0.48, y: 0.5 },
  { x: 0.51, y: 0.43 },
  { x: 0.57, y: 0.38 },
  { x: 0.61, y: 0.32 },
  { x: 0.63, y: 0.25 },
  { x: 0.62, y: 0.18 },
  { x: 0.64, y: 0.11 },
  { x: 0.62, y: 0.04 },
  { x: 0.63, y: -0.03 },
  { x: 0.6, y: -0.1 },
  { x: 0.61, y: -0.16 },
  { x: 0.57, y: -0.22 },
  { x: 0.54, y: -0.29 },
  { x: 0.48, y: -0.34 },
  { x: 0.44, y: -0.4 },
  { x: 0.37, y: -0.41 },
  { x: 0.31, y: -0.45 },
  { x: 0.24, y: -0.44 },
  { x: 0.18, y: -0.48 },
  { x: 0.11, y: -0.45 },
  { x: 0.05, y: -0.49 },
]

const ORIGIN_POINT: Point = { x: 0, y: 0 }

const REFERENCE_BOUNDS = REFERENCE_OUTLINE.reduce(
  (acc, point) => ({
    minX: Math.min(acc.minX, point.x),
    maxX: Math.max(acc.maxX, point.x),
    minY: Math.min(acc.minY, point.y),
    maxY: Math.max(acc.maxY, point.y),
  }),
  {
    minX: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY,
  },
)

const pointOnSegment = (point: Point, left: Point, right: Point) => {
  const dx = right.x - left.x
  const dy = right.y - left.y
  const lengthSquared = dx * dx + dy * dy
  if (lengthSquared === 0) {
    return left
  }

  const t = ((point.x - left.x) * dx + (point.y - left.y) * dy) / lengthSquared
  const clampedT = Math.min(Math.max(t, 0), 1)
  return {
    x: left.x + dx * clampedT,
    y: left.y + dy * clampedT,
  }
}

const distanceSquared = (left: Point, right: Point) => {
  const dx = left.x - right.x
  const dy = left.y - right.y
  return dx * dx + dy * dy
}

const pointInPolygon = (point: Point, polygon: Point[]) => {
  if (polygon.length < 3) {
    return false
  }

  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const pi = polygon[i]
    const pj = polygon[j]
    if (!pi || !pj) {
      continue
    }

    const intersects =
      (pi.y > point.y) !== (pj.y > point.y) &&
      point.x < ((pj.x - pi.x) * (point.y - pi.y)) / (pj.y - pi.y + Number.EPSILON) + pi.x

    if (intersects) {
      inside = !inside
    }
  }

  return inside
}

export const createBrainShape = (width: number, height: number, mobile: boolean): BrainShape => {
  const marginX = mobile ? 12 : 18
  const marginY = mobile ? 14 : 18
  const availableWidth = Math.max(240, width - marginX * 2)
  const availableHeight = Math.max(260, height - marginY * 2)

  const targetWidth = availableWidth * (mobile ? 0.9 : 0.66)
  const targetHeight = availableHeight * (mobile ? 0.78 : 0.82)

  const sourceWidth = Math.max(0.01, REFERENCE_BOUNDS.maxX - REFERENCE_BOUNDS.minX)
  const sourceHeight = Math.max(0.01, REFERENCE_BOUNDS.maxY - REFERENCE_BOUNDS.minY)
  const scale = Math.min(targetWidth / sourceWidth, targetHeight / sourceHeight)

  let centerX = width * (mobile ? 0.53 : 0.66)
  let centerY = height * (mobile ? 0.54 : 0.52)

  let outline = REFERENCE_OUTLINE.map((point) => ({
    x: centerX + point.x * scale,
    y: centerY + point.y * scale,
  }))

  const fitBounds = outline.reduce(
    (acc, point) => ({
      minX: Math.min(acc.minX, point.x),
      maxX: Math.max(acc.maxX, point.x),
      minY: Math.min(acc.minY, point.y),
      maxY: Math.max(acc.maxY, point.y),
    }),
    {
      minX: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
    },
  )

  let shiftX = 0
  let shiftY = 0
  if (fitBounds.minX < marginX) {
    shiftX += marginX - fitBounds.minX
  }
  if (fitBounds.maxX > width - marginX) {
    shiftX -= fitBounds.maxX - (width - marginX)
  }
  if (fitBounds.minY < marginY) {
    shiftY += marginY - fitBounds.minY
  }
  if (fitBounds.maxY > height - marginY) {
    shiftY -= fitBounds.maxY - (height - marginY)
  }

  if (shiftX !== 0 || shiftY !== 0) {
    outline = outline.map((point) => ({
      x: point.x + shiftX,
      y: point.y + shiftY,
    }))
    centerX += shiftX
    centerY += shiftY
  }

  const finalBounds = outline.reduce(
    (acc, point) => ({
      minX: Math.min(acc.minX, point.x),
      maxX: Math.max(acc.maxX, point.x),
      minY: Math.min(acc.minY, point.y),
      maxY: Math.max(acc.maxY, point.y),
    }),
    {
      minX: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
    },
  )

  return {
    centerX: (finalBounds.minX + finalBounds.maxX) / 2,
    centerY: (finalBounds.minY + finalBounds.maxY) / 2,
    width: finalBounds.maxX - finalBounds.minX,
    height: finalBounds.maxY - finalBounds.minY,
    outline,
  }
}

export const isInsideBrainShape = (shape: BrainShape, x: number, y: number) => {
  return pointInPolygon({ x, y }, shape.outline)
}

export const projectInsideBrainShape = (shape: BrainShape, x: number, y: number) => {
  if (isInsideBrainShape(shape, x, y)) {
    return { x, y }
  }

  const point = { x, y }
  const center = { x: shape.centerX, y: shape.centerY }

  let best = center
  let bestDistance = Number.POSITIVE_INFINITY

  if (shape.outline.length === 0) {
    return center
  }

  for (let index = 0; index < shape.outline.length; index += 1) {
    const left = shape.outline[index]
    const right = shape.outline[(index + 1) % shape.outline.length]
    if (!left || !right) {
      continue
    }

    const onSegment = pointOnSegment(point, left, right)
    const candidateDistance = distanceSquared(point, onSegment)
    if (candidateDistance < bestDistance) {
      bestDistance = candidateDistance
      best = onSegment
    }
  }

  for (let step = 1; step <= 22; step += 1) {
    const t = step / 22
    const candidate = {
      x: best.x + (center.x - best.x) * t * 0.08,
      y: best.y + (center.y - best.y) * t * 0.08,
    }
    if (isInsideBrainShape(shape, candidate.x, candidate.y)) {
      return candidate
    }
  }

  return center
}

export const createBrainBoundaryPoints = (shape: BrainShape, count: number) => {
  if (count <= 0 || shape.outline.length === 0) {
    return []
  }

  const perimeterSegments = shape.outline.map((point, index) => {
    const next =
      shape.outline[(index + 1) % shape.outline.length] ?? shape.outline[0] ?? ORIGIN_POINT
    const length = Math.hypot(next.x - point.x, next.y - point.y)
    return { from: point, to: next, length }
  })

  const totalLength = perimeterSegments.reduce((acc, segment) => acc + segment.length, 0)
  if (totalLength <= 0) {
    return [...shape.outline]
  }

  const points: Point[] = []
  const fallbackPoint = shape.outline[0] ?? ORIGIN_POINT

  for (let index = 0; index < count; index += 1) {
    const targetLength = (index / count) * totalLength
    let walked = 0
    let sampled = fallbackPoint

    for (const segment of perimeterSegments) {
      if (walked + segment.length >= targetLength) {
        const remaining = targetLength - walked
        const ratio = segment.length === 0 ? 0 : remaining / segment.length
        sampled = {
          x: segment.from.x + (segment.to.x - segment.from.x) * ratio,
          y: segment.from.y + (segment.to.y - segment.from.y) * ratio,
        }
        break
    }

      walked += segment.length
    }

    points.push(sampled)
  }

  return points
}

export const createClusterAnchors = (shape: BrainShape, clusterCount: number) => {
  const normalizedAnchors = [
    { x: -0.34, y: -0.23 },
    { x: -0.11, y: -0.31 },
    { x: 0.15, y: -0.26 },
    { x: 0.31, y: -0.08 },
    { x: -0.3, y: 0.06 },
    { x: -0.02, y: 0.1 },
    { x: 0.24, y: 0.08 },
    { x: 0.12, y: 0.28 },
  ]

  return Array.from({ length: clusterCount }, (_, index) => {
    const anchor =
      normalizedAnchors[index % normalizedAnchors.length] ??
      normalizedAnchors[0] ??
      ({ x: 0, y: 0 } as const)
    const roughX = shape.centerX + anchor.x * shape.width * 0.9
    const roughY = shape.centerY + anchor.y * shape.height * 0.9
    return projectInsideBrainShape(shape, roughX, roughY)
  })
}
