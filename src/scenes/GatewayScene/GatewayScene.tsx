import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LanguageToggle } from '../../components/LanguageToggle'
import { GatewayCopy } from '../../components/gateway/GatewayCopy'
import { NeuralNetworkBackground } from '../../components/gateway/NeuralNetworkBackground'
import { useNeuroTripStore } from '../../stores/neuroTripStore'
import { useUiLanguageStore } from '../../stores/uiLanguageStore'
import { createBrainShape } from '../../utils/brainShape'
import { resolveGatewayDensity } from '../../utils/generateNeuralGraph'
import {
  computeAwaitingBlinkCover,
  computeAwaitingChapterFlicker,
  computeTransitionFrameState,
  createTransitionDurations,
  getTransitionTotalDuration,
  type TransitionFrameState,
} from './gatewayTransitionTimeline'
import brainBackdropUrl from '../../../assets/Human brain illustration on transparent background PNG.avif'
import eyeChartUrl from '../../../assets/House and Balloon Eye Test Explained | TikTok.jpg'
import './gateway.css'

type AnchorPoint = {
  x: number
  y: number
}

type ViewportSize = {
  width: number
  height: number
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

const removeNearWhiteBackground = async (sourceUrl: string) => {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load brain backdrop image'))
    img.src = sourceUrl
  })

  const width = image.naturalWidth || image.width
  const height = image.naturalHeight || image.height
  if (width < 1 || height < 1) {
    return sourceUrl
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) {
    return sourceUrl
  }

  context.drawImage(image, 0, 0, width, height)
  const imageData = context.getImageData(0, 0, width, height)
  const pixels = imageData.data

  for (let index = 0; index < pixels.length; index += 4) {
    const red = pixels[index] ?? 0
    const green = pixels[index + 1] ?? 0
    const blue = pixels[index + 2] ?? 0
    const alpha = pixels[index + 3] ?? 0

    if (alpha === 0) {
      continue
    }

    const maxChannel = Math.max(red, green, blue)
    const minChannel = Math.min(red, green, blue)
    const chroma = maxChannel - minChannel
    const saturation = maxChannel === 0 ? 0 : chroma / maxChannel
    const luminance = (red + green + blue) / 3

    if (luminance > 238 && saturation < 0.11) {
      pixels[index + 3] = 0
      continue
    }

    if (luminance > 222 && saturation < 0.16) {
      const fade = clamp((238 - luminance) / 16, 0, 1)
      pixels[index + 3] = Math.round(alpha * fade)
    }
  }

  context.putImageData(imageData, 0, 0)
  return canvas.toDataURL('image/png')
}

