type PhaseDurations = {
  signalLocked: number
  orbitAlign: number
  cameraDive: number
  networkCollapse: number
  snowDrift: number
  crtShutdown: number
  blackHold: number
  eyeOpen: number
  eyeCalibration: number
  blinkWindow: number
  chapterReveal: number
  chapterHold: number
}

export type TransitionFrameState = {
  worldRotateDeg: number
  worldScale: number
  worldXvw: number
  worldYvh: number
  worldBlurPx: number
  worldContrast: number
  worldSaturate: number
  worldBrightness: number
  rgbSplitPx: number
  rgbIntensity: number
  noiseOpacity: number
  snowOpacity: number
  snowConverge: number
  scanlineOpacity: number
  driftDeg: number
  networkOpacity: number
  copyShiftPx: number
  copyBlurPx: number
  copyOpacity: number
  crtTopPct: number
  crtBottomPct: number
  crtLeftPct: number
  crtRightPct: number
  crtLineOpacity: number
  crtPointOpacity: number
  crtFlashOpacity: number
  blackoutOpacity: number
  eyeOpacity: number
  eyeAperturePct: number
  eyeBlurPx: number
  eyeClarity: number
  eyeScale: number
  crosshairOpacity: number
  eyelidCoverPct: number
  chapterPower: number
  chapterFlicker: number
  chapterOpacity: number
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

const easeInCubic = (value: number) => value * value * value
const easeOutCubic = (value: number) => 1 - (1 - value) * (1 - value) * (1 - value)
const easeInOutCubic = (value: number) =>
  value < 0.5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2

const lerp = (from: number, to: number, progress: number) => from + (to - from) * progress

const phase = (time: number, start: number, duration: number) => clamp((time - start) / duration, 0, 1)

const pseudoRandom = (seed: number, index: number) => {
  const value = Math.sin(seed * 12.9898 + index * 78.233) * 43758.5453
  return value - Math.floor(value)
}

const blinkWithHardClosure = (progress: number) => {
  if (progress <= 0 || progress >= 1) {
    return 0
  }
  if (progress < 0.34) {
    return easeOutCubic(progress / 0.34)
  }
  if (progress < 0.66) {
    return 1
  }
  return 1 - easeInOutCubic((progress - 0.66) / 0.34)
}

const scheduledTransitionBlink = (progress: number, blinkSeed: number) => {
  const firstStart = 0.2
  const firstDuration = 0.22
  const secondOffset = (pseudoRandom(blinkSeed, 201) - 0.5) * 0.05
  const secondStart = clamp(0.63 + secondOffset, 0.56, 0.72)
  const secondDuration = 0.24

  const firstLocal = (progress - firstStart) / firstDuration
  const secondLocal = (progress - secondStart) / secondDuration
  return Math.max(blinkWithHardClosure(firstLocal), blinkWithHardClosure(secondLocal))
}

export const createTransitionDurations = (reducedMotion: boolean): PhaseDurations => {
  if (reducedMotion) {
    return {
      signalLocked: 650,
      orbitAlign: 680,
      cameraDive: 900,
      networkCollapse: 820,
      snowDrift: 560,
      crtShutdown: 470,
      blackHold: 220,
      eyeOpen: 520,
      eyeCalibration: 360,
      blinkWindow: 760,
      chapterReveal: 640,
      chapterHold: 360,
    }
  }

  return {
    signalLocked: 1100,
    orbitAlign: 1200,
    cameraDive: 1800,
    networkCollapse: 1700,
    snowDrift: 1250,
    crtShutdown: 760,
    blackHold: 520,
    eyeOpen: 920,
    eyeCalibration: 920,
    blinkWindow: 1600,
    chapterReveal: 1200,
    chapterHold: 420,
  }
}

export const getTransitionTotalDuration = (durations: PhaseDurations) =>
  Object.values(durations).reduce((sum, value) => sum + value, 0)

export const computeAwaitingBlinkCover = (waitingMs: number, blinkSeed: number) => {
  let remaining = waitingMs
  let cycleIndex = 0

  while (cycleIndex < 32) {
    const jitterMs = (pseudoRandom(blinkSeed, cycleIndex * 19 + 5) - 0.5) * 1000
    const cycleMs = 2300 + jitterMs

    if (remaining <= cycleMs) {
      const blinkStartMs = cycleMs * (0.66 + pseudoRandom(blinkSeed, cycleIndex * 23 + 9) * 0.08)
      const blinkDurationMs = 270 + pseudoRandom(blinkSeed, cycleIndex * 29 + 13) * 170
      const primaryLocal = (remaining - blinkStartMs) / blinkDurationMs

      let closure = blinkWithHardClosure(primaryLocal)

      const hasDoubleBlink = pseudoRandom(blinkSeed, cycleIndex * 31 + 3) < 0.2
      if (hasDoubleBlink) {
        const secondGapMs = 90 + pseudoRandom(blinkSeed, cycleIndex * 37 + 7) * 120
        const secondDurationMs = 240 + pseudoRandom(blinkSeed, cycleIndex * 41 + 11) * 150
        const secondStartMs = blinkStartMs + blinkDurationMs + secondGapMs
        const secondLocal = (remaining - secondStartMs) / secondDurationMs
        closure = Math.max(closure, blinkWithHardClosure(secondLocal))
      }

      return 52 * closure
    }

    remaining -= cycleMs
    cycleIndex += 1
  }

  return 0
}

export const computeAwaitingChapterFlicker = (waitingMs: number) => {
  const waveA = 0.38 + 0.62 * (Math.sin(waitingMs * 0.0058) * 0.5 + 0.5)
  const waveB = 0.36 + 0.64 * (Math.sin(waitingMs * 0.0034 + 1.7) * 0.5 + 0.5)
  return clamp((waveA * 0.58 + waveB * 0.42) * 0.28, 0, 0.42)
}

export const computeTransitionFrameState = (
  elapsedMs: number,
  durations: PhaseDurations,
  blinkSeed = 0,
): TransitionFrameState => {
  const boundaries = {
    signalLockedStart: 0,
    orbitAlignStart: durations.signalLocked,
    cameraDiveStart: durations.signalLocked + durations.orbitAlign,
    networkCollapseStart: durations.signalLocked + durations.orbitAlign + durations.cameraDive,
    snowDriftStart:
      durations.signalLocked + durations.orbitAlign + durations.cameraDive + durations.networkCollapse,
    crtShutdownStart:
      durations.signalLocked +
      durations.orbitAlign +
      durations.cameraDive +
      durations.networkCollapse +
      durations.snowDrift,
    blackHoldStart:
      durations.signalLocked +
      durations.orbitAlign +
      durations.cameraDive +
      durations.networkCollapse +
      durations.snowDrift +
      durations.crtShutdown,
    eyeOpenStart:
      durations.signalLocked +
      durations.orbitAlign +
      durations.cameraDive +
      durations.networkCollapse +
      durations.snowDrift +
      durations.crtShutdown +
      durations.blackHold,
    eyeCalibrationStart:
      durations.signalLocked +
      durations.orbitAlign +
      durations.cameraDive +
      durations.networkCollapse +
      durations.snowDrift +
      durations.crtShutdown +
      durations.blackHold +
      durations.eyeOpen,
    blinkWindowStart:
      durations.signalLocked +
      durations.orbitAlign +
      durations.cameraDive +
      durations.networkCollapse +
      durations.snowDrift +
      durations.crtShutdown +
      durations.blackHold +
      durations.eyeOpen +
      durations.eyeCalibration,
    chapterRevealStart:
      durations.signalLocked +
      durations.orbitAlign +
      durations.cameraDive +
      durations.networkCollapse +
      durations.snowDrift +
      durations.crtShutdown +
      durations.blackHold +
      durations.eyeOpen +
      durations.eyeCalibration +
      durations.blinkWindow,
    chapterHoldStart:
      durations.signalLocked +
      durations.orbitAlign +
      durations.cameraDive +
      durations.networkCollapse +
      durations.snowDrift +
      durations.crtShutdown +
      durations.blackHold +
      durations.eyeOpen +
      durations.eyeCalibration +
      durations.blinkWindow +
      durations.chapterReveal,
  }

  const signalLockedP = phase(elapsedMs, boundaries.signalLockedStart, durations.signalLocked)
  const orbitAlignP = phase(elapsedMs, boundaries.orbitAlignStart, durations.orbitAlign)
  const cameraDiveP = phase(elapsedMs, boundaries.cameraDiveStart, durations.cameraDive)
  const networkCollapseP = phase(elapsedMs, boundaries.networkCollapseStart, durations.networkCollapse)
  const snowDriftP = phase(elapsedMs, boundaries.snowDriftStart, durations.snowDrift)
  const crtShutdownP = phase(elapsedMs, boundaries.crtShutdownStart, durations.crtShutdown)
  const blackHoldP = phase(elapsedMs, boundaries.blackHoldStart, durations.blackHold)
  const eyeOpenP = phase(elapsedMs, boundaries.eyeOpenStart, durations.eyeOpen)
  const eyeCalibrationP = phase(elapsedMs, boundaries.eyeCalibrationStart, durations.eyeCalibration)
  const blinkWindowP = phase(elapsedMs, boundaries.blinkWindowStart, durations.blinkWindow)
  const chapterRevealP = phase(elapsedMs, boundaries.chapterRevealStart, durations.chapterReveal)
  const chapterHoldP = phase(elapsedMs, boundaries.chapterHoldStart, durations.chapterHold)

  const orbitEase = easeInOutCubic(orbitAlignP)
  const diveEase = easeInCubic(cameraDiveP)
  const collapseEase = easeInOutCubic(networkCollapseP)
  const snowDriftEase = easeInOutCubic(snowDriftP)

  const worldRotateDeg = 0
  const worldScale =
    1 + 0.08 * signalLockedP + 0.18 * orbitEase + 2.2 * diveEase + 0.5 * collapseEase + 0.26 * snowDriftEase
  const worldXvw = lerp(0, -11.8, orbitEase) + lerp(0, -21.8, diveEase) + lerp(0, -3.2, snowDriftEase)
  const worldYvh = lerp(0, 1.2, orbitEase) + lerp(0, 6.9, diveEase) + lerp(0, 1.1, snowDriftEase)

  const worldBlurPx = 0.06 * signalLockedP + 0.38 * cameraDiveP + 0.96 * collapseEase + 0.38 * snowDriftEase
  const worldContrast = 1 + 0.18 * cameraDiveP + 0.46 * collapseEase + 0.12 * snowDriftEase
  const worldSaturate = 1.05 - 0.47 * collapseEase - 0.18 * snowDriftEase
  const worldBrightness = 1 - 0.24 * collapseEase - 0.1 * snowDriftEase

  const rgbSplitPx = 3.2 * cameraDiveP + 22.8 * collapseEase + 13.6 * snowDriftEase + 5.2 * crtShutdownP
  const rgbIntensity = clamp(
    0.55 * cameraDiveP + 1.45 * collapseEase + 1.25 * snowDriftEase + 0.45 * crtShutdownP,
    0,
    1,
  )

  const snowConverge = clamp((crtShutdownP - 0.14) / 0.86, 0, 1)

  let crtTopPct = 0
  let crtBottomPct = 0
  let crtLeftPct = 0
  let crtRightPct = 0
  let crtLineOpacity = 0
  let crtPointOpacity = 0
  let crtFlashOpacity = 0

  if (crtShutdownP > 0) {
    const collapseP = easeInOutCubic(Math.min(crtShutdownP / 0.84, 1))
    crtTopPct = 49.2 * collapseP
    crtBottomPct = 49.2 * collapseP
    crtLeftPct = 0
    crtRightPct = 0
    crtPointOpacity = 0

    // Smooth bell-shaped flash near shutdown completion to avoid visible phase jumps.
    const flashCenter = 0.9
    const flashSpread = 0.085
    const flashBell = Math.exp(-Math.pow((crtShutdownP - flashCenter) / flashSpread, 2))

    crtLineOpacity = clamp(0.18 + collapseP * 0.82, 0, 1)
    crtFlashOpacity = clamp(flashBell * 1.08, 0, 1)
  }

  const noiseOpacity = clamp(0.06 + 0.54 * collapseEase + 0.3 * snowDriftEase + 0.16 * crtShutdownP, 0, 0.92)
  const snowOpacity = clamp(
    0.06 +
      0.44 * collapseEase +
      0.98 * snowDriftEase +
      0.5 * crtShutdownP +
      0.25 * crtFlashOpacity -
      0.94 * eyeOpenP,
    0,
    0.98,
  )
  const scanlineOpacity = clamp(0.08 + 0.58 * collapseEase + 0.42 * snowDriftEase + 0.34 * crtShutdownP, 0, 0.93)
  const driftDeg = 2.7 * collapseEase + 0.8 * snowDriftEase
  const networkOpacity = clamp(1 - 0.58 * collapseEase - 0.72 * snowDriftEase - 0.8 * crtShutdownP, 0, 1)

  const copyShiftPx = 8 * signalLockedP + 30 * orbitEase + 86 * cameraDiveP
  const copyBlurPx = 0.4 * signalLockedP + 3.2 * orbitEase + 11.5 * cameraDiveP
  const copyOpacity = clamp(1 - 0.52 * orbitEase - 0.62 * cameraDiveP, 0, 1)

  const blackBlend = clamp(crtShutdownP > 0.85 ? (crtShutdownP - 0.85) / 0.15 : 0, 0, 1)
  const blackoutOpacity = clamp(
    blackBlend * 0.96 + blackHoldP + (eyeOpenP > 0 ? 1 - easeOutCubic(eyeOpenP) : 0),
    0,
    1,
  )

  const eyeOpacity = clamp(
    eyeOpenP * 1.2 + eyeCalibrationP * 0.35 + chapterRevealP * 0.42 + chapterHoldP * 0.28,
    0,
    1,
  )
  const eyeAperturePct = lerp(2, 100, easeOutCubic(eyeOpenP))
  const focusLock = easeOutCubic(eyeOpenP)
  const focusBreathing = eyeOpenP > 0.66 ? Math.sin((eyeOpenP - 0.66) * 20) * 0.16 * (1 - chapterRevealP) : 0
  const eyeBlurPx = clamp(lerp(22, 0, focusLock) + focusBreathing, 0, 24)
  const eyeClarity = clamp(0.05 + focusLock * 1.06 - Math.abs(focusBreathing) * 0.12, 0, 1)
  const eyeScale = lerp(1.16, 1, easeOutCubic(eyeOpenP))

  const blinkAmount = scheduledTransitionBlink(blinkWindowP, blinkSeed)
  const crosshairOpacity = clamp(
    (eyeCalibrationP * 0.56 + chapterRevealP * 0.46 + chapterHoldP * 0.28) * (1 - 0.42 * blinkAmount),
    0,
    0.62,
  )
  const eyelidCoverPct = 52 * blinkAmount

  const chapterPower = clamp(easeOutCubic(chapterRevealP) * 0.86 + chapterHoldP * 0.14, 0, 1)
  const chapterFlicker = clamp((1 - chapterPower) * (0.42 + 0.58 * Math.sin(elapsedMs * 0.06)), 0, 1)
  const chapterOpacity = clamp(chapterRevealP * 1.3 + chapterHoldP * 0.25, 0, 1)

  return {
    worldRotateDeg,
    worldScale,
    worldXvw,
    worldYvh,
    worldBlurPx,
    worldContrast,
    worldSaturate,
    worldBrightness,
    rgbSplitPx,
    rgbIntensity,
    noiseOpacity,
    snowOpacity,
    snowConverge,
    scanlineOpacity,
    driftDeg,
    networkOpacity,
    copyShiftPx,
    copyBlurPx,
    copyOpacity,
    crtTopPct,
    crtBottomPct,
    crtLeftPct,
    crtRightPct,
    crtLineOpacity,
    crtPointOpacity,
    crtFlashOpacity,
    blackoutOpacity,
    eyeOpacity,
    eyeAperturePct,
    eyeBlurPx,
    eyeClarity,
    eyeScale,
    crosshairOpacity,
    eyelidCoverPct,
    chapterPower,
    chapterFlicker,
    chapterOpacity,
  }
}
