const DEG_TO_RAD = Math.PI / 180

const wrapAxis180 = (axisDeg: number) => {
  if (axisDeg === 180) {
    return 180
  }

  return ((axisDeg % 180) + 180) % 180
}

const normalizeRad0ToPi = (angleRad: number) => {
  const period = Math.PI
  return ((angleRad % period) + period) % period
}

// Clinical axis marks the meridian with zero cylinder power.
// The strongest blur occurs along the perpendicular power meridian (axis + 90 deg).
// Canvas image coordinates have +y downward, so mathematical angle sign is inverted.
export const prescriptionAxisToImageAngle = (axisDeg: number) => {
  const normalizedAxis = wrapAxis180(axisDeg)
  const blurMeridianDeg = normalizedAxis + 90
  return -blurMeridianDeg * DEG_TO_RAD
}

export const axisAnglesEquivalent = (leftRad: number, rightRad: number, tolerance = 1e-8) => {
  const left = normalizeRad0ToPi(leftRad)
  const right = normalizeRad0ToPi(rightRad)
  const delta = Math.abs(left - right)
  const wrapped = Math.min(delta, Math.PI - delta)
  return wrapped <= tolerance
}
