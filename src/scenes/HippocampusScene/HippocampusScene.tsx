import { useEffect, useMemo, useState } from 'react'
import { SceneFrame } from '../../components/SceneFrame'
import { useNeuroTripStore } from '../../stores/neuroTripStore'
import { useUiLanguageStore } from '../../stores/uiLanguageStore'
import rawMemoryGraphHtml from '../../../knowledge_graph/memory_graph.html?raw'
import initMemoryMaleHackathon from '../../assets/init-memory/male-hackathon.webp'
import initMemoryPerfumePoster from '../../assets/init-memory/perfume-poster.webp'
import initMemoryOilPainting from '../../assets/init-memory/oil-painting.webp'
import initMemoryLakeView from '../../assets/init-memory/lakeside-view.webp'
import { buildProxyEndpointCandidates, resolveChatapConfig, type ChatapConfig } from '../FacePipelineScene/emojiMatcher'

const OBSERVE_DURATION_MS = 12_000

const IMAGE_MODEL_CANDIDATES = [
  'openai/gpt-image-1',
  'google/gemini-2.5-flash-image-preview',
  'black-forest-labs/flux-1.1-pro',
  'black-forest-labs/flux-1-schnell',
  'stabilityai/stable-diffusion-3.5-large',
]

type InitMemoryCard = {
  id: string
  src: string
  fileName: string
}

type ReconstructFailure = {
  ok: false
  status?: number
  detail?: string
  endpoint?: string
}

type ReconstructSuccess = {
  ok: true
  imageUrl: string
  model: string
}

type ReconstructResult = ReconstructFailure | ReconstructSuccess

const DEFAULT_MEMORY_CARD: InitMemoryCard = {
  id: 'male-hackathon',
  src: initMemoryMaleHackathon,
  fileName: '“男性”黑客松选手',
}

const INIT_MEMORY_CARDS: InitMemoryCard[] = [
  DEFAULT_MEMORY_CARD,
  {
    id: 'perfume-poster',
    src: initMemoryPerfumePoster,
    fileName: '香水海报',
  },
  {
    id: 'oil-painting',
    src: initMemoryOilPainting,
    fileName: '《生与活》油画',
  },
  {
    id: 'lakeside-view',
    src: initMemoryLakeView,
    fileName: '湖畔风光',
  },
]

const pushIfUnique = (list: string[], value: string | undefined) => {
  const next = (value || '').trim()
  if (!next || list.includes(next)) return
  list.push(next)
}

const pickImageModels = (primary: string, fallback: string) => {
  const models: string[] = []
  pushIfUnique(models, primary)
  pushIfUnique(models, fallback)
  IMAGE_MODEL_CANDIDATES.forEach((model) => pushIfUnique(models, model))
  return models
}

const buildOpenRouterHeaders = (config: ChatapConfig) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (config.mode === 'direct-openrouter') {
    headers.Authorization = `Bearer ${config.secret || ''}`
    headers['HTTP-Referer'] = config.siteUrl
    headers['X-Title'] = config.title
  }

  return headers
}

const parseJsonFromText = (text: string): Record<string, unknown> | null => {
  if (!text.trim()) return null

  try {
    const parsed = JSON.parse(text)
    if (parsed && typeof parsed === 'object') {
      return parsed as Record<string, unknown>
    }
  } catch {
    // continue
  }

  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start < 0 || end <= start) return null

  try {
    const sliced = JSON.parse(text.slice(start, end + 1))
    if (sliced && typeof sliced === 'object') {
      return sliced as Record<string, unknown>
    }
  } catch {
    return null
  }

  return null
}

const toDataUrl = (value: string, mime = 'image/png') => {
  if (!value) return ''
  if (value.startsWith('data:image/')) return value
  return `data:${mime};base64,${value}`
}

const parseImageUrlFromText = (text: string): string | null => {
  const markdownMatch = text.match(/!\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/i)
  if (markdownMatch?.[1]) return markdownMatch[1]

  const directUrlMatch = text.match(/https?:\/\/[^\s)]+/i)
  if (directUrlMatch?.[0]) return directUrlMatch[0]

  return null
}

