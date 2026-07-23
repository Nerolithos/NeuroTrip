import type { VisualFieldState } from '../../types/visualSystem'

export type RoutingResult = {
  field: VisualFieldState
  retinalPath: string
  chiasmRule: string
  targetLgn: 'left' | 'right' | 'bilateral'
  targetCortex: 'left' | 'right' | 'bilateral'
}

const CENTRAL_BAND = 0.06

export const resolveVisualFieldRouting = (x: number): RoutingResult => {
  if (Math.abs(x - 0.5) <= CENTRAL_BAND) {
    return {
      field: 'CENTRAL',
      retinalPath: 'Both hemifields near foveal center',
      chiasmRule: 'Nasal fibers cross; temporal fibers stay ipsilateral',
      targetLgn: 'bilateral',
      targetCortex: 'bilateral',
    }
  }

  if (x < 0.5) {
    return {
      field: 'LEFT_FIELD',
      retinalPath: 'Right halves of both retinas (left visual hemifield)',
      chiasmRule: 'Nasal fibers cross; temporal fibers stay ipsilateral',
      targetLgn: 'right',
      targetCortex: 'right',
    }
  }

  return {
    field: 'RIGHT_FIELD',
    retinalPath: 'Left halves of both retinas (right visual hemifield)',
    chiasmRule: 'Nasal fibers cross; temporal fibers stay ipsilateral',
    targetLgn: 'left',
    targetCortex: 'left',
  }
}
