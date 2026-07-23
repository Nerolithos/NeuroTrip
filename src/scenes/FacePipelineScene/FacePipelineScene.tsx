import { useEffect, useRef, useState } from 'react'
import { useNeuroTripStore } from '../../stores/neuroTripStore'
import { useUiLanguageStore } from '../../stores/uiLanguageStore'
import { requestEmojiMatch, resolveChatapConfig } from './emojiMatcher'
import './facePipeline.css'

type FaceRect = {
  x: number
  y: number
  w: number
  h: number
}

type WindowWithDetectors = Window & {
  cv?: {
    Mat: new () => { delete: () => void }
    RectVector: new () => {
      size: () => number
      get: (index: number) => { x: number; y: number; width: number; height: number }
      delete: () => void
    }
    Size: new (width: number, height: number) => unknown
    CascadeClassifier: new () => {
      load: (path: string) => boolean
      detectMultiScale: (
        image: { delete: () => void },
        objects: { size: () => number; get: (index: number) => { x: number; y: number; width: number; height: number } },
        scaleFactor: number,
        minNeighbors: number,
        flags: number,
        minSize: unknown,
        maxSize: unknown,
      ) => void
      delete: () => void
    }
    COLOR_RGBA2GRAY: number
    cvtColor: (src: { delete: () => void }, dst: { delete: () => void }, code: number, dstCn?: number) => void
    imread: (canvas: HTMLCanvasElement) => { delete: () => void }
    FS_createDataFile: (
      parent: string,
      name: string,
      data: Uint8Array,
      canRead: boolean,
      canWrite: boolean,
      canOwn: boolean,
    ) => void
    onRuntimeInitialized?: () => void
  }
  FaceDetector?: new (options?: unknown) => {
    detect: (input: HTMLCanvasElement) => Promise<Array<{ boundingBox?: DOMRectReadOnly; x?: number; y?: number; width?: number; height?: number }>>
  }
  dlibHogDetectFaces?: (video: HTMLVideoElement) => FaceRect[]
  CHATAP?: string
  __CHATAP__?: string
}

type DetectorBackend = 'opencv' | 'face-detector' | 'none'

const OPEN_CV_CASCADE_FILE = 'haarcascade_frontalface_default.xml'

const faceDetectorBackend: {
  detector: null | { detect: (input: HTMLCanvasElement) => Promise<Array<{ boundingBox?: DOMRectReadOnly; x?: number; y?: number; width?: number; height?: number }>> }
  offscreenCanvas: HTMLCanvasElement | null
  offscreenCtx: CanvasRenderingContext2D | null
  latestFacesByVideo: WeakMap<HTMLVideoElement, FaceRect[]>
  activeVideos: HTMLVideoElement[]
  loopRunning: boolean
} = {
  detector: null,
  offscreenCanvas: null,
  offscreenCtx: null,
  latestFacesByVideo: new WeakMap(),
  activeVideos: [],
  loopRunning: false,
}

const opencvBackend: {
  cvReady: boolean
  initializing: boolean
  faceClassifier: null | {
    load: (path: string) => boolean
    detectMultiScale: (
      image: { delete: () => void },
      objects: { size: () => number; get: (index: number) => { x: number; y: number; width: number; height: number } },
      scaleFactor: number,
      minNeighbors: number,
      flags: number,
      minSize: unknown,
      maxSize: unknown,
    ) => void
    delete: () => void
  }
  cascadeLoaded: boolean
  loadingCascade: boolean
  cascadeFile: string
  offscreenCanvas: HTMLCanvasElement | null
  offscreenCtx: CanvasRenderingContext2D | null
  latestFacesByVideo: WeakMap<HTMLVideoElement, FaceRect[]>
  activeVideos: HTMLVideoElement[]
  loopRunning: boolean
  pollTimer: number | null
} = {
  cvReady: false,
  initializing: false,
  faceClassifier: null,
  cascadeLoaded: false,
  loadingCascade: false,
  // Use an absolute path so fetch works under nested SPA routes like /scene/face-pipeline.
  cascadeFile: `/${OPEN_CV_CASCADE_FILE}`,
  offscreenCanvas: null,
  offscreenCtx: null,
  latestFacesByVideo: new WeakMap(),
  activeVideos: [],
  loopRunning: false,
  pollTimer: null,
}