const parseImageResult = (payload: unknown): string | null => {
  if (!payload || typeof payload !== 'object') return null

  const directData = (payload as { data?: unknown }).data
  if (Array.isArray(directData) && directData.length > 0) {
    const first = directData[0] as { url?: unknown; b64_json?: unknown; mime_type?: unknown } | undefined
    if (first) {
      if (typeof first.url === 'string' && first.url.trim()) return first.url.trim()
      if (typeof first.b64_json === 'string' && first.b64_json.trim()) {
        const mime = typeof first.mime_type === 'string' ? first.mime_type : 'image/png'
        return toDataUrl(first.b64_json.trim(), mime)
      }
    }
  }

  const choices = (payload as { choices?: Array<{ message?: { content?: unknown; images?: unknown } }> }).choices
  const message = choices?.[0]?.message

  const messageImages = message?.images
  if (Array.isArray(messageImages) && messageImages.length > 0) {
    const first = messageImages[0] as
      | { image_url?: unknown; url?: unknown; b64_json?: unknown; mime_type?: unknown }
      | undefined
    if (first) {
      if (typeof first.image_url === 'string' && first.image_url.trim()) return first.image_url.trim()
      if (first.image_url && typeof first.image_url === 'object') {
        const nestedUrl = (first.image_url as { url?: unknown }).url
        if (typeof nestedUrl === 'string' && nestedUrl.trim()) return nestedUrl.trim()
      }
      if (typeof first.url === 'string' && first.url.trim()) return first.url.trim()
      if (typeof first.b64_json === 'string' && first.b64_json.trim()) {
        const mime = typeof first.mime_type === 'string' ? first.mime_type : 'image/png'
        return toDataUrl(first.b64_json.trim(), mime)
      }
    }
  }

  const content = message?.content
  if (typeof content === 'string' && content.trim()) {
    const parsedFromText = parseImageUrlFromText(content)
    if (parsedFromText) return parsedFromText

    const parsedJson = parseJsonFromText(content)
    const imageUrl = parsedJson?.image_url
    if (typeof imageUrl === 'string' && imageUrl.trim()) return imageUrl.trim()
    const imageData = parsedJson?.b64_json
    if (typeof imageData === 'string' && imageData.trim()) return toDataUrl(imageData.trim())
  }

  if (Array.isArray(content)) {
    for (let index = 0; index < content.length; index += 1) {
      const item = content[index] as
        | { type?: unknown; text?: unknown; image_url?: unknown; b64_json?: unknown; mime_type?: unknown }
        | undefined
      if (!item) continue

      if (typeof item.image_url === 'string' && item.image_url.trim()) {
        return item.image_url.trim()
      }

      if (item.image_url && typeof item.image_url === 'object') {
        const nestedUrl = (item.image_url as { url?: unknown }).url
        if (typeof nestedUrl === 'string' && nestedUrl.trim()) {
          return nestedUrl.trim()
        }
      }

      if (typeof item.b64_json === 'string' && item.b64_json.trim()) {
        const mime = typeof item.mime_type === 'string' ? item.mime_type : 'image/png'
        return toDataUrl(item.b64_json.trim(), mime)
      }

      if (typeof item.text === 'string' && item.text.trim()) {
        const urlInText = parseImageUrlFromText(item.text)
        if (urlInText) return urlInText
      }
    }
  }

  return null
}

const compactErrorDetail = (raw: string): string => {
  const text = raw.trim()
  if (!text) return ''

  const parsed = parseJsonFromText(text)
  const parsedError = parsed?.error
  if (typeof parsedError === 'string' && parsedError.trim()) return parsedError.trim()
  if (parsedError && typeof parsedError === 'object') {
    const message = (parsedError as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) return message.trim()
  }

  if (text.length <= 180) return text
  return `${text.slice(0, 177)}...`
}

