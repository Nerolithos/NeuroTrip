import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { VisualInputState } from '../../../types/visualSystem'
import type { UiLanguage } from '../../../stores/uiLanguageStore'
import { decodeRgb8, encodeRgb8 } from '../../../visual/color/srgb'
import { applyMachadoApproximation } from '../../../visual/color/machadoCvd'
import { runOpticalTransform } from '../../../visual/optics/opticalTransform'

type LiveVisualFeedProps = {
  language: UiLanguage
  visualInput: VisualInputState
  onProbeMove: (x: number, y: number) => void
  onProbeClick: (x: number, y: number) => void
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

export const LiveVisualFeed = ({
  language,
  visualInput,
  onProbeMove,
  onProbeClick,
}: LiveVisualFeedProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const sourceCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const processedCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const differenceCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const compositionStateRef = useRef({
    feedMode: visualInput.feedMode,
    x: visualInput.selectedVisualFieldPoint.x,
    y: visualInput.selectedVisualFieldPoint.y,
  })
  const pointerFrameRef = useRef<number | null>(null)
  const pendingPointRef = useRef<{ x: number; y: number } | null>(null)
  const [sourceImage, setSourceImage] = useState<HTMLImageElement | null>(null)

  useEffect(() => {
    if (!visualInput.sourceImage) {
      return
    }

    let canceled = false
    const image = new Image()
    image.decoding = 'async'
    image.onload = () => {
      if (canceled) {
        return
      }
      setSourceImage(image)
    }
    image.src = visualInput.sourceImage

    return () => {
      canceled = true
    }
  }, [visualInput.sourceImage])

  const opticalParams = useMemo(
    () => ({
      sphereD: visualInput.sphereD,
      cylinderD: visualInput.cylinderD,
      axisDeg: visualInput.axisDeg,
      objectDistanceM: visualInput.objectDistanceM,
      pupilDiameterMm: visualInput.pupilDiameterMm,
    }),
    [
      visualInput.axisDeg,
      visualInput.cylinderD,
      visualInput.objectDistanceM,
      visualInput.pupilDiameterMm,
      visualInput.sphereD,
    ],
  )

  const composeDisplay = useCallback(
    (feedMode: VisualInputState['feedMode'], splitPointX: number, splitPointY: number) => {
      const canvas = canvasRef.current
      const sourceCanvas = sourceCanvasRef.current
      const processedCanvas = processedCanvasRef.current
      const differenceCanvas = differenceCanvasRef.current
      if (!canvas || !sourceCanvas || !processedCanvas || !differenceCanvas) {
        return
      }

      const context = canvas.getContext('2d')
      if (!context) {
        return
      }

      const width = sourceCanvas.width
      const height = sourceCanvas.height
      const pixelRatio = window.devicePixelRatio || 1

      context.setTransform(1, 0, 0, 1, 0, 0)
      context.globalAlpha = 1
      context.globalCompositeOperation = 'source-over'
      context.filter = 'none'
      context.clearRect(0, 0, canvas.width, canvas.height)
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)

      if (feedMode === 'processed') {
        context.drawImage(processedCanvas, 0, 0)
      } else if (feedMode === 'difference') {
        context.drawImage(differenceCanvas, 0, 0)
      } else {
        const splitX = width * splitPointX
        context.drawImage(sourceCanvas, 0, 0)
        context.save()
        context.beginPath()
        context.rect(splitX, 0, width - splitX, height)
        context.clip()
        context.drawImage(processedCanvas, 0, 0)
        context.restore()

        context.save()
        context.strokeStyle = 'rgba(238, 247, 255, 0.9)'
        context.lineWidth = 1
        context.setLineDash([5, 5])
        context.beginPath()
        context.moveTo(splitX, 0)
        context.lineTo(splitX, height)
        context.stroke()
        context.restore()
      }

      context.save()
      context.globalCompositeOperation = 'source-over'
      context.strokeStyle = 'rgba(244, 249, 255, 0.82)'
      context.lineWidth = 1
      context.beginPath()
      context.moveTo(width * splitPointX, 0)
      context.lineTo(width * splitPointX, height)
      context.stroke()
      context.beginPath()
      context.moveTo(0, height * splitPointY)
      context.lineTo(width, height * splitPointY)
      context.stroke()
      context.restore()
    },
    [],
  )

  useEffect(() => {
    if (!sourceImage) {
      return
    }

    let cancelled = false
    const frame = window.requestAnimationFrame(() => {
      if (cancelled) {
        return
      }

      const displayCanvas = canvasRef.current
      if (!displayCanvas) {
        return
      }

      if (!sourceCanvasRef.current) {
        sourceCanvasRef.current = document.createElement('canvas')
      }
      if (!processedCanvasRef.current) {
        processedCanvasRef.current = document.createElement('canvas')
      }
      if (!differenceCanvasRef.current) {
        differenceCanvasRef.current = document.createElement('canvas')
      }

      const parent = displayCanvas.parentElement
      const width = Math.max(360, parent?.clientWidth ?? 680)
      const height = Math.round(width * 0.56)
      const pixelRatio = window.devicePixelRatio || 1

      displayCanvas.width = width * pixelRatio
      displayCanvas.height = height * pixelRatio
      displayCanvas.style.width = `${width}px`
      displayCanvas.style.height = `${height}px`

      const sourceCanvas = sourceCanvasRef.current
      const processedCanvas = processedCanvasRef.current
      const differenceCanvas = differenceCanvasRef.current
      sourceCanvas.width = width
      sourceCanvas.height = height
      processedCanvas.width = width
      processedCanvas.height = height
      differenceCanvas.width = width
      differenceCanvas.height = height

      const sourceCtx = sourceCanvas.getContext('2d', { willReadFrequently: true })
      const processedCtx = processedCanvas.getContext('2d', { willReadFrequently: true })
      const differenceCtx = differenceCanvas.getContext('2d')
      if (!sourceCtx || !processedCtx || !differenceCtx) {
        return
      }

      sourceCtx.setTransform(1, 0, 0, 1, 0, 0)
      sourceCtx.globalAlpha = 1
      sourceCtx.globalCompositeOperation = 'source-over'
      sourceCtx.filter = 'none'
      sourceCtx.clearRect(0, 0, width, height)
      sourceCtx.drawImage(sourceImage, 0, 0, width, height)

      const optics = runOpticalTransform(processedCtx, sourceCanvas, width, height, opticalParams)
      const processedFrame = processedCtx.getImageData(0, 0, width, height)
      const processedPixels = processedFrame.data

      for (let index = 0; index < processedPixels.length; index += 4) {
        const r = processedPixels[index] ?? 0
        const g = processedPixels[index + 1] ?? 0
        const b = processedPixels[index + 2] ?? 0

        const linear = decodeRgb8(r, g, b)
        const transformed = applyMachadoApproximation(
          linear,
          visualInput.colorDeficiencyType,
          visualInput.colorDeficiencySeverity,
        )
        const encoded = encodeRgb8(transformed[0], transformed[1], transformed[2])

        processedPixels[index] = Math.round(encoded[0])
        processedPixels[index + 1] = Math.round(encoded[1])
        processedPixels[index + 2] = Math.round(encoded[2])
        processedPixels[index + 3] = 255
      }
      processedCtx.putImageData(processedFrame, 0, 0)

      const rawFrame = sourceCtx.getImageData(0, 0, width, height)
      const differenceFrame = sourceCtx.createImageData(width, height)
      const differencePixels = differenceFrame.data
      const gain = 2.6 + optics.defocusStrength * 2 + visualInput.colorDeficiencySeverity * 1.8

      for (let index = 0; index < differencePixels.length; index += 4) {
        const deltaR = Math.abs((processedPixels[index] ?? 0) - (rawFrame.data[index] ?? 0))
        const deltaG = Math.abs((processedPixels[index + 1] ?? 0) - (rawFrame.data[index + 1] ?? 0))
        const deltaB = Math.abs((processedPixels[index + 2] ?? 0) - (rawFrame.data[index + 2] ?? 0))

        differencePixels[index] = Math.round(clamp(deltaR * gain, 0, 255))
        differencePixels[index + 1] = Math.round(clamp(deltaG * gain, 0, 255))
        differencePixels[index + 2] = Math.round(clamp(deltaB * gain, 0, 255))
        differencePixels[index + 3] = 255
      }

      differenceCtx.putImageData(differenceFrame, 0, 0)

      const compositionState = compositionStateRef.current
      composeDisplay(compositionState.feedMode, compositionState.x, compositionState.y)
    })

    return () => {
      cancelled = true
      window.cancelAnimationFrame(frame)
    }
  }, [
    composeDisplay,
    opticalParams,
    sourceImage,
    visualInput.colorDeficiencySeverity,
    visualInput.colorDeficiencyType,
  ])

  useEffect(() => {
    compositionStateRef.current = {
      feedMode: visualInput.feedMode,
      x: visualInput.selectedVisualFieldPoint.x,
      y: visualInput.selectedVisualFieldPoint.y,
    }

    composeDisplay(
      visualInput.feedMode,
      visualInput.selectedVisualFieldPoint.x,
      visualInput.selectedVisualFieldPoint.y,
    )
  }, [
    composeDisplay,
    visualInput.feedMode,
    visualInput.selectedVisualFieldPoint.x,
    visualInput.selectedVisualFieldPoint.y,
  ])

  useEffect(() => {
    return () => {
      if (pointerFrameRef.current !== null) {
        window.cancelAnimationFrame(pointerFrameRef.current)
        pointerFrameRef.current = null
      }
    }
  }, [])

  const modeLabel =
    visualInput.feedMode === 'difference'
      ? language === 'zh'
        ? '差异增益图'
        : 'Difference Gain Map'
      : visualInput.feedMode === 'processed'
        ? language === 'zh'
          ? '处理后视图'
          : 'Processed View'
        : language === 'zh'
          ? '分屏对照'
          : 'Split Comparison'

  const probeLabel = visualInput.probeLocked
    ? language === 'zh'
      ? '十字光标: 已锁定 (单击解除)'
      : 'Crosshair: locked (click to release)'
    : language === 'zh'
      ? '十字光标: 跟随鼠标 (单击锁定)'
      : 'Crosshair: tracking pointer (click to lock)'

  return (
    <div className="vsc-live-feed-wrap">
      <p className="vsc-live-feed-mode">{modeLabel}</p>
      <p className="vsc-live-feed-probe-status">{probeLabel}</p>
      <div className="vsc-live-feed-stage">
        <canvas
          ref={canvasRef}
          className={`vsc-live-feed-canvas ${visualInput.probeLocked ? 'is-locked' : ''}`}
          role="img"
          aria-label={
            language === 'zh' ? '视觉输入处理后的近似画面' : 'Processed visual feed approximation'
          }
          onPointerMove={(event) => {
            if (visualInput.probeLocked) {
              return
            }
            const box = event.currentTarget.getBoundingClientRect()
            const x = (event.clientX - box.left) / box.width
            const y = (event.clientY - box.top) / box.height
            pendingPointRef.current = { x, y }
            if (pointerFrameRef.current !== null) {
              return
            }

            pointerFrameRef.current = window.requestAnimationFrame(() => {
              pointerFrameRef.current = null
              const point = pendingPointRef.current
              if (!point) {
                return
              }
              onProbeMove(point.x, point.y)
            })
          }}
          onClick={(event) => {
            const box = event.currentTarget.getBoundingClientRect()
            const x = (event.clientX - box.left) / box.width
            const y = (event.clientY - box.top) / box.height
            onProbeClick(x, y)
          }}
        />
      </div>
    </div>
  )
}