const removeFromList = (arr: HTMLVideoElement[], value: HTMLVideoElement) => {
  const index = arr.indexOf(value)
  if (index >= 0) {
    arr.splice(index, 1)
  }
}

const ensureDlibFromOpenCvBackend = () => {
  const scopedWindow = window as WindowWithDetectors
  if (!scopedWindow.dlibHogDetectFaces) {
    scopedWindow.dlibHogDetectFaces = (video) => {
      const arr = opencvBackend.latestFacesByVideo.get(video)
      return arr ? arr.slice() : []
    }
  }
}

const ensureDlibFromFaceDetectorBackend = () => {
  const scopedWindow = window as WindowWithDetectors
  if (!scopedWindow.dlibHogDetectFaces) {
    scopedWindow.dlibHogDetectFaces = (video) => {
      const arr = faceDetectorBackend.latestFacesByVideo.get(video)
      return arr ? arr.slice() : []
    }
  }
}

const runOpenCvLoop = () => {
  const scopedWindow = window as WindowWithDetectors
  if (!opencvBackend.cvReady || !opencvBackend.faceClassifier || !opencvBackend.offscreenCanvas || !opencvBackend.offscreenCtx) {
    opencvBackend.loopRunning = false
    return
  }

  const videos = opencvBackend.activeVideos.slice()
  if (!videos.length) {
    opencvBackend.loopRunning = false
    return
  }

  const c = opencvBackend.offscreenCanvas
  const ctx2d = opencvBackend.offscreenCtx

  try {
    for (let i = 0; i < videos.length; i += 1) {
      const videoEl = videos[i]
      if (!videoEl) continue
      if (!videoEl || videoEl.readyState < 2) {
        opencvBackend.latestFacesByVideo.set(videoEl, [])
        continue
      }

      const vw = videoEl.videoWidth || videoEl.clientWidth
      const vh = videoEl.videoHeight || videoEl.clientHeight
      if (!vw || !vh) {
        opencvBackend.latestFacesByVideo.set(videoEl, [])
        continue
      }

      const targetW = Math.min(320, vw)
      const scale = targetW / vw
      const targetH = Math.max(1, Math.round(vh * scale))
      c.width = targetW
      c.height = targetH

      try {
        ctx2d.drawImage(videoEl, 0, 0, targetW, targetH)
      } catch {
        opencvBackend.latestFacesByVideo.set(videoEl, [])
        continue
      }

      let src: { delete: () => void } | null = null
      let gray: { delete: () => void } | null = null
      let facesRect: { size: () => number; get: (index: number) => { x: number; y: number; width: number; height: number }; delete: () => void } | null = null
      let faces: FaceRect[] = []

      try {
        if (!scopedWindow.cv || !opencvBackend.faceClassifier) {
          faces = []
        } else {
          src = scopedWindow.cv.imread(c)
          gray = new scopedWindow.cv.Mat()
          scopedWindow.cv.cvtColor(src, gray, scopedWindow.cv.COLOR_RGBA2GRAY, 0)
          facesRect = new scopedWindow.cv.RectVector()

          const minSize = new scopedWindow.cv.Size(60, 60)
          const maxSize = new scopedWindow.cv.Size(0, 0)
          opencvBackend.faceClassifier.detectMultiScale(gray, facesRect, 1.1, 3, 0, minSize, maxSize)

          let bestArea = 0
          let bestRect: { x: number; y: number; width: number; height: number } | null = null
          for (let j = 0; j < facesRect.size(); j += 1) {
            const r = facesRect.get(j)
            const area = r.width * r.height
            if (area > bestArea) {
              bestArea = area
              bestRect = r
            }
          }

          if (bestRect) {
            const sx = vw / targetW
            const sy = vh / targetH
            faces.push({
              x: bestRect.x * sx,
              y: bestRect.y * sy,
              w: bestRect.width * sx,
              h: bestRect.height * sy,
            })
          }
        }
      } catch {
        faces = []
      } finally {
        src?.delete()
        gray?.delete()
        facesRect?.delete()
      }

      opencvBackend.latestFacesByVideo.set(videoEl, faces)
    }
  } catch {
    opencvBackend.loopRunning = false
    return
  }

  if (opencvBackend.activeVideos.length) {
    window.setTimeout(runOpenCvLoop, 180)
  } else {
    opencvBackend.loopRunning = false
  }
}

