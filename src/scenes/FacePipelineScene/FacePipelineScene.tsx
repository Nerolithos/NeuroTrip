import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import noSignalTvUrl from '../../../assets/No_Signal_Tv.jpg'
import { LanguageToggle } from '../../components/LanguageToggle'
import { useNeuroTripStore } from '../../stores/neuroTripStore'
import { useUiLanguageStore } from '../../stores/uiLanguageStore'
import './facePipeline.css'

type PipelineStep = {
  id: string
  label: string
}

type LandmarkPoint = {
  x: number
  y: number
}

type FaceSample = {
  confidence: number
  bbox: { x: number; y: number; width: number; height: number }
  leftEye: LandmarkPoint
  rightEye: LandmarkPoint
  nose: LandmarkPoint
  mouth: LandmarkPoint
  landmarkCount: number
  timestamp: number
}

type Telemetry = {
  confidence: number
  bboxText: string
  landmarkCount: number
  motionIndex: number
  gazeBias: number
}

type DetectedFace = {
  boundingBox: DOMRectReadOnly
  landmarks?: Array<{ type: string; locations: ReadonlyArray<{ x: number; y: number }> }>
}

type FaceDetectorLike = {
  detect: (input: HTMLVideoElement) => Promise<DetectedFace[]>
}

const PIPELINE_STEPS: PipelineStep[] = [
  { id: 'raw', label: 'RAW SIGNAL' },
  { id: 'contrast', label: 'CONTRAST' },
  { id: 'edges', label: 'EDGES' },
  { id: 'parts', label: 'PARTS' },
  { id: 'configuration', label: 'CONFIGURATION' },
  { id: 'face', label: 'FACE' },
  { id: 'gaze', label: 'GAZE' },
  { id: 'expression', label: 'EXPRESSION' },
  { id: 'identity', label: 'IDENTITY?' },
]

const NO_SIGNAL_DURATION_MS = 2500
const STAGE_DURATION_MS = 7200
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

const getCoverCrop = (sourceWidth: number, sourceHeight: number, targetWidth: number, targetHeight: number) => {
  const sourceRatio = sourceWidth / sourceHeight
  const targetRatio = targetWidth / targetHeight

  if (sourceRatio > targetRatio) {
    const cropWidth = sourceHeight * targetRatio
    const offsetX = (sourceWidth - cropWidth) * 0.5
    return { sx: offsetX, sy: 0, sw: cropWidth, sh: sourceHeight }
  }

  const cropHeight = sourceWidth / targetRatio
  const offsetY = (sourceHeight - cropHeight) * 0.5
  return { sx: 0, sy: offsetY, sw: sourceWidth, sh: cropHeight }
}

const centerOfLocations = (locations: ReadonlyArray<{ x: number; y: number }>) => {
  if (locations.length === 0) {
    return null
  }

  let sumX = 0
  let sumY = 0
  for (const location of locations) {
    sumX += location.x
    sumY += location.y
  }

  return {
    x: sumX / locations.length,
    y: sumY / locations.length,
  }
}

const mapPointToCanvas = (
  point: LandmarkPoint,
  crop: { sx: number; sy: number; sw: number; sh: number },
  width: number,
  height: number,
) => {
  const relativeX = clamp((point.x - crop.sx) / crop.sw, 0, 1)
  const relativeY = clamp((point.y - crop.sy) / crop.sh, 0, 1)

  return {
    x: (1 - relativeX) * width,
    y: relativeY * height,
  }
}

const mapRectToCanvas = (
  rect: { x: number; y: number; width: number; height: number },
  crop: { sx: number; sy: number; sw: number; sh: number },
  width: number,
  height: number,
) => {
  const left = clamp((rect.x - crop.sx) / crop.sw, 0, 1)
  const top = clamp((rect.y - crop.sy) / crop.sh, 0, 1)
  const right = clamp((rect.x + rect.width - crop.sx) / crop.sw, 0, 1)
  const bottom = clamp((rect.y + rect.height - crop.sy) / crop.sh, 0, 1)

  return {
    x: (1 - right) * width,
    y: top * height,
    width: (right - left) * width,
    height: (bottom - top) * height,
  }
}