export const GatewayScene = () => {
  const navigate = useNavigate()
  const resetTrip = useNeuroTripStore((state) => state.resetTrip)
  const recordInteraction = useNeuroTripStore((state) => state.recordInteraction)
  const reducedMotion = useNeuroTripStore((state) => state.reducedMotion)
  const language = useUiLanguageStore((state) => state.language)
  const isZh = language === 'zh'

  const stageRef = useRef<HTMLElement | null>(null)
  const ctaRef = useRef<HTMLButtonElement | null>(null)
  const transitionFrameRef = useRef<number | null>(null)
  const awaitingFrameRef = useRef<number | null>(null)
  const transitionStartRef = useRef<number | null>(null)
  const awaitingStartRef = useRef<number | null>(null)
  const transitionCheckpointRef = useRef({ secondaryWave: false, terminalWave: false })
  const blinkSeedRef = useRef(0)
  const finalFrameRef = useRef<TransitionFrameState | null>(null)
  const lastCssVarTextRef = useRef('')

  const [viewport, setViewport] = useState<ViewportSize>({
    width: window.innerWidth,
    height: window.innerHeight,
  })
  const [ctaAnchor, setCtaAnchor] = useState<AnchorPoint | null>(null)
  const [ctaEngaged, setCtaEngaged] = useState(false)
  const [hoverPulse, setHoverPulse] = useState(0)
  const [clickPulse, setClickPulse] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isAwaitingContinue, setIsAwaitingContinue] = useState(false)
  const [processedBackdropUrl, setProcessedBackdropUrl] = useState(brainBackdropUrl)

  const transitionDurations = useMemo(() => createTransitionDurations(reducedMotion), [reducedMotion])
  const transitionTotalDuration = useMemo(
    () => getTransitionTotalDuration(transitionDurations),
    [transitionDurations],
  )

  const density = useMemo(
    () => resolveGatewayDensity(viewport.width, reducedMotion),
    [reducedMotion, viewport.width],
  )

  const brainShape = useMemo(
    () => createBrainShape(viewport.width, viewport.height, density.mobile),
    [density.mobile, viewport.height, viewport.width],
  )

  const backdropStyle = useMemo(() => {
    const desiredScale = density.mobile ? 2.0 : 2.3
    const edgePaddingX = density.mobile ? 8 : 14
    const edgePaddingY = density.mobile ? 10 : 14

    const halfWidth = Math.max(1, brainShape.width * 0.5)
    const halfHeight = Math.max(1, brainShape.height * 0.5)

    const maxHalfWidth = Math.max(
      1,
      Math.min(brainShape.centerX - edgePaddingX, viewport.width - edgePaddingX - brainShape.centerX),
    )
    const maxHalfHeight = Math.max(
      1,
      Math.min(brainShape.centerY - edgePaddingY, viewport.height - edgePaddingY - brainShape.centerY),
    )

    const maxScaleX = maxHalfWidth / halfWidth
    const maxScaleY = maxHalfHeight / halfHeight
    const safeScale = clamp(Math.min(desiredScale, maxScaleX, maxScaleY), 0.96, desiredScale)

    return {
      left: `${brainShape.centerX}px`,
      top: `${brainShape.centerY}px`,
      width: `${brainShape.width * safeScale}px`,
      height: `${brainShape.height * safeScale}px`,
    }
  }, [brainShape.centerX, brainShape.centerY, brainShape.height, brainShape.width, density.mobile, viewport.height, viewport.width])

  const applyFrameToStage = useCallback((frame: TransitionFrameState) => {
    const stage = stageRef.current
    if (!stage) {
      return
    }

    const cssVarText = [
      `--cine-world-rotate:${frame.worldRotateDeg.toFixed(3)}deg`,
      `--cine-world-scale:${frame.worldScale.toFixed(4)}`,
      `--cine-world-x:${frame.worldXvw.toFixed(3)}vw`,
      `--cine-world-y:${frame.worldYvh.toFixed(3)}vh`,
      `--cine-world-blur:${frame.worldBlurPx.toFixed(3)}px`,
      `--cine-world-contrast:${frame.worldContrast.toFixed(4)}`,
      `--cine-world-saturate:${frame.worldSaturate.toFixed(4)}`,
      `--cine-world-brightness:${frame.worldBrightness.toFixed(4)}`,
      `--cine-rgb-split:${frame.rgbSplitPx.toFixed(3)}px`,
      `--cine-rgb-intensity:${frame.rgbIntensity.toFixed(4)}`,
      `--cine-noise-opacity:${frame.noiseOpacity.toFixed(4)}`,
      `--cine-snow-opacity:${frame.snowOpacity.toFixed(4)}`,
      `--cine-snow-converge:${frame.snowConverge.toFixed(4)}`,
      `--cine-scanline-opacity:${frame.scanlineOpacity.toFixed(4)}`,
      `--cine-world-drift:${frame.driftDeg.toFixed(3)}deg`,
      `--cine-network-opacity:${frame.networkOpacity.toFixed(4)}`,
      `--cine-copy-shift:${frame.copyShiftPx.toFixed(3)}px`,
      `--cine-copy-blur:${frame.copyBlurPx.toFixed(3)}px`,
      `--cine-copy-opacity:${frame.copyOpacity.toFixed(4)}`,
      `--cine-crt-top:${frame.crtTopPct.toFixed(3)}%`,
      `--cine-crt-bottom:${frame.crtBottomPct.toFixed(3)}%`,
      `--cine-crt-left:${frame.crtLeftPct.toFixed(3)}%`,
      `--cine-crt-right:${frame.crtRightPct.toFixed(3)}%`,
      `--cine-crt-line-opacity:${frame.crtLineOpacity.toFixed(4)}`,
      `--cine-crt-point-opacity:${frame.crtPointOpacity.toFixed(4)}`,
      `--cine-crt-flash-opacity:${frame.crtFlashOpacity.toFixed(4)}`,
      `--cine-blackout-opacity:${frame.blackoutOpacity.toFixed(4)}`,
      `--cine-eye-opacity:${frame.eyeOpacity.toFixed(4)}`,
      `--cine-eye-aperture:${frame.eyeAperturePct.toFixed(3)}%`,
      `--cine-eye-blur:${frame.eyeBlurPx.toFixed(3)}px`,
      `--cine-eye-clarity:${frame.eyeClarity.toFixed(4)}`,
      `--cine-eye-scale:${frame.eyeScale.toFixed(4)}`,
      `--cine-crosshair-opacity:${frame.crosshairOpacity.toFixed(4)}`,
      `--cine-eyelid-cover:${frame.eyelidCoverPct.toFixed(3)}%`,
      `--cine-chapter-power:${frame.chapterPower.toFixed(4)}`,
      `--cine-chapter-flicker:${frame.chapterFlicker.toFixed(4)}`,
      `--cine-chapter-opacity:${frame.chapterOpacity.toFixed(4)}`,
    ].join(';')

    if (cssVarText === lastCssVarTextRef.current) {
      return
    }

    stage.style.cssText = cssVarText
    lastCssVarTextRef.current = cssVarText
  }, [])

  const applyTransitionFrame = useCallback(
    (elapsedMs: number) => {
      const frame = computeTransitionFrameState(elapsedMs, transitionDurations, blinkSeedRef.current)
      finalFrameRef.current = frame
      applyFrameToStage(frame)
      return frame
    },
    [applyFrameToStage, transitionDurations],
  )

  useEffect(() => {
    let canceled = false

    removeNearWhiteBackground(brainBackdropUrl)
      .then((nextUrl) => {
        if (canceled) {
          return
        }
        setProcessedBackdropUrl(nextUrl)
      })
      .catch(() => {
        if (canceled) {
          return
        }
        setProcessedBackdropUrl(brainBackdropUrl)
      })

    return () => {
      canceled = true
    }
  }, [])

  useEffect(() => {
    applyTransitionFrame(0)
  }, [applyTransitionFrame])

  useEffect(() => {
    const updateLayout = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      })

      const button = ctaRef.current
      if (!button) {
        return
      }

      const rect = button.getBoundingClientRect()
      setCtaAnchor({
        x: rect.left + rect.width * 0.5,
        y: rect.top + rect.height * 0.5,
      })
    }

    updateLayout()
    window.addEventListener('resize', updateLayout)
    window.addEventListener('scroll', updateLayout, { passive: true })

    return () => {
      window.removeEventListener('resize', updateLayout)
      window.removeEventListener('scroll', updateLayout)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (transitionFrameRef.current) {
        window.cancelAnimationFrame(transitionFrameRef.current)
        transitionFrameRef.current = null
      }
      if (awaitingFrameRef.current) {
        window.cancelAnimationFrame(awaitingFrameRef.current)
        awaitingFrameRef.current = null
      }
    }
  }, [])

  const startAwaitingLoop = useCallback(() => {
    awaitingStartRef.current = null

    const loop = (timestamp: number) => {
      const start = awaitingStartRef.current ?? timestamp
      awaitingStartRef.current = start
      const waitingMs = timestamp - start

      const baseFrame =
        finalFrameRef.current ??
        computeTransitionFrameState(transitionTotalDuration, transitionDurations, blinkSeedRef.current)

      const idleBlinkCover = computeAwaitingBlinkCover(waitingMs, blinkSeedRef.current)
      const idleFlicker = computeAwaitingChapterFlicker(waitingMs)

      applyFrameToStage({
        ...baseFrame,
        chapterOpacity: 1,
        chapterPower: 1,
        chapterFlicker: idleFlicker,
        crosshairOpacity: Math.max(baseFrame.crosshairOpacity, 0.42),
        eyelidCoverPct: idleBlinkCover,
      })

      awaitingFrameRef.current = window.requestAnimationFrame(loop)
    }

    awaitingFrameRef.current = window.requestAnimationFrame(loop)
  }, [applyFrameToStage, transitionDurations, transitionTotalDuration])

  const beginTrip = () => {
    if (isTransitioning || isAwaitingContinue) {
      return
    }

    resetTrip()
    recordInteraction({
      type: 'click',
      scene: 'gateway',
      timestamp: Date.now(),
      target: 'begin-trip',
    })

    setIsAwaitingContinue(false)
    setIsTransitioning(true)
    setCtaEngaged(true)
    setClickPulse((current) => current + 1)
    blinkSeedRef.current = Math.random() * 1000 + 1

    if (awaitingFrameRef.current) {
      window.cancelAnimationFrame(awaitingFrameRef.current)
      awaitingFrameRef.current = null
    }

    transitionStartRef.current = null
    transitionCheckpointRef.current = { secondaryWave: false, terminalWave: false }

    const signalCheckpointA = transitionDurations.signalLocked * 0.43
    const signalCheckpointB = transitionDurations.signalLocked + transitionDurations.orbitAlign * 0.2

    const tick = (timestamp: number) => {
      const initial = transitionStartRef.current ?? timestamp
      transitionStartRef.current = initial
      const elapsedMs = timestamp - initial

      if (!transitionCheckpointRef.current.secondaryWave && elapsedMs >= signalCheckpointA) {
        transitionCheckpointRef.current.secondaryWave = true
        setClickPulse((current) => current + 1)
      }

      if (!transitionCheckpointRef.current.terminalWave && elapsedMs >= signalCheckpointB) {
        transitionCheckpointRef.current.terminalWave = true
        setClickPulse((current) => current + 1)
      }

      applyTransitionFrame(elapsedMs)

      if (elapsedMs >= transitionTotalDuration) {
        transitionFrameRef.current = null
        setIsTransitioning(false)
        setIsAwaitingContinue(true)
        setCtaEngaged(false)
        startAwaitingLoop()
        return
      }

      transitionFrameRef.current = window.requestAnimationFrame(tick)
    }

    transitionFrameRef.current = window.requestAnimationFrame(tick)
  }

  const continueToChapter = () => {
    if (!isAwaitingContinue || isTransitioning) {
      return
    }

    if (awaitingFrameRef.current) {
      window.cancelAnimationFrame(awaitingFrameRef.current)
      awaitingFrameRef.current = null
    }

    recordInteraction({
      type: 'click',
      scene: 'gateway',
      timestamp: Date.now(),
      target: 'chapter-i-continue',
    })
    navigate('/scene/visual-cortex')
  }

  const engageCta = () => {
    setCtaEngaged(true)
    setHoverPulse((current) => current + 1)
  }

  const disengageCta = () => {
    setCtaEngaged(false)
  }

  return (
    <section
      ref={stageRef}
      className={`gateway-stage ${isTransitioning ? 'is-transitioning' : ''} ${isAwaitingContinue ? 'is-awaiting-continue' : ''}`}
      aria-label={isZh ? 'NeuroTrip 入口场景' : 'NeuroTrip gateway'}
      onClick={continueToChapter}
    >
      <div className="gateway-language-control" onClick={(event) => event.stopPropagation()}>
        <LanguageToggle />
      </div>

      <div className="gateway-cinematic-world" aria-hidden="true">
        <div className="gateway-atmosphere" />
        <img
          className="gateway-brain-backdrop"
          src={processedBackdropUrl}
          alt=""
          aria-hidden="true"
          draggable={false}
          style={backdropStyle}
        />
        <div className="gateway-neural-shell">
          <NeuralNetworkBackground
            reducedMotion={reducedMotion}
            ctaAnchor={ctaAnchor}
            ctaEngaged={ctaEngaged}
            hoverPulse={hoverPulse}
            clickPulse={clickPulse}
          />
        </div>
        <div className="gateway-signal-noise" />
        <div className="gateway-snow-layer" />
        <div className="gateway-rgb-split-layer" />
        <div className="gateway-scanlines-layer" />
      </div>

      <div className="gateway-cinematic-hud">
        <GatewayCopy
          ctaRef={ctaRef}
          nodeCount={density.nodeCount}
          reducedMotion={reducedMotion}
          isLaunching={isTransitioning || isAwaitingContinue}
          onBegin={beginTrip}
          onCtaEngage={engageCta}
          onCtaDisengage={disengageCta}
        />
      </div>

      <div className="gateway-crt-mask gateway-crt-mask-top" aria-hidden="true" />
      <div className="gateway-crt-mask gateway-crt-mask-bottom" aria-hidden="true" />
      <div className="gateway-crt-line" aria-hidden="true" />
      <div className="gateway-crt-point" aria-hidden="true" />
      <div className="gateway-blackout" aria-hidden="true" />

      <div className="gateway-eye-sequence" aria-hidden="true">
        <div className="gateway-eye-chart">
          <img src={eyeChartUrl} alt="" draggable={false} />
        </div>
        <div className="gateway-fixation-cross" />
      </div>

      <div className="gateway-eyelid gateway-eyelid-top" aria-hidden="true" />
      <div className="gateway-eyelid gateway-eyelid-bottom" aria-hidden="true" />

      <div className="gateway-chapter-reveal" aria-hidden="true">
        <p>{isZh ? '第一章' : 'Chapter I'}</p>
        <h2>{isZh ? '表象' : 'The Facade'}</h2>
      </div>

      {isAwaitingContinue ? (
        <p className="gateway-continue-hint" aria-live="polite">
          {isZh ? '点击任意位置进入第一章' : 'Tap anywhere to enter Chapter I'}
        </p>
      ) : null}
    </section>
  )
}
