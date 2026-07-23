export type ColorDeficiencyType =
  | 'normal'
  | 'protanomaly'
  | 'protanopia'
  | 'deuteranomaly'
  | 'deuteranopia'
  | 'tritanomaly'
  | 'tritanopia'

export type VisualFeedMode = 'split' | 'processed' | 'difference'

export type VisualFeedSourceMode = 'house-photo' | 'astigmatism-test-pattern'

export type VisualFieldState = 'LEFT_FIELD' | 'RIGHT_FIELD' | 'CENTRAL'

export type VisualFieldPoint = {
  x: number
  y: number
}

export type VisualInputState = {
  sourceImage: string
  sphereD: number
  cylinderD: number
  axisDeg: number
  objectDistanceM: number
  pupilDiameterMm: number
  colorDeficiencyType: ColorDeficiencyType
  colorDeficiencySeverity: number
  selectedVisualFieldPoint: VisualFieldPoint
  probeLocked: boolean
  selectedCorticalArea: string | null
  feedMode: VisualFeedMode
  feedSourceMode: VisualFeedSourceMode
}

export type VisualSource = {
  id: string
  title: string
  authors: string
  year: number
  doi?: string
  datasetUrl?: string
  usedFor: string[]
  limitations: string
}

export type CorticalArea = {
  id: string
  label: string
  hemisphere: 'left' | 'right' | 'bilateral'
  hierarchyStage: string
  broadFunction: string
  sourceId: string
  simplifiedGeometry: true
  anchor: {
    x: number
    y: number
  }
}