const drawMirroredFrame = (
  context: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  width: number,
  height: number,
  filter: string,
) => {
  const crop = getCoverCrop(video.videoWidth, video.videoHeight, width, height)

  context.save()
  context.filter = filter
  context.translate(width, 0)
  context.scale(-1, 1)
  context.drawImage(video, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, width, height)
  context.restore()

  return crop
}

const drawEdgeFrame = (
  context: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  width: number,
  height: number,
  workCanvas: HTMLCanvasElement,
) => {
  const edgeWidth = 320
  const edgeHeight = Math.max(180, Math.round((height / width) * edgeWidth))

  workCanvas.width = edgeWidth
  workCanvas.height = edgeHeight

  const workContext = workCanvas.getContext('2d', { willReadFrequently: true })
  if (!workContext) {
    return drawMirroredFrame(context, video, width, height, 'grayscale(1) contrast(2.2) brightness(1.08)')
  }

  const crop = getCoverCrop(video.videoWidth, video.videoHeight, edgeWidth, edgeHeight)
  workContext.setTransform(1, 0, 0, 1, 0, 0)
  workContext.clearRect(0, 0, edgeWidth, edgeHeight)
  workContext.translate(edgeWidth, 0)
  workContext.scale(-1, 1)
  workContext.drawImage(video, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, edgeWidth, edgeHeight)
  workContext.setTransform(1, 0, 0, 1, 0, 0)

  const source = workContext.getImageData(0, 0, edgeWidth, edgeHeight)
  const output = workContext.createImageData(edgeWidth, edgeHeight)
  const sourcePixels = source.data
  const outputPixels = output.data
  const gray = new Float32Array(edgeWidth * edgeHeight)

  for (let index = 0, p = 0; index < gray.length; index += 1, p += 4) {
    const r = sourcePixels[p] ?? 0
    const g = sourcePixels[p + 1] ?? 0
    const b = sourcePixels[p + 2] ?? 0
    gray[index] = 0.299 * r + 0.587 * g + 0.114 * b
  }

  for (let y = 1; y < edgeHeight - 1; y += 1) {
    for (let x = 1; x < edgeWidth - 1; x += 1) {
      const i = y * edgeWidth + x
      const gx =
        -(gray[i - edgeWidth - 1] ?? 0) +
        (gray[i - edgeWidth + 1] ?? 0) +
        -2 * (gray[i - 1] ?? 0) +
        2 * (gray[i + 1] ?? 0) +
        -(gray[i + edgeWidth - 1] ?? 0) +
        (gray[i + edgeWidth + 1] ?? 0)
      const gy =
        -(gray[i - edgeWidth - 1] ?? 0) +
        -2 * (gray[i - edgeWidth] ?? 0) +
        -(gray[i - edgeWidth + 1] ?? 0) +
        (gray[i + edgeWidth - 1] ?? 0) +
        2 * (gray[i + edgeWidth] ?? 0) +
        (gray[i + edgeWidth + 1] ?? 0)

      const magnitude = clamp(Math.sqrt(gx * gx + gy * gy) * 0.82, 0, 255)
      const edge = magnitude > 18 ? magnitude : 0
      const pixelIndex = i * 4

      outputPixels[pixelIndex] = edge
      outputPixels[pixelIndex + 1] = edge
      outputPixels[pixelIndex + 2] = edge
      outputPixels[pixelIndex + 3] = 255
    }
  }

  workContext.putImageData(output, 0, 0)
  context.drawImage(workCanvas, 0, 0, edgeWidth, edgeHeight, 0, 0, width, height)

  return getCoverCrop(video.videoWidth, video.videoHeight, width, height)
}

