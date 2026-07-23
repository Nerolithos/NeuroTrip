import { create } from 'zustand'
import type {
  ColorDeficiencyType,
  VisualFeedMode,
  VisualFeedSourceMode,
  VisualFieldPoint,
  VisualInputState,
} from '../types/visualSystem'

export type VisualConsoleWindowId =
  | 'live-feed'
  | 'refraction-lab'
  | 'color-deficiency'
  | 'visual-routing'
  | 'cortical-atlas'

type VisualSystemsState = {
  visualInput: VisualInputState
  activeWindow: VisualConsoleWindowId
  updateVisualInput: (patch: Partial<VisualInputState>) => void
  setProbePoint: (point: VisualFieldPoint) => void
  setFeedMode: (mode: VisualFeedMode) => void
  setFeedSourceMode: (mode: VisualFeedSourceMode) => void
  setDeficiencyType: (deficiency: ColorDeficiencyType) => void
  setActiveWindow: (windowId: VisualConsoleWindowId) => void
  resetVisualInput: () => void
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

const normalizeAxis = (value: number) => {
  if (value === 180) {
    return 180
  }
  const normalized = ((value % 180) + 180) % 180
  return normalized
}

const defaultVisualInput: VisualInputState = {
  sourceImage: '',
  sphereD: 0,
  cylinderD: 0,
  axisDeg: 90,
  objectDistanceM: 2,
  pupilDiameterMm: 4,
  colorDeficiencyType: 'normal',
  colorDeficiencySeverity: 0,
  selectedVisualFieldPoint: { x: 0.5, y: 0.5 },
  probeLocked: false,
  selectedCorticalArea: null,
  feedMode: 'split',
  feedSourceMode: 'house-photo',
}

export const useVisualSystemsStore = create<VisualSystemsState>((set) => ({
  visualInput: defaultVisualInput,
  activeWindow: 'live-feed',
  updateVisualInput: (patch) =>
    set((state) => {
      const next: VisualInputState = {
        ...state.visualInput,
        ...patch,
      }

      next.sphereD = clamp(next.sphereD, -10, 8)
      next.cylinderD = clamp(next.cylinderD, -6, 0)
      next.axisDeg = normalizeAxis(clamp(next.axisDeg, 0, 180))
      next.objectDistanceM = clamp(next.objectDistanceM, 0.25, 20)
      next.pupilDiameterMm = clamp(next.pupilDiameterMm, 2, 8)
      next.colorDeficiencySeverity = clamp(next.colorDeficiencySeverity, 0, 1)
      next.selectedVisualFieldPoint = {
        x: clamp(next.selectedVisualFieldPoint.x, 0, 1),
        y: clamp(next.selectedVisualFieldPoint.y, 0, 1),
      }

      return { visualInput: next }
    }),
  setProbePoint: (point) =>
    set((state) => ({
      visualInput: {
        ...state.visualInput,
        selectedVisualFieldPoint: {
          x: clamp(point.x, 0, 1),
          y: clamp(point.y, 0, 1),
        },
      },
    })),
  setFeedMode: (mode) =>
    set((state) => ({
      visualInput: {
        ...state.visualInput,
        feedMode: mode,
      },
    })),
  setFeedSourceMode: (mode) =>
    set((state) => ({
      visualInput: {
        ...state.visualInput,
        feedSourceMode: mode,
      },
    })),
  setDeficiencyType: (deficiency) =>
    set((state) => ({
      visualInput: {
        ...state.visualInput,
        colorDeficiencyType: deficiency,
      },
    })),
  setActiveWindow: (windowId) => set({ activeWindow: windowId }),
  resetVisualInput: () =>
    set((state) => ({
      visualInput: {
        ...defaultVisualInput,
        sourceImage: state.visualInput.sourceImage,
      },
      activeWindow: 'live-feed',
    })),
}))
