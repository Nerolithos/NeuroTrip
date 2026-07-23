import type { ColorDeficiencyType } from '../../types/visualSystem'

type Matrix3x3 = [
  [number, number, number],
  [number, number, number],
  [number, number, number],
]

const IDENTITY: Matrix3x3 = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
]

const PROTAN: Matrix3x3 = [
  [0.152286, 1.052583, -0.204868],
  [0.114503, 0.786281, 0.099216],
  [-0.003882, -0.048116, 1.051998],
]

const DEUTERAN: Matrix3x3 = [
  [0.367322, 0.860646, -0.227968],
  [0.280085, 0.672501, 0.047413],
  [-0.01182, 0.04294, 0.968881],
]

const TRITAN: Matrix3x3 = [
  [1.255528, -0.076749, -0.178779],
  [-0.078411, 0.930809, 0.147602],
  [0.004733, 0.691367, 0.3039],
]

const clamp01 = (value: number) => Math.min(Math.max(value, 0), 1)

const ANOMALY_MAX_SEVERITY = 0.66
const OPIA_ONSET_SEVERITY = 0.74

const isAnomalyType = (deficiency: ColorDeficiencyType) =>
  deficiency === 'protanomaly' || deficiency === 'deuteranomaly' || deficiency === 'tritanomaly'

const isOpiaType = (deficiency: ColorDeficiencyType) =>
  deficiency === 'protanopia' || deficiency === 'deuteranopia' || deficiency === 'tritanopia'

const mixMatrix = (left: Matrix3x3, right: Matrix3x3, t: number): Matrix3x3 => {
  const k = clamp01(t)
  return [
    [
      left[0][0] + (right[0][0] - left[0][0]) * k,
      left[0][1] + (right[0][1] - left[0][1]) * k,
      left[0][2] + (right[0][2] - left[0][2]) * k,
    ],
    [
      left[1][0] + (right[1][0] - left[1][0]) * k,
      left[1][1] + (right[1][1] - left[1][1]) * k,
      left[1][2] + (right[1][2] - left[1][2]) * k,
    ],
    [
      left[2][0] + (right[2][0] - left[2][0]) * k,
      left[2][1] + (right[2][1] - left[2][1]) * k,
      left[2][2] + (right[2][2] - left[2][2]) * k,
    ],
  ]
}

const pickEndpointMatrix = (deficiency: ColorDeficiencyType): Matrix3x3 => {
  if (deficiency === 'protanomaly') {
    return mixMatrix(IDENTITY, PROTAN, 0.62)
  }

  if (deficiency === 'protanopia') {
    return PROTAN
  }

  if (deficiency === 'deuteranomaly') {
    return mixMatrix(IDENTITY, DEUTERAN, 0.62)
  }

  if (deficiency === 'deuteranopia') {
    return DEUTERAN
  }

  if (deficiency === 'tritanomaly') {
    return mixMatrix(IDENTITY, TRITAN, 0.62)
  }

  if (deficiency === 'tritanopia') {
    return TRITAN
  }

  return IDENTITY
}

const mix = (a: number, b: number, t: number) => a + (b - a) * t

const multiply = (matrix: Matrix3x3, rgb: [number, number, number]): [number, number, number] => {
  const r = matrix[0][0] * rgb[0] + matrix[0][1] * rgb[1] + matrix[0][2] * rgb[2]
  const g = matrix[1][0] * rgb[0] + matrix[1][1] * rgb[1] + matrix[1][2] * rgb[2]
  const b = matrix[2][0] * rgb[0] + matrix[2][1] * rgb[1] + matrix[2][2] * rgb[2]
  return [clamp01(r), clamp01(g), clamp01(b)]
}

const mapSeverity = (deficiency: ColorDeficiencyType, severity: number) => {
  const t = clamp01(severity)

  if (isAnomalyType(deficiency)) {
    return Math.pow(t, 1.08) * ANOMALY_MAX_SEVERITY
  }

  if (isOpiaType(deficiency)) {
    return OPIA_ONSET_SEVERITY + (1 - OPIA_ONSET_SEVERITY) * Math.pow(t, 0.86)
  }

  return 0
}

export type ColorDeficiencyProfile = {
  regime: 'normal' | 'anomaly' | 'opia'
  effectiveSeverity: number
  anomalyMaxSeverity: number
  opiaOnsetSeverity: number
}

export const getColorDeficiencyProfile = (
  deficiency: ColorDeficiencyType,
  severity: number,
): ColorDeficiencyProfile => {
  if (deficiency === 'normal') {
    return {
      regime: 'normal',
      effectiveSeverity: 0,
      anomalyMaxSeverity: ANOMALY_MAX_SEVERITY,
      opiaOnsetSeverity: OPIA_ONSET_SEVERITY,
    }
  }

  return {
    regime: isOpiaType(deficiency) ? 'opia' : 'anomaly',
    effectiveSeverity: mapSeverity(deficiency, severity),
    anomalyMaxSeverity: ANOMALY_MAX_SEVERITY,
    opiaOnsetSeverity: OPIA_ONSET_SEVERITY,
  }
}

export const applyMachadoApproximation = (
  rgbLinear: [number, number, number],
  deficiency: ColorDeficiencyType,
  severity: number,
): [number, number, number] => {
  if (deficiency === 'normal' || severity <= 0) {
    return rgbLinear
  }

  const endpoint = pickEndpointMatrix(deficiency)
  const transformed = multiply(endpoint, rgbLinear)
  const t = mapSeverity(deficiency, severity)

  return [
    mix(rgbLinear[0], transformed[0], t),
    mix(rgbLinear[1], transformed[1], t),
    mix(rgbLinear[2], transformed[2], t),
  ]
}