const getAcquisitionLine = (isZh: boolean, progress: number) => {
  if (progress < 0.22) {
    return isZh ? 'Eyes detected.' : 'Eyes detected.'
  }
  if (progress < 0.45) {
    return isZh ? 'Nose detected.' : 'Nose detected.'
  }
  if (progress < 0.66) {
    return isZh ? 'Mouth detected.' : 'Mouth detected.'
  }
  if (progress < 0.86) {
    return isZh ? 'Configuration plausible.' : 'Configuration plausible.'
  }
  return isZh ? 'A face has been constructed.' : 'A face has been constructed.'
}

const getStageLead = (isZh: boolean, stageIndex: number, stageProgress: number) => {
  if (stageIndex === 3) {
    return getAcquisitionLine(isZh, stageProgress)
  }

  const zhLines = [
    'RAW SIGNAL: 你还不是一张脸。',
    'CONTRAST: 系统先捕捉强弱变化。',
    'EDGES: 轮廓先于身份出现。',
    'FACE ACQUISITION: 局部结构逐步锁定。',
    'Detection survived. Recognition did not.',
    'FACE: 绿框现在闭合。',
    'Your eyes do not only receive attention. They direct it.',
    '动态变化让 pSTS 通路增益。',
    'The detector found a face. Your brain found someone.',
  ]

  const enLines = [
    'RAW SIGNAL: you are not a face yet.',
    'CONTRAST: intensity gradients come first.',
    'EDGES: contours emerge before identity.',
    'FACE ACQUISITION: local parts lock in sequence.',
    'Detection survived. Recognition did not.',
    'FACE: the green box finally closes.',
    'Your eyes do not only receive attention. They direct it.',
    'Dynamic changes upweight the pSTS pathway.',
    'The detector found a face. Your brain found someone.',
  ]

  return isZh ? zhLines[stageIndex] ?? zhLines[0] : enLines[stageIndex] ?? enLines[0]
}