const buildReconstructErrorMessage = (isZh: boolean, failure: ReconstructFailure): string => {
  const status = failure.status
  const endpoint = failure.endpoint || '/api/openrouter'
  const detail = failure.detail || ''

  if (status === 404) {
    return isZh
      ? `做图接口 404：${endpoint} 不可用。请确认线上部署包含 Functions（/api/openrouter）或配置 VITE_CHATAP 直连 OpenRouter。`
      : `Image endpoint 404: ${endpoint} is missing. Deploy /api/openrouter functions or set VITE_CHATAP for direct OpenRouter mode.`
  }

  if (status === 403) {
    return isZh
      ? `做图接口 403：OpenRouter 鉴权被拒绝。请检查 API key、域名白名单与代理密钥配置。${detail ? ` 详情：${detail}` : ''}`
      : `Image endpoint 403: OpenRouter authorization was rejected. Check API key, domain allowlist, and proxy secret.${detail ? ` Detail: ${detail}` : ''}`
  }

  if (status === 400) {
    return isZh
      ? `做图接口 400：请求参数或模型不可用。请更换模型或检查代理参数。${detail ? ` 详情：${detail}` : ''}`
      : `Image endpoint 400: request payload or model is invalid. Try another model or inspect proxy payload.${detail ? ` Detail: ${detail}` : ''}`
  }

  if (status === 405) {
    return isZh
      ? `做图接口 405：${endpoint} 不接受 POST。通常是 Functions 路由未生效或部署平台路径不匹配。请优先检查 /api/openrouter 的函数部署与路由映射。${detail ? ` 详情：${detail}` : ''}`
      : `Image endpoint 405: ${endpoint} does not accept POST. This usually means Functions routing is not active or deployment paths are mismatched. Check /api/openrouter deployment and route mapping first.${detail ? ` Detail: ${detail}` : ''}`
  }

  if (status === 0) {
    return isZh
      ? `做图请求超时或网络中断。请稍后重试。${detail ? ` 详情：${detail}` : ''}`
      : `Image request timed out or network failed. Please retry.${detail ? ` Detail: ${detail}` : ''}`
  }

  return isZh
    ? `做图失败（${status ?? 'unknown'}）。${detail ? `详情：${detail}` : '请检查网络、模型可用性与 /api/openrouter 配置。'}`
    : `Image generation failed (${status ?? 'unknown'}). ${detail || 'Check network, model availability, and /api/openrouter configuration.'}`
}

const buildMemoryGraphSrcDoc = (isZh: boolean) => {
  const styleOverride = `
<style id="memory-graph-shell-override">
  html, body {
    height: 100%;
    overflow: hidden;
    background: #070c12;
  }
  body {
    font-family: "Avenir Next", "PingFang SC", "Microsoft YaHei", sans-serif;
  }
  header, aside, footer {
    background: #0d1622;
  }
  .title h1 {
    font-size: 15px;
    letter-spacing: .02em;
  }
  .title p {
    font-size: 11px;
  }
</style>`

  const patchScript = `
<script>
  (() => {
    document.documentElement.setAttribute('data-theme', 'dark')
    const themeBtn = document.getElementById('themeBtn')
    if (themeBtn) themeBtn.style.display = 'none'

    if (!${isZh ? 'true' : 'false'}) {
      const title = document.querySelector('.title h1')
      if (title) title.textContent = 'Memory Connectome'

      const subtitle = document.querySelector('.title p')
      if (subtitle) {
        subtitle.textContent = 'Circle = region · Diamond = function/cell · Edge = extracted relation · Arrow = directed · Dashed = weakened'
      }

      const panelEmpty = document.querySelector('.panel-empty')
      if (panelEmpty) {
        panelEmpty.innerHTML = 'Select a node<br>to inspect evidence and links'
      }
    }
  })()
</script>`

  return `${rawMemoryGraphHtml}\n${styleOverride}\n${patchScript}`
}