const runFaceDetectorLoop = () => {
  if (!faceDetectorBackend.detector || !faceDetectorBackend.offscreenCanvas || !faceDetectorBackend.offscreenCtx) {
    faceDetectorBackend.loopRunning = false
    return
  }

  const videos = faceDetectorBackend.activeVideos.slice()
  if (!videos.length) {
    faceDetectorBackend.loopRunning = false
    return
  }

  const c = faceDetectorBackend.offscreenCanvas
  const ctx = faceDetectorBackend.offscreenCtx

  const detector = faceDetectorBackend.detector
  if (!detector) {
    faceDetectorBackend.loopRunning = false
    return
  }

  Promise.all(
    videos.map((videoEl) => {
      if (!videoEl) {
        return Promise.resolve({ video: null, faces: [] as FaceRect[] })
      }
      if (!videoEl || videoEl.readyState < 2) {
        return Promise.resolve({ video: videoEl, faces: [] as FaceRect[] })
      }
      const vw = videoEl.videoWidth || videoEl.clientWidth
      const vh = videoEl.videoHeight || videoEl.clientHeight
      if (!vw || !vh) {
        return Promise.resolve({ video: videoEl, faces: [] as FaceRect[] })
      }

      const targetW = Math.min(320, vw)
      const scale = targetW / vw
      const targetH = Math.max(1, Math.round(vh * scale))
      c.width = targetW
      c.height = targetH

      try {
        ctx.drawImage(videoEl, 0, 0, targetW, targetH)
      } catch {
        return Promise.resolve({ video: videoEl, faces: [] as FaceRect[] })
      }

      return detector.detect(c).then((detections) => {
        const sx = vw / targetW
        const sy = vh / targetH
        const faces = (detections || []).map((d) => {
          const b = d.boundingBox || d
          const x = (b?.x || 0) * sx
          const y = (b?.y || 0) * sy
          const w = (b?.width || 0) * sx
          const h = (b?.height || 0) * sy
          return { x, y, w, h }
        })
        return { video: videoEl, faces }
      }).catch(() => {
        return { video: videoEl, faces: [] as FaceRect[] }
      })
    }),
  ).then((results) => {
    for (let i = 0; i < results.length; i += 1) {
      const r = results[i]
      if (!r || !r.video) continue
      if (r.faces && r.faces.length) {
        faceDetectorBackend.latestFacesByVideo.set(r.video, r.faces)
      } else {
        faceDetectorBackend.latestFacesByVideo.set(r.video, [])
      }
    }

    if (faceDetectorBackend.activeVideos.length) {
      window.setTimeout(runFaceDetectorLoop, 120)
    } else {
      faceDetectorBackend.loopRunning = false
    }
  }).catch(() => {
    faceDetectorBackend.loopRunning = false
  })
}

const ensureFaceDetectorForVideo = (videoEl: HTMLVideoElement) => {
  const scopedWindow = window as WindowWithDetectors
  if (!videoEl || !scopedWindow.FaceDetector) return false

  if (!faceDetectorBackend.detector) {
    try {
      faceDetectorBackend.detector = new scopedWindow.FaceDetector({ fastMode: true, maxDetectedFaces: 3 })
    } catch {
      faceDetectorBackend.detector = null
      return false
    }
  }

  if (!faceDetectorBackend.offscreenCanvas) {
    const c = document.createElement('canvas')
    c.width = 320
    c.height = 240
    faceDetectorBackend.offscreenCanvas = c
    faceDetectorBackend.offscreenCtx = c.getContext('2d', { willReadFrequently: true })
  }

  if (faceDetectorBackend.activeVideos.indexOf(videoEl) === -1) {
    faceDetectorBackend.activeVideos.push(videoEl)
  }

  if (!faceDetectorBackend.loopRunning) {
    faceDetectorBackend.loopRunning = true
    runFaceDetectorLoop()
  }

  ensureDlibFromFaceDetectorBackend()
  return true
}