export const FacePipelineScene = () => {
  const navigate = useNavigate()
  const language = useUiLanguageStore((state) => state.language)
  const isZh = language === 'zh'
  const setCurrentScene = useNeuroTripStore((state) => state.setCurrentScene)
  const recordInteraction = useNeuroTripStore((state) => state.recordInteraction)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const workCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const detectorRef = useRef<FaceDetectorLike | null>(null)
  const detectionFrameRef = useRef<number | null>(null)
  const renderFrameRef = useRef<number | null>(null)
  const stageFrameRef = useRef<number | null>(null)
  const pipelineStartRef = useRef<number | null>(null)
  const stageIndexRef = useRef(0)
  const stageProgressRef = useRef(0)
  const latestFaceRef = useRef<FaceSample | null>(null)
  const previousFaceRef = useRef<FaceSample | null>(null)

  const [phase, setPhase] = useState<'no-signal' | 'camera' | 'denied'>('no-signal')
  const [cameraReady, setCameraReady] = useState(false)
  const [stageIndex, setStageIndex] = useState(0)
  const [stageProgress, setStageProgress] = useState(0)
  const [telemetry, setTelemetry] = useState<Telemetry>({
    confidence: 0,
    bboxText: '[0,0,0,0]',
    landmarkCount: 0,
    motionIndex: 0,
    gazeBias: 0,
  })
  const telemetryRef = useRef<Telemetry>(telemetry)

  const stageLead = useMemo(
    () => getStageLead(isZh, stageIndex, stageProgress),
    [isZh, stageIndex, stageProgress],
  )

  useEffect(() => {
    setCurrentScene('/scene/face-pipeline')
    recordInteraction({
      type: 'scene-enter',
      scene: '/scene/face-pipeline',
      timestamp: Date.now(),
    })

    return () => {
      recordInteraction({
        type: 'scene-exit',
        scene: '/scene/face-pipeline',
        timestamp: Date.now(),
      })
    }
  }, [recordInteraction, setCurrentScene])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPhase('camera')
    }, NO_SIGNAL_DURATION_MS)

    return () => {
      window.clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    if (phase !== 'camera') {
      return
    }

    const DetectorCtor = (window as Window & { FaceDetector?: new (options?: unknown) => FaceDetectorLike })
      .FaceDetector

    if (DetectorCtor) {
      detectorRef.current = new DetectorCtor({ fastMode: true, maxDetectedFaces: 1 })
    }

    let cancelled = false

    const openCamera = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setPhase('denied')
        return
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        })

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        const video = videoRef.current
        if (!video) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        streamRef.current = stream
        video.srcObject = stream
        await video.play()

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        setCameraReady(true)
        pipelineStartRef.current = performance.now()
      } catch {
        if (!cancelled) {
          setPhase('denied')
        }
      }
    }

    void openCamera()

    return () => {
      cancelled = true
    }
  }, [phase])

  useEffect(() => {
    if (!cameraReady || phase !== 'camera') {
      return
    }

    const updateStage = (timestamp: number) => {
      const start = pipelineStartRef.current ?? timestamp
      pipelineStartRef.current = start
      const elapsed = Math.max(0, timestamp - start)

      const nextIndex = clamp(Math.floor(elapsed / STAGE_DURATION_MS), 0, PIPELINE_STEPS.length - 1)
      const nextProgress = clamp((elapsed - nextIndex * STAGE_DURATION_MS) / STAGE_DURATION_MS, 0, 1)

      const previousIndex = stageIndexRef.current
      const previousProgress = stageProgressRef.current
      stageIndexRef.current = nextIndex
      stageProgressRef.current = nextProgress

      if (nextIndex !== previousIndex) {
        setStageIndex(nextIndex)
      }
      if (nextIndex !== previousIndex || Math.abs(nextProgress - previousProgress) > 0.12) {
        setStageProgress(nextProgress)
      }

      stageFrameRef.current = window.requestAnimationFrame(updateStage)
    }

    stageFrameRef.current = window.requestAnimationFrame(updateStage)

    return () => {
      if (stageFrameRef.current !== null) {
        window.cancelAnimationFrame(stageFrameRef.current)
        stageFrameRef.current = null
      }
    }
  }, [cameraReady, phase])

  useEffect(() => {
    if (!cameraReady || phase !== 'camera') {
      return
    }

    let cancelled = false
    let busy = false

    const detectLoop = async () => {
      if (busy || cancelled) {
        detectionFrameRef.current = window.setTimeout(() => {
          void detectLoop()
        }, 130)
        return
      }

      const video = videoRef.current
      if (!video || video.videoWidth < 2 || video.videoHeight < 2) {
        detectionFrameRef.current = window.setTimeout(() => {
          void detectLoop()
        }, 130)
        return
      }

      busy = true
      try {
        const detector = detectorRef.current
        let sample: FaceSample | null = null

        if (detector) {
          const results = await detector.detect(video)
          const first = results[0]

          if (first) {
            const bbox = {
              x: first.boundingBox.x,
              y: first.boundingBox.y,
              width: first.boundingBox.width,
              height: first.boundingBox.height,
            }

            let leftEye: LandmarkPoint | null = null
            let rightEye: LandmarkPoint | null = null
            let nose: LandmarkPoint | null = null
            let mouth: LandmarkPoint | null = null
            let landmarkCount = 0

            for (const landmark of first.landmarks ?? []) {
              const center = centerOfLocations(landmark.locations)
              if (!center) {
                continue
              }

              landmarkCount += landmark.locations.length
              const key = landmark.type.toLowerCase()
              if (key.includes('left') && key.includes('eye')) {
                leftEye = center
              } else if (key.includes('right') && key.includes('eye')) {
                rightEye = center
              } else if (key.includes('eye')) {
                if (!leftEye) {
                  leftEye = center
                } else if (!rightEye) {
                  rightEye = center
                }
              } else if (key.includes('nose')) {
                nose = center
              } else if (key.includes('mouth') || key.includes('lip')) {
                mouth = center
              }
            }

            const fallbackLeftEye = { x: bbox.x + bbox.width * 0.33, y: bbox.y + bbox.height * 0.39 }
            const fallbackRightEye = { x: bbox.x + bbox.width * 0.67, y: bbox.y + bbox.height * 0.39 }
            const fallbackNose = { x: bbox.x + bbox.width * 0.5, y: bbox.y + bbox.height * 0.57 }
            const fallbackMouth = { x: bbox.x + bbox.width * 0.5, y: bbox.y + bbox.height * 0.75 }

            sample = {
              confidence: 0.92,
              bbox,
              leftEye: leftEye ?? fallbackLeftEye,
              rightEye: rightEye ?? fallbackRightEye,
              nose: nose ?? fallbackNose,
              mouth: mouth ?? fallbackMouth,
              landmarkCount: Math.max(landmarkCount, 4),
              timestamp: performance.now(),
            }
          }
        }

        if (!sample) {
          const width = video.videoWidth
          const height = video.videoHeight
          const fallbackWidth = width * 0.32
          const fallbackHeight = height * 0.46
          const fallbackX = width * 0.34
          const fallbackY = height * 0.24

          sample = {
            confidence: 0.68,
            bbox: { x: fallbackX, y: fallbackY, width: fallbackWidth, height: fallbackHeight },
            leftEye: { x: fallbackX + fallbackWidth * 0.33, y: fallbackY + fallbackHeight * 0.39 },
            rightEye: { x: fallbackX + fallbackWidth * 0.67, y: fallbackY + fallbackHeight * 0.39 },
            nose: { x: fallbackX + fallbackWidth * 0.5, y: fallbackY + fallbackHeight * 0.57 },
            mouth: { x: fallbackX + fallbackWidth * 0.5, y: fallbackY + fallbackHeight * 0.75 },
            landmarkCount: 4,
            timestamp: performance.now(),
          }
        }

        previousFaceRef.current = latestFaceRef.current
        latestFaceRef.current = sample

        const previous = previousFaceRef.current
        const motionDistance = previous
          ? Math.hypot(sample.nose.x - previous.nose.x, sample.nose.y - previous.nose.y)
          : 0
        const motionIndex = clamp(motionDistance / Math.max(1, sample.bbox.width * 0.09), 0, 1)

        const eyeCenterX = (sample.leftEye.x + sample.rightEye.x) * 0.5
        const gazeBias = clamp((sample.nose.x - eyeCenterX) / Math.max(6, sample.bbox.width * 0.16), -1, 1)

        const nextTelemetry = {
          confidence: sample.confidence,
          bboxText: `[${Math.round(sample.bbox.x)}, ${Math.round(sample.bbox.y)}, ${Math.round(sample.bbox.width)}, ${Math.round(sample.bbox.height)}]`,
          landmarkCount: sample.landmarkCount,
          motionIndex,
          gazeBias,
        }

        telemetryRef.current = nextTelemetry
        setTelemetry(nextTelemetry)
      } catch {
        // Keep previous sample when transient detection errors occur.
      } finally {
        busy = false
      }

      detectionFrameRef.current = window.setTimeout(() => {
        void detectLoop()
      }, 130)
    }

    void detectLoop()

    return () => {
      cancelled = true
      if (detectionFrameRef.current !== null) {
        window.clearTimeout(detectionFrameRef.current)
        detectionFrameRef.current = null
      }
    }
  }, [cameraReady, phase])

  useEffect(() => {
    if (!cameraReady || phase !== 'camera') {
      return
    }

    const draw = () => {
      const canvas = canvasRef.current
      const video = videoRef.current
      if (!canvas || !video || video.videoWidth < 2 || video.videoHeight < 2) {
        renderFrameRef.current = window.requestAnimationFrame(draw)
        return
      }

      const pixelRatio = window.devicePixelRatio || 1
      const width = window.innerWidth
      const height = window.innerHeight
      const targetWidth = Math.max(1, Math.round(width * pixelRatio))
      const targetHeight = Math.max(1, Math.round(height * pixelRatio))

      if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
        canvas.width = targetWidth
        canvas.height = targetHeight
        canvas.style.width = `${width}px`
        canvas.style.height = `${height}px`
      }

      const context = canvas.getContext('2d')
      if (!context) {
        renderFrameRef.current = window.requestAnimationFrame(draw)
        return
      }

      context.setTransform(1, 0, 0, 1, 0, 0)
      context.clearRect(0, 0, targetWidth, targetHeight)

      let crop = { sx: 0, sy: 0, sw: video.videoWidth, sh: video.videoHeight }
      const activeStage = stageIndexRef.current
      const activeProgress = stageProgressRef.current
      const gazeBias = telemetryRef.current.gazeBias

      if (activeStage === 2) {
        if (!workCanvasRef.current) {
          workCanvasRef.current = document.createElement('canvas')
        }
        crop = drawEdgeFrame(context, video, targetWidth, targetHeight, workCanvasRef.current)
      } else {
        const filters = [
          'grayscale(1) contrast(0.72) brightness(0.78) saturate(0.16)',
          'grayscale(1) contrast(1.95) brightness(0.95) saturate(0.2)',
          'grayscale(1)',
          'contrast(1.1) brightness(0.95) saturate(0.64)',
          'contrast(1.1) brightness(0.95) saturate(0.64)',
          'contrast(1.08) brightness(0.96) saturate(0.72)',
          'contrast(1.08) brightness(0.98) saturate(0.74)',
          'contrast(1.08) brightness(0.98) saturate(0.78)',
          'contrast(1.08) brightness(0.98) saturate(0.82)',
        ]
        crop = drawMirroredFrame(context, video, targetWidth, targetHeight, filters[activeStage] ?? filters[0] ?? 'none')
      }

      const sample = latestFaceRef.current
      if (sample) {
        const mappedRect = mapRectToCanvas(sample.bbox, crop, targetWidth, targetHeight)
        const mappedLeftEye = mapPointToCanvas(sample.leftEye, crop, targetWidth, targetHeight)
        const mappedRightEye = mapPointToCanvas(sample.rightEye, crop, targetWidth, targetHeight)
        const mappedNose = mapPointToCanvas(sample.nose, crop, targetWidth, targetHeight)
        const mappedMouth = mapPointToCanvas(sample.mouth, crop, targetWidth, targetHeight)

        const showEyes = activeStage > 3 || (activeStage === 3 && activeProgress > 0.12)
        const showNose = activeStage > 3 || (activeStage === 3 && activeProgress > 0.3)
        const showMouth = activeStage > 3 || (activeStage === 3 && activeProgress > 0.5)
        const showConfig = activeStage > 3 || (activeStage === 3 && activeProgress > 0.72)
        const showFaceBox =
          activeStage > 4 ||
          (activeStage === 4 && activeProgress > 0.62) ||
          (activeStage === 3 && activeProgress > 0.9)

        if (showConfig) {
          context.save()
          context.strokeStyle = 'rgba(126, 244, 193, 0.74)'
          context.lineWidth = Math.max(1, Math.round(2 * pixelRatio))
          context.beginPath()
          context.moveTo(mappedLeftEye.x, mappedLeftEye.y)
          context.lineTo(mappedNose.x, mappedNose.y)
          context.lineTo(mappedRightEye.x, mappedRightEye.y)
          context.moveTo(mappedNose.x, mappedNose.y)
          context.lineTo(mappedMouth.x, mappedMouth.y)
          context.stroke()
          context.restore()
        }

        const drawPoint = (point: LandmarkPoint, color: string) => {
          context.save()
          context.fillStyle = color
          context.beginPath()
          context.arc(point.x, point.y, Math.max(2, 3 * pixelRatio), 0, Math.PI * 2)
          context.fill()
          context.restore()
        }

        if (showEyes) {
          drawPoint(mappedLeftEye, 'rgba(143, 230, 255, 0.95)')
          drawPoint(mappedRightEye, 'rgba(143, 230, 255, 0.95)')
        }
        if (showNose) {
          drawPoint(mappedNose, 'rgba(254, 230, 140, 0.95)')
        }
        if (showMouth) {
          drawPoint(mappedMouth, 'rgba(241, 168, 168, 0.95)')
        }

        if (showFaceBox) {
          context.save()
          context.strokeStyle = 'rgba(137, 245, 142, 0.96)'
          context.lineWidth = Math.max(1, Math.round(2.2 * pixelRatio))
          context.setLineDash(activeStage < 5 ? [10 * pixelRatio, 8 * pixelRatio] : [])
          context.strokeRect(mappedRect.x, mappedRect.y, mappedRect.width, mappedRect.height)
          context.restore()
        }

        if (activeStage >= 6) {
          const gazeX = gazeBias
          const gazeTargetX = clamp(targetWidth * (0.5 + gazeX * 0.34), targetWidth * 0.08, targetWidth * 0.92)
          const gazeTargetY = clamp(mappedNose.y - targetHeight * 0.1, targetHeight * 0.12, targetHeight * 0.88)

          context.save()
          context.strokeStyle = 'rgba(160, 244, 255, 0.78)'
          context.lineWidth = Math.max(1, Math.round(2 * pixelRatio))
          context.beginPath()
          context.moveTo(mappedLeftEye.x, mappedLeftEye.y)
          context.lineTo(gazeTargetX, gazeTargetY)
          context.moveTo(mappedRightEye.x, mappedRightEye.y)
          context.lineTo(gazeTargetX, gazeTargetY)
          context.stroke()

          const vignette = context.createRadialGradient(
            gazeTargetX,
            gazeTargetY,
            Math.max(20, targetWidth * 0.08),
            gazeTargetX,
            gazeTargetY,
            Math.max(40, targetWidth * 0.44),
          )
          vignette.addColorStop(0, 'rgba(0,0,0,0)')
          vignette.addColorStop(1, 'rgba(2,7,12,0.58)')
          context.fillStyle = vignette
          context.fillRect(0, 0, targetWidth, targetHeight)
          context.restore()
        }
      }

      renderFrameRef.current = window.requestAnimationFrame(draw)
    }

    renderFrameRef.current = window.requestAnimationFrame(draw)

    return () => {
      if (renderFrameRef.current !== null) {
        window.cancelAnimationFrame(renderFrameRef.current)
        renderFrameRef.current = null
      }
    }
  }, [cameraReady, phase])

  useEffect(() => {
    return () => {
      if (stageFrameRef.current !== null) {
        window.cancelAnimationFrame(stageFrameRef.current)
      }
      if (renderFrameRef.current !== null) {
        window.cancelAnimationFrame(renderFrameRef.current)
      }
      if (detectionFrameRef.current !== null) {
        window.clearTimeout(detectionFrameRef.current)
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }
    }
  }, [])

  return (
    <section className="face-pipeline-scene" aria-label={isZh ? '人脸加工管线场景' : 'Face processing pipeline scene'}>
      <div className="face-pipeline-language" onClick={(event) => event.stopPropagation()}>
        <LanguageToggle />
      </div>

      {phase === 'no-signal' ? (
        <div className="face-pipeline-nosignal" aria-live="polite">
          <img src={noSignalTvUrl} alt="" draggable={false} />
          <p>{isZh ? 'SIGNAL LOST // 正在重建视觉流...' : 'SIGNAL LOST // RECONSTRUCTING VISUAL STREAM...'}</p>
        </div>
      ) : null}

      <video ref={videoRef} className="face-pipeline-video" playsInline muted />
      <canvas ref={canvasRef} className="face-pipeline-canvas" />

      {phase === 'camera' ? (
        <>
          <div className="face-pipeline-overlay-top">
            <h1>{isZh ? 'You Are Not a Face Yet' : 'You Are Not a Face Yet'}</h1>
            <p>{stageLead}</p>
            <div className="face-pipeline-chain" aria-label="Face processing pipeline">
              {PIPELINE_STEPS.map((step, index) => (
                <span
                  key={step.id}
                  className={`face-pipeline-chain-step ${index === stageIndex ? 'active' : index < stageIndex ? 'done' : ''}`}
                >
                  {step.label}
                </span>
              ))}
            </div>
          </div>

          {stageIndex === 4 ? (
            <div className="face-pipeline-config-panel" aria-label={isZh ? '构型加工对照' : 'Configural processing variants'}>
              <article>
                <h3>Parts only</h3>
                <p>{isZh ? '局部仍在，空间关系被打散。' : 'Local parts survive, spatial relation is scrambled.'}</p>
              </article>
              <article>
                <h3>Inverted</h3>
                <p>{isZh ? '检测仍可触发，识别主观难度上升。' : 'Detection survives, recognition becomes harder.'}</p>
              </article>
              <article>
                <h3>Misaligned</h3>
                <p>{isZh ? '上下面部错位，整体知觉显著下降。' : 'Upper/lower mismatch weakens holistic perception.'}</p>
              </article>
            </div>
          ) : null}

          <div className="face-pipeline-network" aria-label={isZh ? '人脸网络动态' : 'Face network dynamics'}>
            <h3>{isZh ? 'THE FACE NETWORK' : 'THE FACE NETWORK'}</h3>
            <ul>
              <li className={stageIndex >= 1 ? 'active' : ''}>OCCIPITAL VISUAL CORTEX</li>
              <li className={stageIndex >= 3 ? 'active' : ''}>OFA // facial parts</li>
              <li className={stageIndex >= 5 ? 'active' : ''}>FFA // stable structure</li>
              <li className={stageIndex >= 6 ? 'active' : ''}>pSTS // gaze, expression, motion</li>
              <li className={stageIndex >= 7 ? 'active' : ''}>AMYGDALA // affective salience</li>
            </ul>
          </div>

          {stageIndex >= 8 ? (
            <div className="face-pipeline-compare">
              <article>
                <h3>{isZh ? 'MACHINE OUTPUT' : 'MACHINE OUTPUT'}</h3>
                <p>class: face</p>
                <p>confidence: {telemetry.confidence.toFixed(3)}</p>
                <p>bbox: {telemetry.bboxText}</p>
                <p>landmarks: {telemetry.landmarkCount}</p>
                <p>motion vector: {telemetry.motionIndex.toFixed(3)}</p>
              </article>
              <article>
                <h3>{isZh ? 'HUMAN MEANING' : 'HUMAN MEANING'}</h3>
                <p>FACE</p>
                <p>{isZh ? '→ 目光方向' : '→ gaze'}</p>
                <p>{isZh ? '→ 意图?' : '→ intention?'}</p>
                <p>{isZh ? '→ 熟悉感?' : '→ familiarity?'}</p>
                <p>{isZh ? '→ 情绪显著性?' : '→ emotional salience?'}</p>
                <p>{isZh ? '→ 社会意义?' : '→ social meaning?'}</p>
              </article>
            </div>
          ) : null}

          {!cameraReady ? (
            <p className="face-pipeline-camera-status">{isZh ? '正在请求摄像头访问...' : 'Requesting camera access...'}</p>
          ) : null}

          <p className="face-pipeline-disclaimer">
            {isZh
              ? '仅做实时可视化，不保存图像，不上传人脸数据，不做身份识别。'
              : 'Realtime visualization only: no image storage, no upload, no identity recognition.'}
          </p>
        </>
      ) : null}

      {phase === 'denied' ? (
        <div className="face-pipeline-denied" aria-live="polite">
          <p>{isZh ? '摄像头权限不可用，已切换为无摄像头模式。' : 'Camera permission unavailable. Running in no-camera mode.'}</p>
        </div>
      ) : null}

      <button
        type="button"
        className="face-pipeline-continue"
        onClick={() => {
          recordInteraction({
            type: 'click',
            scene: '/scene/face-pipeline',
            target: 'continue-to-amygdala',
            timestamp: Date.now(),
          })
          navigate('/scene/amygdala')
        }}
      >
        {isZh ? '继续' : 'Continue'}
      </button>
    </section>
  )
}