const buildRoundPrompt = (input: {
  isZh: boolean
  round: 1 | 2
  observation: string
  previousPrompt?: string
}) => {
  if (input.isZh) {
    if (input.round === 1) {
      return [
        '请根据下面的记忆描述，重建一张带有旧照片质感的图像。',
        '要求：保留主体与空间关系，允许轻微模糊和记忆偏差。',
        `记忆描述：${input.observation}`,
      ].join('\n')
    }

    return [
      '这是第二轮记忆重建。请在第一轮基础上进一步产生“偏移感”。',
      '要求：保留核心主题，但细节可出现替换、缺失或错误连接。',
      input.previousPrompt ? `第一轮描述：${input.previousPrompt}` : '',
      `第二轮偏移描述：${input.observation}`,
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (input.round === 1) {
    return [
      'Reconstruct one memory image from this observation in an old-photograph style.',
      'Keep the main subject and spatial layout, but allow slight blur and recall drift.',
      `Observation: ${input.observation}`,
    ].join('\n')
  }

  return [
    'This is second-pass memory reconstruction.',
    'Keep the core scene but increase drift: swapped details, omissions, and subtle misbindings are welcome.',
    input.previousPrompt ? `Round-1 observation: ${input.previousPrompt}` : '',
    `Round-2 drift note: ${input.observation}`,
  ]
    .filter(Boolean)
    .join('\n')
}

const requestReconstructedImage = async (input: {
  config: ChatapConfig
  models: string[]
  prompt: string
  signal: AbortSignal
  isZh: boolean
}): Promise<ReconstructResult> => {
  const { config, models, prompt, signal, isZh } = input
  const headers = buildOpenRouterHeaders(config)
  let lastFailure: ReconstructFailure | null = null
  const preferredEndpoint = config.endpoint

  const failurePriority = (status?: number) => {
    if (status === 400) return 8
    if (status === 403) return 7
    if (status === 405) return 6
    if (status === 404) return 5
    if (status === 422) return 4
    if (status === 0) return 3
    if (typeof status === 'number') return 2
    return 1
  }

  const rememberFailure = (failure: ReconstructFailure) => {
    if (!lastFailure) {
      lastFailure = failure
      return
    }

    const currentIsPreferred = lastFailure.endpoint === preferredEndpoint
    const nextIsPreferred = failure.endpoint === preferredEndpoint

    if (nextIsPreferred && !currentIsPreferred) {
      lastFailure = failure
      return
    }
    if (!nextIsPreferred && currentIsPreferred) {
      return
    }

    if (failurePriority(failure.status) >= failurePriority(lastFailure.status)) {
      lastFailure = failure
    }
  }

  const proxyEndpoints =
    config.mode === 'proxy-endpoint'
      ? buildProxyEndpointCandidates(config.endpoint)
      : [config.endpoint]

  for (let index = 0; index < models.length; index += 1) {
    const model = (models[index] || '').trim()
    if (!model) continue

    const imageEndpoints =
      config.mode === 'direct-openrouter'
        ? ['https://openrouter.ai/api/v1/images/generations']
        : proxyEndpoints

    for (let endpointIndex = 0; endpointIndex < imageEndpoints.length; endpointIndex += 1) {
      const imageEndpoint = imageEndpoints[endpointIndex] || config.endpoint
      const imageBody =
        config.mode === 'direct-openrouter'
          ? {
              model,
              prompt,
              size: '1024x1024',
              n: 1,
              response_format: 'b64_json',
            }
          : {
              kind: 'image',
              model,
              prompt,
              size: '1024x1024',
              n: 1,
              response_format: 'b64_json',
              siteUrl: config.siteUrl,
              title: config.title,
            }

      try {
        const imageResponse = await fetch(imageEndpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(imageBody),
          signal,
        })

        if (imageResponse.ok) {
          const imagePayload = await imageResponse.json()
          const imageUrl = parseImageResult(imagePayload)
          if (imageUrl) {
            return { ok: true, imageUrl, model }
          }
        } else {
          const text = await imageResponse.text()
          rememberFailure({
            ok: false,
            status: imageResponse.status,
            detail: compactErrorDetail(text),
            endpoint: imageEndpoint,
          })

          if (config.mode === 'proxy-endpoint' && imageResponse.status !== 404) {
            break
          }
        }

        if (imageResponse.ok) {
          rememberFailure({
            ok: false,
            status: 422,
            detail: 'Image response did not contain a usable image payload.',
            endpoint: imageEndpoint,
          })
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          rememberFailure({
            ok: false,
            status: 0,
            detail: 'Request timeout',
            endpoint: imageEndpoint,
          })
        }
        // continue to chat fallback for the same model.
      }
    }

    // Strategy B: chat completion with image modality fallback.
    const fallbackPrompt = isZh
      ? `${prompt}\n\n请直接输出一张图像，不要解释文字。`
      : `${prompt}\n\nOutput an image directly with no explanation.`

    const chatBody = {
      model,
      messages: [
        {
          role: 'user',
          content: [{ type: 'text', text: fallbackPrompt }],
        },
      ],
      temperature: 0.65,
      siteUrl: config.siteUrl,
      title: config.title,
      modalities: ['image', 'text'],
    }

    const chatEndpoints =
      config.mode === 'proxy-endpoint'
        ? proxyEndpoints
        : [config.endpoint]

    for (let endpointIndex = 0; endpointIndex < chatEndpoints.length; endpointIndex += 1) {
      const chatEndpoint = chatEndpoints[endpointIndex] || config.endpoint
      try {
        const chatResponse = await fetch(chatEndpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(chatBody),
          signal,
        })

        if (!chatResponse.ok) {
          const text = await chatResponse.text()
          rememberFailure({
            ok: false,
            status: chatResponse.status,
            detail: compactErrorDetail(text),
            endpoint: chatEndpoint,
          })

          if (config.mode === 'proxy-endpoint' && chatResponse.status !== 404) {
            break
          }
          continue
        }

        const chatPayload = await chatResponse.json()
        const fallbackImageUrl = parseImageResult(chatPayload)
        if (fallbackImageUrl) {
          return { ok: true, imageUrl: fallbackImageUrl, model }
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          rememberFailure({
            ok: false,
            status: 0,
            detail: 'Request timeout',
            endpoint: chatEndpoint,
          })
        }
        // try next endpoint or model
      }
    }
  }

  return lastFailure || { ok: false }
}