const ensureOpenCvDetectorForVideo = (videoEl: HTMLVideoElement, onActiveBackend: (backend: DetectorBackend) => void) => {
  const scopedWindow = window as WindowWithDetectors
  if (!videoEl) return

  if (opencvBackend.activeVideos.indexOf(videoEl) === -1) {
    opencvBackend.activeVideos.push(videoEl)
  }

  const startLoopIfReady = () => {
    const scoped = window as WindowWithDetectors
    if (!opencvBackend.cvReady || opencvBackend.loopRunning) return

    if (!opencvBackend.offscreenCanvas) {
      const c = document.createElement('canvas')
      c.width = 320
      c.height = 240
      opencvBackend.offscreenCanvas = c
      opencvBackend.offscreenCtx = c.getContext('2d', { willReadFrequently: true })
    }

    ensureDlibFromOpenCvBackend()
    onActiveBackend('opencv')

    if (!opencvBackend.faceClassifier) {
      if (!opencvBackend.loadingCascade && scoped.cv) {
        opencvBackend.loadingCascade = true
        try {
          fetch(opencvBackend.cascadeFile)
            .then((res) => res.arrayBuffer())
            .then((buf) => {
              const scopedReady = window as WindowWithDetectors
              if (!scopedReady.cv) {
                opencvBackend.loadingCascade = false
                return
              }
              const data = new Uint8Array(buf)
              scopedReady.cv.FS_createDataFile('/', opencvBackend.cascadeFile, data, true, false, false)
              const classifier = new scopedReady.cv.CascadeClassifier()
              if (!classifier.load(opencvBackend.cascadeFile)) {
                classifier.delete()
                opencvBackend.loadingCascade = false
                return
              }
              opencvBackend.faceClassifier = classifier
              opencvBackend.cascadeLoaded = true
              opencvBackend.loadingCascade = false
              onActiveBackend('opencv')
              if (!opencvBackend.loopRunning && opencvBackend.activeVideos.length) {
                opencvBackend.loopRunning = true
                runOpenCvLoop()
              }
            })
            .catch(() => {
              opencvBackend.loadingCascade = false
            })
        } catch {
          opencvBackend.loadingCascade = false
        }
      }
      return
    }

    onActiveBackend('opencv')
    opencvBackend.loopRunning = true
    runOpenCvLoop()
  }

  if (!scopedWindow.cv) {
    if (!opencvBackend.pollTimer) {
      opencvBackend.pollTimer = window.setInterval(() => {
        const scoped = window as WindowWithDetectors
        if (scoped.cv) {
          if (opencvBackend.pollTimer !== null) {
            window.clearInterval(opencvBackend.pollTimer)
            opencvBackend.pollTimer = null
          }
          if (scoped.cv.Mat) {
            opencvBackend.cvReady = true
            startLoopIfReady()
          } else if (!opencvBackend.initializing) {
            opencvBackend.initializing = true
            scoped.cv.onRuntimeInitialized = () => {
              opencvBackend.cvReady = true
              opencvBackend.initializing = false
              startLoopIfReady()
            }
          }
        }
      }, 300)
    }
    return
  }

  if (!opencvBackend.cvReady) {
    if (scopedWindow.cv.Mat) {
      opencvBackend.cvReady = true
    } else if (!opencvBackend.initializing) {
      opencvBackend.initializing = true
      scopedWindow.cv.onRuntimeInitialized = () => {
        opencvBackend.cvReady = true
        opencvBackend.initializing = false
        startLoopIfReady()
      }
    }
  }

  startLoopIfReady()
}

