import { create } from 'zustand'
import type {
  BehaviorId,
  InteractionEvent,
  MemoryFragment,
  RegionId,
} from '../types/neuro'

const defaultMemoryFragments: MemoryFragment[] = [
  {
    id: 'shadow-shape',
    label: 'A shape in peripheral vision',
    details: 'Edges flicker before object identity arrives.',
    intensity: 0.8,
  },
  {
    id: 'pulse-surge',
    label: 'Pulse spike',
    details: 'Heart acceleration precedes conscious labeling.',
    intensity: 0.84,
  },
  {
    id: 'old-corridor',
    label: 'Corridor memory',
    details: 'A similar hallway from years ago reappears.',
    intensity: 0.62,
  },
]

type NeuroTripState = {
  currentScene: string
  selectedBehavior: BehaviorId
  visitedRegions: RegionId[]
  disconnectedRegions: RegionId[]
  interactionHistory: InteractionEvent[]
  activationLevels: Record<string, number>
  idleDuration: number
  fearLevel: number
  habitStrength: number
  memoryFragments: MemoryFragment[]
  reducedMotion: boolean
  soundEnabled: boolean
  setCurrentScene: (scene: string) => void
  selectBehavior: (behaviorId: BehaviorId) => void
  visitRegion: (regionId: RegionId) => void
  toggleDisconnectedRegion: (regionId: RegionId) => void
  recordInteraction: (event: InteractionEvent) => void
  setActivationLevels: (levels: Record<string, number>) => void
  setIdleDuration: (seconds: number) => void
  setFearLevel: (fear: number) => void
  setHabitStrength: (habit: number) => void
  setMemoryFragments: (fragments: MemoryFragment[]) => void
  setReducedMotion: (enabled: boolean) => void
  setSoundEnabled: (enabled: boolean) => void
  resetTrip: () => void
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max)

export const useNeuroTripStore = create<NeuroTripState>((set) => ({
  currentScene: 'gateway',
  selectedBehavior: 'fear',
  visitedRegions: [],
  disconnectedRegions: [],
  interactionHistory: [],
  activationLevels: {
    'visual-cortex': 0.67,
    amygdala: 0.91,
    hippocampus: 0.63,
    'default-mode-network': 0.38,
  },
  idleDuration: 0,
  fearLevel: 0.25,
  habitStrength: 0.18,
  memoryFragments: defaultMemoryFragments,
  reducedMotion: false,
  soundEnabled: false,
  setCurrentScene: (scene) => set({ currentScene: scene }),
  selectBehavior: (behaviorId) => set({ selectedBehavior: behaviorId }),
  visitRegion: (regionId) =>
    set((state) => ({
      visitedRegions: state.visitedRegions.includes(regionId)
        ? state.visitedRegions
        : [...state.visitedRegions, regionId],
    })),
  toggleDisconnectedRegion: (regionId) =>
    set((state) => ({
      disconnectedRegions: state.disconnectedRegions.includes(regionId)
        ? state.disconnectedRegions.filter((id) => id !== regionId)
        : [...state.disconnectedRegions, regionId],
    })),
  recordInteraction: (event) =>
    set((state) => ({
      interactionHistory: [...state.interactionHistory.slice(-499), event],
      habitStrength:
        event.type === 'click'
          ? clamp(state.habitStrength + 0.02, 0, 1)
          : state.habitStrength,
    })),
  setActivationLevels: (levels) => set({ activationLevels: levels }),
  setIdleDuration: (seconds) => set({ idleDuration: seconds }),
  setFearLevel: (fear) => set({ fearLevel: clamp(fear, 0, 1) }),
  setHabitStrength: (habit) => set({ habitStrength: clamp(habit, 0, 1) }),
  setMemoryFragments: (fragments) => set({ memoryFragments: fragments }),
  setReducedMotion: (enabled) => set({ reducedMotion: enabled }),
  setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),
  resetTrip: () =>
    set((state) => ({
      currentScene: 'gateway',
      selectedBehavior: 'fear',
      visitedRegions: [],
      disconnectedRegions: [],
      interactionHistory: [],
      activationLevels: {
        'visual-cortex': 0.67,
        amygdala: 0.91,
        hippocampus: 0.63,
        'default-mode-network': 0.38,
      },
      idleDuration: 0,
      fearLevel: 0.25,
      habitStrength: 0.18,
      memoryFragments: defaultMemoryFragments,
      reducedMotion: state.reducedMotion,
      soundEnabled: state.soundEnabled,
    })),
}))
