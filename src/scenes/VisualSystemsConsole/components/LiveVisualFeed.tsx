import { useEffect, useMemo, useRef, useState } from 'react'
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

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !sourceImage) {
      return
    }

    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) {
      return
    }

    const parent = canvas.parentElement
    const width = Math.max(360, parent?.clientWidth ?? 680)
    const height = Math.round(width * 0.56)
    const pixelRatio = window.devicePixelRatio || 1

    canvas.width = width * pixelRatio
    canvas.height = height * pixelRatio
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    context.setTransform(1, 0, 0, 1, 0, 0)
    context.globalAlpha = 1
    context.globalCompositeOperation = 'source-over'
    context.filter = 'none'
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)

    if (!sourceCanvasRef.current) {
      sourceCanvasRef.current = document.createElement('canvas')
    }
    if (!processedCanvasRef.current) {
      processedCanvasRef.current = document.createElement('canvas')
    }

    const sourceCanvas = sourceCanvasRef.current
    const processedCanvas = processedCanvasRef.current
    sourceCanvas.width = width
    sourceCanvas.height = height
    processedCanvas.width = width
    processedCanvas.height = height

    const sourceCtx = sourceCanvas.getContext('2d')
    const processedCtx = processedCanvas.getContext('2d', { willReadFrequently: true })
    if (!sourceCtx || !processedCtx) {
      return
    }

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
    }

    processedCtx.putImageData(processedFrame, 0, 0)

    context.clearRect(0, 0, width, height)

    if (visualInput.feedMode === 'processed') {
      context.drawImage(processedCanvas, 0, 0)
    } else if (visualInput.feedMode === 'split') {
      const splitX = width * visualInput.selectedVisualFieldPoint.x

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
    } else {
      const rawFrame = sourceCtx.getImageData(0, 0, width, height)
      const differenceFrame = context.createImageData(width, height)
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

      context.putImageData(differenceFrame, 0, 0)
    }

    context.save()
    context.globalCompositeOperation = 'source-over'
    context.strokeStyle = 'rgba(244, 249, 255, 0.82)'
    context.lineWidth = 1
    context.beginPath()
    context.moveTo(width * visualInput.selectedVisualFieldPoint.x, 0)
    context.lineTo(width * visualInput.selectedVisualFieldPoint.x, height)
    context.stroke()
    context.beginPath()
    context.moveTo(0, height * visualInput.selectedVisualFieldPoint.y)
    context.lineTo(width, height * visualInput.selectedVisualFieldPoint.y)
    context.stroke()
    context.restore()
  }, [
    opticalParams,
    sourceImage,
    visualInput.colorDeficiencySeverity,
    visualInput.colorDeficiencyType,
    visualInput.feedMode,
    visualInput.selectedVisualFieldPoint.x,
    visualInput.selectedVisualFieldPoint.y,
  ])

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
            onProbeMove(x, y)
          }}
          onClick={(event) => {
            const box = event.currentTarget.getBoundingClientRect()
            const x = (event.clientX - box.left) / box.width
            const y = (event.clientY - box.top) / box.height
            onProbeClick(x, y)
          }}
        />
      </div>
      <p className="vsc-live-feed-note">
        {language === 'zh'
          ? '光学模型为教育性近似，不可用于处方、诊断或任何临床用途。'
          : 'OPTICAL MODEL: APPROXIMATE. EDUCATIONAL SIMULATION, NOT A PRESCRIPTION OR CLINICAL DIAGNOSTIC.'}
      </p>
    </div>
  )
}