export const FacePipelineScene = () => {
  const language = useUiLanguageStore((state) => state.language)
  const isZh = language === 'zh'
  const setCurrentScene = useNeuroTripStore((state) => state.setCurrentScene)
  const recordInteraction = useNeuroTripStore((state) => state.recordInteraction)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const faceDetectionActiveRef = useRef(false)
  const faceDetectionRafIdRef = useRef(0)
  const stopLoopRef = useRef<(() => void) | null>(null)
  const emojiLoopTimerRef = useRef<number | null>(null)
  const emojiBusyRef = useRef(false)
  const emojiCaptureCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const lastFaceDetectedAtRef = useRef(0)

  const [cameraStatus, setCameraStatus] = useState(isZh ? '请求摄像头中...' : 'Requesting camera...')
  const [cameraError, setCameraError] = useState('')
  const [detectorBackend, setDetectorBackend] = useState<DetectorBackend>('none')
  const [emojiGlyph, setEmojiGlyph] = useState('🙂')
  const [emojiStatus, setEmojiStatus] = useState(isZh ? '等待表情识别' : 'Waiting for emoji match')

  useEffect(() => {
    setCurrentScene('/scene/face-pipeline')
    recordInteraction({ type: 'scene-enter', scene: '/scene/face-pipeline', timestamp: Date.now() })

    return () => {
      recordInteraction({ type: 'scene-exit', scene: '/scene/face-pipeline', timestamp: Date.now() })
    }
  }, [recordInteraction, setCurrentScene])

  useEffect(() => {
    let cancelled = false

    const stopFaceDetection = () => {
      faceDetectionActiveRef.current = false
      if (faceDetectionRafIdRef.current) {
        try {
          window.cancelAnimationFrame(faceDetectionRafIdRef.current)
        } catch {
          // no-op
        }
        faceDetectionRafIdRef.current = 0
      }

      const canvas = canvasRef.current
      if (canvas) {
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width || 0, canvas.height || 0)
        }
      }
    }

    const startFaceDetectionLoop = () => {
      const video = videoRef.current
      const canvas = canvasRef.current
      if (!video || !canvas) return

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const resizeCanvasToViewport = () => {
        const vw = window.innerWidth || document.documentElement.clientWidth || canvas.width || 0
        const vh = window.innerHeight || document.documentElement.clientHeight || canvas.height || 0
        canvas.width = vw
        canvas.height = vh
      }

      resizeCanvasToViewport()
      window.addEventListener('resize', resizeCanvasToViewport)

      faceDetectionActiveRef.current = true

      const loop = () => {
        if (!faceDetectionActiveRef.current) return
        const liveVideo = videoRef.current
        const liveCanvas = canvasRef.current
        if (!liveVideo || !liveCanvas || liveVideo.readyState < 2) {
          faceDetectionRafIdRef.current = window.requestAnimationFrame(loop)
          return
        }

        ctx.clearRect(0, 0, liveCanvas.width, liveCanvas.height)

        let faces: FaceRect[] = []
        try {
          const scopedWindow = window as WindowWithDetectors
          if (scopedWindow.dlibHogDetectFaces) {
            faces = scopedWindow.dlibHogDetectFaces(liveVideo) || []
          }
        } catch {
          faces = []
        }

        if (faces.length > 0) {
          lastFaceDetectedAtRef.current = performance.now()
          const f = faces[0]
          if (!f) {
            faceDetectionRafIdRef.current = window.requestAnimationFrame(loop)
            return
          }

          const videoW = liveVideo.videoWidth || liveVideo.clientWidth || liveCanvas.width
          const videoH = liveVideo.videoHeight || liveVideo.clientHeight || liveCanvas.height
          const canvasW = liveCanvas.width
          const canvasH = liveCanvas.height

          let canvasX = f.x
          let canvasY = f.y
          let canvasWrect = f.w
          let canvasHrect = f.h

          if (videoW > 0 && videoH > 0 && canvasW > 0 && canvasH > 0) {
            const scaleX = canvasW / videoW
            const scaleY = canvasH / videoH
            const scale = Math.max(scaleX, scaleY)
            const displayW = videoW * scale
            const displayH = videoH * scale
            const offsetX = (canvasW - displayW) / 2
            const offsetY = (canvasH - displayH) / 2

            canvasX = offsetX + f.x * scale
            canvasY = offsetY + f.y * scale
            canvasWrect = f.w * scale
            canvasHrect = f.h * scale
          }

          ctx.strokeStyle = '#00ff00'
          ctx.lineWidth = 3
          ctx.strokeRect(canvasX, canvasY, canvasWrect, canvasHrect)
        }

        faceDetectionRafIdRef.current = window.requestAnimationFrame(loop)
      }

      faceDetectionRafIdRef.current = window.requestAnimationFrame(loop)

      stopLoopRef.current = () => {
        window.removeEventListener('resize', resizeCanvasToViewport)
        stopFaceDetection()
      }
    }

    const resolveChatapToken = () => {
      const urlToken = (new URLSearchParams(window.location.search).get('chatap') || '').trim()
      if (urlToken) {
        try {
          window.localStorage.setItem('CHATAP', urlToken)
        } catch {
          // no-op
        }
        return urlToken
      }

      const env = import.meta.env as Record<string, string | undefined>
      const scopedWindow = window as WindowWithDetectors
      let stored = ''
      try {
        stored = (window.localStorage.getItem('CHATAP') || '').trim()
      } catch {
        stored = ''
      }
      return (env.VITE_CHATAP || scopedWindow.CHATAP || scopedWindow.__CHATAP__ || stored || '').trim()
    }

    const resolveFallbackEndpoint = () => {
      const env = import.meta.env as Record<string, string | undefined>
      const fromEnv = (env.VITE_CHATAP_PROXY_FALLBACK || '').trim()
      if (fromEnv) return fromEnv

      const host = window.location.hostname.toLowerCase()
      if (host === 'neuro.nero-lithos.com' || host.endsWith('.neuro.nero-lithos.com')) {
        return 'https://lithos.pages.dev/api/chatap'
      }
      return `${window.location.origin}/api/chatap`
    }

    const startEmojiMatchLoop = () => {
      const env = import.meta.env as Record<string, string | undefined>
      const chatap = resolveChatapToken()
      const config = resolveChatapConfig({
        chatap,
        model: (env.VITE_CHATAP_MODEL || '').trim(),
        fallbackModel: (env.VITE_CHATAP_MODEL_FALLBACK || '').trim(),
        fallbackEndpoint: resolveFallbackEndpoint(),
        siteUrl: (env.VITE_CHATAP_SITE_URL || window.location.origin).trim(),
        title: (env.VITE_CHATAP_TITLE || 'FutureGate-Life3').trim(),
      })

      if (!config) {
        setEmojiStatus(isZh ? '未配置 CHATAP' : 'CHATAP is not configured')
        return
      }

      setEmojiStatus(isZh ? '表情匹配中' : 'Matching emoji...')

      const tick = async () => {
        if (emojiBusyRef.current) return
        if (performance.now() - lastFaceDetectedAtRef.current > 2400) return

        const video = videoRef.current
        if (!video || video.readyState < 2) return

        const vw = video.videoWidth || video.clientWidth
        const vh = video.videoHeight || video.clientHeight
        if (!vw || !vh) return

        if (!emojiCaptureCanvasRef.current) {
          emojiCaptureCanvasRef.current = document.createElement('canvas')
        }

        const captureCanvas = emojiCaptureCanvasRef.current
        const captureContext = captureCanvas.getContext('2d', { willReadFrequently: true })
        if (!captureContext) return

        const targetW = Math.min(256, vw)
        const scale = targetW / vw
        const targetH = Math.max(1, Math.round(vh * scale))
        captureCanvas.width = targetW
        captureCanvas.height = targetH

        try {
          captureContext.drawImage(video, 0, 0, targetW, targetH)
        } catch {
          return
        }

        const imageDataUrl = captureCanvas.toDataURL('image/jpeg', 0.78)
        emojiBusyRef.current = true

        try {
          const emoji = await requestEmojiMatch({ config, imageDataUrl, isZh })
          if (emoji) {
            setEmojiGlyph(emoji)
            setEmojiStatus(isZh ? '已匹配' : 'Matched')
          } else {
            setEmojiStatus(isZh ? '匹配失败，继续尝试' : 'No match, retrying')
          }
        } finally {
          emojiBusyRef.current = false
        }
      }

      void tick()
      emojiLoopTimerRef.current = window.setInterval(() => {
        void tick()
      }, 2800)
    }

    const openCamera = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraStatus(isZh ? '摄像头连接失败' : 'Camera failed')
        setCameraError(isZh ? '当前设备不支持摄像头。' : 'Camera is not available on this device.')
        return
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
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
        video.muted = true
        video.playsInline = true
        video.autoplay = true
        await video.play()

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        setCameraStatus(isZh ? '摄像头已连接' : 'Camera connected')
        setCameraError('')
        setDetectorBackend('opencv')

        ensureOpenCvDetectorForVideo(video, setDetectorBackend)

        const opencvStartupTimeout = window.setTimeout(() => {
          const scopedWindow = window as WindowWithDetectors
          if (!scopedWindow.dlibHogDetectFaces) {
            const fallbackReady = ensureFaceDetectorForVideo(video)
            if (fallbackReady) {
              setDetectorBackend('face-detector')
            }
          }
        }, 1200)

        startFaceDetectionLoop()
        startEmojiMatchLoop()

        stopLoopRef.current = (() => {
          const previousStop = stopLoopRef.current
          return () => {
            window.clearTimeout(opencvStartupTimeout)
            if (emojiLoopTimerRef.current !== null) {
              window.clearInterval(emojiLoopTimerRef.current)
              emojiLoopTimerRef.current = null
            }
            if (previousStop) previousStop()
          }
        })()
      } catch {
        setCameraStatus(isZh ? '摄像头连接失败' : 'Camera failed')
        setCameraError(isZh ? '摄像头权限不可用。' : 'Camera permission denied.')
      }
    }

    void openCamera()

    return () => {
      cancelled = true
      if (stopLoopRef.current) {
        stopLoopRef.current()
        stopLoopRef.current = null
      }
      if (emojiLoopTimerRef.current !== null) {
        window.clearInterval(emojiLoopTimerRef.current)
        emojiLoopTimerRef.current = null
      }

      const stream = streamRef.current
      if (stream) {
        stream.getTracks().forEach((track) => {
          try {
            track.stop()
          } catch {
            // no-op
          }
        })
        streamRef.current = null
      }

      const video = videoRef.current
      if (video) {
        removeFromList(opencvBackend.activeVideos, video)
        removeFromList(faceDetectorBackend.activeVideos, video)
        opencvBackend.latestFacesByVideo.delete(video)
        faceDetectorBackend.latestFacesByVideo.delete(video)
      }
    }
  }, [isZh])

  return (
    <section className="face-lite-scene" aria-label={isZh ? '人脸检测场景' : 'Face detection scene'}>
      <h1 className="face-lite-title">{isZh ? '识别脸与表情' : 'Face and Emotion Recognition'}</h1>

      <video ref={videoRef} className="face-lite-video" playsInline muted />
      <canvas ref={canvasRef} className="face-lite-canvas" />

      <div className="face-lite-status" aria-live="polite">
        <p>{cameraStatus}</p>
        <p>{detectorBackend}</p>
      </div>

      <aside className="face-lite-emoji" aria-live="polite">
        <p className="face-lite-emoji-label">{isZh ? '当前最像 emoji' : 'Best matching emoji'}</p>
        <p className="face-lite-emoji-glyph">{emojiGlyph}</p>
        <p className="face-lite-emoji-status">{emojiStatus}</p>
      </aside>

      {cameraError ? <p className="face-lite-error">{cameraError}</p> : null}
    </section>
  )
}