type Stage = 'ready' | 'observe' | 'round-1' | 'round-2' | 'complete'

export const HippocampusScene = () => {
  const language = useUiLanguageStore((state) => state.language)
  const isZh = language === 'zh'

  const recordInteraction = useNeuroTripStore((state) => state.recordInteraction)

  const [stage, setStage] = useState<Stage>('ready')
  const [memoryCardIndex, setMemoryCardIndex] = useState(0)
  const [observeEndsAt, setObserveEndsAt] = useState<number | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(12)

  const [roundOneDescription, setRoundOneDescription] = useState('')
  const [roundTwoDescription, setRoundTwoDescription] = useState('')

  const [roundOneImage, setRoundOneImage] = useState<string | null>(null)
  const [roundTwoImage, setRoundTwoImage] = useState<string | null>(null)
  const [roundOneModel, setRoundOneModel] = useState('')
  const [roundTwoModel, setRoundTwoModel] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  const graphSrcDoc = useMemo(() => buildMemoryGraphSrcDoc(isZh), [isZh])
  const currentMemoryCard = INIT_MEMORY_CARDS[memoryCardIndex] ?? DEFAULT_MEMORY_CARD

  const openRouterConfig = useMemo(() => {
    const env = import.meta.env as Record<string, string | undefined>
    const scopedWindow = window as typeof window & { CHATAP?: string; __CHATAP__?: string }
    const chatap = (env.VITE_CHATAP || scopedWindow.CHATAP || scopedWindow.__CHATAP__ || '').trim()

    return resolveChatapConfig({
      chatap,
      model: (env.VITE_HIPPOCAMPUS_IMAGE_MODEL || env.VITE_CHATAP_MODEL || '').trim(),
      fallbackModel: (env.VITE_HIPPOCAMPUS_IMAGE_MODEL_FALLBACK || env.VITE_CHATAP_MODEL_FALLBACK || '').trim(),
      siteUrl: (env.VITE_CHATAP_SITE_URL || window.location.origin).trim(),
      title: (env.VITE_CHATAP_TITLE || 'FutureGate-Hippocampus').trim(),
    })
  }, [])

  const modelCandidates = useMemo(() => {
    const env = import.meta.env as Record<string, string | undefined>
    return pickImageModels(
      (env.VITE_HIPPOCAMPUS_IMAGE_MODEL || env.VITE_CHATAP_MODEL || '').trim(),
      (env.VITE_HIPPOCAMPUS_IMAGE_MODEL_FALLBACK || env.VITE_CHATAP_MODEL_FALLBACK || '').trim(),
    )
  }, [])

  useEffect(() => {
    if (stage !== 'observe' || !observeEndsAt) return

    const syncCountdown = () => {
      const msLeft = observeEndsAt - Date.now()
      if (msLeft <= 0) {
        setSecondsLeft(0)
        setStage('round-1')
        setObserveEndsAt(null)
        return
      }
      setSecondsLeft(Math.max(1, Math.ceil(msLeft / 1000)))
    }

    syncCountdown()
    const tick = window.setInterval(syncCountdown, 180)
    const endTimer = window.setTimeout(() => {
      setSecondsLeft(0)
      setStage('round-1')
      setObserveEndsAt(null)
    }, Math.max(0, observeEndsAt - Date.now()))

    return () => {
      window.clearInterval(tick)
      window.clearTimeout(endTimer)
    }
  }, [observeEndsAt, stage])

  const resetCurrentFlow = (nextStage: Stage = 'ready') => {
    setObserveEndsAt(null)
    setSecondsLeft(12)
    setRoundOneDescription('')
    setRoundTwoDescription('')
    setRoundOneImage(null)
    setRoundTwoImage(null)
    setRoundOneModel('')
    setRoundTwoModel('')
    setErrorMessage('')
    setStage(nextStage)
  }

  const retryCurrentImage = () => {
    if (isGenerating) return
    resetCurrentFlow('ready')
    recordInteraction({
      type: 'click',
      scene: '/scene/hippocampus',
      target: 'retry-current-source',
      timestamp: Date.now(),
    })
  }

  const skipToNextImage = () => {
    if (isGenerating) return
    setMemoryCardIndex((index) => (index + 1) % INIT_MEMORY_CARDS.length)
    resetCurrentFlow('ready')
    recordInteraction({
      type: 'click',
      scene: '/scene/hippocampus',
      target: 'skip-next-source',
      timestamp: Date.now(),
    })
  }

  const startObservation = () => {
    const endsAt = Date.now() + OBSERVE_DURATION_MS
    resetCurrentFlow('observe')
    setObserveEndsAt(endsAt)

    recordInteraction({
      type: 'click',
      scene: '/scene/hippocampus',
      target: 'start-observe-memory',
      timestamp: Date.now(),
    })
  }

  const generateRoundOne = async () => {
    const trimmed = roundOneDescription.trim()
    if (!trimmed || !openRouterConfig) return

    setIsGenerating(true)
    setErrorMessage('')

    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 65_000)

    try {
      const prompt = buildRoundPrompt({
        isZh,
        round: 1,
        observation: trimmed,
      })
      const result = await requestReconstructedImage({
        config: openRouterConfig,
        models: modelCandidates,
        prompt,
        signal: controller.signal,
        isZh,
      })

      if (!result.ok) {
        setErrorMessage(buildReconstructErrorMessage(isZh, result))
        return
      }

      setRoundOneImage(result.imageUrl)
      setRoundOneModel(result.model)
      setStage('round-2')

      recordInteraction({
        type: 'memory-reconstruct',
        scene: '/scene/hippocampus',
        timestamp: Date.now(),
        target: 'round-1-generate',
      })
    } finally {
      window.clearTimeout(timeout)
      setIsGenerating(false)
    }
  }

  const generateRoundTwo = async () => {
    const trimmed = roundTwoDescription.trim()
    if (!trimmed || !openRouterConfig) return

    setIsGenerating(true)
    setErrorMessage('')

    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 65_000)

    try {
      const prompt = buildRoundPrompt({
        isZh,
        round: 2,
        observation: trimmed,
        previousPrompt: roundOneDescription,
      })
      const result = await requestReconstructedImage({
        config: openRouterConfig,
        models: modelCandidates,
        prompt,
        signal: controller.signal,
        isZh,
      })

      if (!result.ok) {
        setErrorMessage(buildReconstructErrorMessage(isZh, result))
        return
      }

      setRoundTwoImage(result.imageUrl)
      setRoundTwoModel(result.model)
      setStage('complete')

      recordInteraction({
        type: 'memory-reconstruct',
        scene: '/scene/hippocampus',
        timestamp: Date.now(),
        target: 'round-2-generate',
      })
    } finally {
      window.clearTimeout(timeout)
      setIsGenerating(false)
    }
  }

  const canGenerateRoundOne = stage === 'round-1' && roundOneDescription.trim().length >= 8 && !isGenerating && !!openRouterConfig
  const canGenerateRoundTwo = stage === 'round-2' && roundTwoDescription.trim().length >= 8 && !isGenerating && !!openRouterConfig
  const stageLabel =
    stage === 'ready'
      ? isZh
        ? '准备观察'
        : 'Ready'
      : stage === 'observe'
        ? isZh
          ? '观察中'
          : 'Observing'
        : stage === 'round-1'
          ? isZh
            ? '第一轮重建'
            : 'Round 1'
          : stage === 'round-2'
            ? isZh
              ? '第二轮重建'
              : 'Round 2'
            : isZh
              ? '完成对照'
              : 'Final Compare'

  return (
    <SceneFrame
      title={isZh ? '记忆、回忆与遗忘' : 'Memory, Recall, and Forgetting'}
      subtitle={
        isZh
          ? '记忆会在回忆中重写。先看 12 秒，再用语言重建，并让误差逐轮累积。'
          : 'Memory rewrites itself during recall: 12 seconds of viewing, then language-led reconstruction with accumulating drift.'
      }
      regionId="hippocampus"
      previousPath="/scene/amygdala"
      nextPath="/scene/default-mode-network"
    >
      <div className="hippo-rebuild-layout">
        <section className="hippo-upper-stage" aria-label={isZh ? '记忆重建流程' : 'Memory reconstruction flow'}>
          <div className="hippo-stage-head">
            <p className="hippo-stage-label">{isZh ? '当前阶段' : 'Current stage'}: {stageLabel}</p>
            <p className="prototype-note">
              {openRouterConfig
                ? isZh
                  ? 'OpenRouter 已连接'
                  : 'OpenRouter connected'
                : isZh
                  ? 'OpenRouter 未配置'
                  : 'OpenRouter not configured'}
            </p>
          </div>

          {stage === 'observe' ? (
            <section className="hippo-observe-focus" aria-label={isZh ? '12秒观察窗口' : '12-second observation window'}>
              <p className="hippo-source-name hippo-source-name-focus">
                {isZh ? '当前图片：' : 'Current source: '}
                {currentMemoryCard.fileName}
              </p>
              <div className="hippo-observe-focus-frame">
                <img src={currentMemoryCard.src} alt={isZh ? `原始记忆图像 ${currentMemoryCard.fileName}` : `Original memory image ${currentMemoryCard.fileName}`} />
                <span className="hippo-countdown">{isZh ? `剩余 ${secondsLeft}s` : `${secondsLeft}s left`}</span>
              </div>
            </section>
          ) : (
            <div className="hippo-stage-grid">
              <article className="hippo-card hippo-card-primary">
                <h3>{isZh ? '原始记忆' : 'Original Memory'}</h3>
                <p className="hippo-source-name">
                  {isZh ? '当前图片：' : 'Current source: '}
                  {currentMemoryCard.fileName}
                </p>
                <div className="hippo-source-actions">
                  <button type="button" className="ghost-button" onClick={retryCurrentImage} disabled={isGenerating}>
                    {isZh ? '重试当前图' : 'Retry current image'}
                  </button>
                  <button type="button" className="ghost-button" onClick={skipToNextImage} disabled={isGenerating}>
                    {isZh ? '跳过换一张' : 'Skip to next image'}
                  </button>
                </div>
                {stage === 'ready' ? (
                  <div className="hippo-callout">
                    <p>
                      {isZh
                        ? '点击下方按钮后，你将只看到原图 12 秒。时间结束后，图像会自动消失。'
                        : 'After starting, you only get 12 seconds to view the source image. It disappears automatically.'}
                    </p>
                    <button type="button" className="trip-button" onClick={startObservation}>
                      {isZh ? '开始 12 秒观察' : 'Start 12-second viewing'}
                    </button>
                  </div>
                ) : (
                  <div className="hippo-hidden-memory">
                    <p>{isZh ? '图像已消失，请凭记忆描述。' : 'Image removed. Describe from memory.'}</p>
                  </div>
                )}
              </article>

              <article className="hippo-card">
                <h3>{isZh ? '重建控制台' : 'Reconstruction Console'}</h3>

                {stage === 'round-1' ? (
                  <div className="hippo-form-block">
                    <label htmlFor="hippo-round-one">
                      {isZh ? '第一轮：描述你记得的画面' : 'Round 1: Describe what you remember'}
                    </label>
                    <textarea
                      id="hippo-round-one"
                      value={roundOneDescription}
                      onChange={(event) => setRoundOneDescription(event.target.value)}
                      placeholder={
                        isZh
                          ? '例如：黄昏街角，一辆旧巴士停在湿润路面旁，远处窗灯偏暖。'
                          : 'Example: A dusk street corner, an old bus by wet pavement, warm windows in the distance.'
                      }
                      disabled={isGenerating}
                    />
                    <button type="button" className="ghost-button" onClick={generateRoundOne} disabled={!canGenerateRoundOne}>
                      {isGenerating && stage === 'round-1'
                        ? isZh
                          ? '第一轮生成中...'
                          : 'Generating round 1...'
                        : isZh
                          ? 'OpenRouter 第一轮重建'
                          : 'OpenRouter round 1'}
                    </button>
                  </div>
                ) : null}

                {roundOneImage ? (
                  <div className="hippo-generated-block">
                    <p className="hippo-generated-title">{isZh ? '第一轮结果' : 'Round-1 result'}</p>
                    <img src={roundOneImage} alt={isZh ? '第一轮重建图' : 'Round-1 reconstructed image'} />
                    <p className="prototype-note">Model: {roundOneModel}</p>
                  </div>
                ) : null}

                {stage === 'round-2' ? (
                  <div className="hippo-form-block">
                    <label htmlFor="hippo-round-two">
                      {isZh
                        ? '第二轮：描述偏移或误差（缺失、替换、错位）'
                        : 'Round 2: Describe drift (missing/swapped/misaligned details)'}
                    </label>
                    <textarea
                      id="hippo-round-two"
                      value={roundTwoDescription}
                      onChange={(event) => setRoundTwoDescription(event.target.value)}
                      placeholder={
                        isZh
                          ? '例如：巴士颜色被记成蓝色，路牌文字模糊，窗户数量变少。'
                          : 'Example: bus color shifts to blue, road sign text blurs, fewer windows remain.'
                      }
                      disabled={isGenerating}
                    />
                    <button type="button" className="ghost-button" onClick={generateRoundTwo} disabled={!canGenerateRoundTwo}>
                      {isGenerating && stage === 'round-2'
                        ? isZh
                          ? '第二轮生成中...'
                          : 'Generating round 2...'
                        : isZh
                          ? 'OpenRouter 第二轮重建'
                          : 'OpenRouter round 2'}
                    </button>
                  </div>
                ) : null}

                {errorMessage ? <p className="warning-note">{errorMessage}</p> : null}
              </article>
            </div>
          )}

          {stage === 'complete' && roundTwoImage ? (
            <section className="hippo-final-compare" aria-label={isZh ? '原图与最终重建对照' : 'Original vs final comparison'}>
              <h3>{isZh ? '原图 vs 最终记忆版' : 'Original vs final memory version'}</h3>
              <div className="hippo-compare-grid">
                <figure>
                  <img src={currentMemoryCard.src} alt={isZh ? `原始图像 ${currentMemoryCard.fileName}` : `Original image ${currentMemoryCard.fileName}`} />
                  <figcaption>{isZh ? `原始图像 · ${currentMemoryCard.fileName}` : `Original · ${currentMemoryCard.fileName}`}</figcaption>
                </figure>
                <figure>
                  <img src={roundTwoImage} alt={isZh ? '第二轮重建图像' : 'Second-round reconstruction'} />
                  <figcaption>{isZh ? '第二轮重建（偏移后）' : 'Round-2 reconstructed (drifted)'}</figcaption>
                </figure>
              </div>
              <p className="prototype-note">Model: {roundTwoModel}</p>
            </section>
          ) : null}
        </section>

        <section className="hippo-graph-stage" aria-label={isZh ? '记忆功能连接图谱' : 'Memory connectome graph'}>
          <iframe
            className="hippo-graph-frame"
            title={isZh ? '记忆功能连接图谱' : 'Memory connectome graph'}
            srcDoc={graphSrcDoc}
            loading="eager"
            sandbox="allow-scripts"
            referrerPolicy="no-referrer"
          />
        </section>
      </div>
    </SceneFrame>
  )
}
