export type RegionId =
  | 'visual-cortex'
  | 'amygdala'
  | 'hippocampus'
  | 'default-mode-network'

export type BehaviorId = 'fear' | 'memory' | 'attention' | 'language'

export type InteractionEventType =
  | 'scene-enter'
  | 'scene-exit'
  | 'pointer-move'
  | 'click'
  | 'toggle-disconnect'
  | 'behavior-select'
  | 'memory-reconstruct'
  | 'idle-shift'

export type InteractionEvent = {
  type: InteractionEventType
  scene: string
  timestamp: number
  value?: number
  target?: string
  metadata?: Record<string, string | number | boolean>
}

export type RegionData = {
  id: RegionId
  name: string
  displayName: string
  description: string
  scientificNote: string
  functions: string[]
  visualTheme: string
  interactionMode: string
  disconnectEffect: string
  position: {
    x: number
    y: number
    z: number
  }
}

export type BehaviorRegionActivation = {
  regionId: RegionId
  activation: number
  confidence: number
  note: string
}

export type BehaviorData = {
  id: BehaviorId
  name: string
  summary: string
  normalized: boolean
  illustrative: boolean
  regions: BehaviorRegionActivation[]
}

export type ConnectionData = {
  source: RegionId
  target: RegionId
  weight: number
  behavior: BehaviorId
  type: 'functional-association' | 'structural-association' | 'statistical-link'
  normalized: boolean
  illustrative: boolean
}

export type SourceData = {
  id: string
  name: string
  url: string
  dataType: string
  simplification: string
  usageScope: string
  limitations: string
}

export type StoryChapter = {
  id: string
  route: string
  title: string
  subtitle: string
  regionId?: RegionId
}

export type MemoryFragment = {
  id: string
  label: string
  details: string
  intensity: number
}

export type JourneySignature = {
  threatSensitive: number
  curiosity: number
  memorySeeking: number
  habitResistance: number
}
