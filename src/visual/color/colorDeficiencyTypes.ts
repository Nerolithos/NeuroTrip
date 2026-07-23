import type { ColorDeficiencyType } from '../../types/visualSystem'

export const deficiencyLabels: Record<ColorDeficiencyType, string> = {
  normal: 'Typical Trichromacy',
  protanomaly: 'Protanomaly',
  protanopia: 'Protanopia',
  deuteranomaly: 'Deuteranomaly',
  deuteranopia: 'Deuteranopia',
  tritanomaly: 'Tritanomaly',
  tritanopia: 'Tritanopia',
}
