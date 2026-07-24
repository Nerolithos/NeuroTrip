export type ChatMessage = {
  role: 'user' | 'system' | 'assistant'
  content: Array<
    | { type: 'text'; text: string }
    | { type: 'image_url'; image_url: { url: string } }
  >
}

export type ChatapMode = 'direct-openrouter' | 'proxy-endpoint'

export type ChatapConfig = {
  mode: ChatapMode
  endpoint: string
  secret?: string
  models: string[]
  reasonModels: string[]
  siteUrl: string
  title: string
}

const DEFAULT_PROXY_ENDPOINT = '/api/openrouter'
const PROXY_ENDPOINT_FALLBACKS = [
  '/functions/api/openrouter',
  '/.netlify/functions/openrouter',
  '/.netlify/functions/api/openrouter',
]

const DEFAULT_MODEL = 'nvidia/nemotron-nano-12b-v2-vl:free'
const DEFAULT_FALLBACK_MODEL = 'google/gemma-4-31b-it:free'

const isAbsoluteHttpUrl = (value: string) => value.startsWith('http://') || value.startsWith('https://')

export const buildProxyEndpointCandidates = (endpoint: string): string[] => {
  const normalized = endpoint.trim() || DEFAULT_PROXY_ENDPOINT
  if (isAbsoluteHttpUrl(normalized)) {
    return [normalized]
  }

  const output: string[] = []
  const insert = (value: string) => {
    const next = value.trim()
    if (!next || output.includes(next)) return
    output.push(next)
  }

  insert(normalized)
  insert(DEFAULT_PROXY_ENDPOINT)
  PROXY_ENDPOINT_FALLBACKS.forEach((item) => insert(item))

  return output
}

export const extractEmojiFromText = (text: string): string | null => {
  if (!text) return null
  const match = text.match(/(\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*)/u)
  return match?.[1] || null
}

const parseJsonFromText = (text: string): Record<string, unknown> | null => {
  if (!text) return null
  try {
    const direct = JSON.parse(text)
    if (direct && typeof direct === 'object') return direct as Record<string, unknown>
  } catch {
    // keep trying fallback slicing
  }

  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start >= 0 && end > start) {
    try {
      const sliced = JSON.parse(text.slice(start, end + 1))
      if (sliced && typeof sliced === 'object') return sliced as Record<string, unknown>
    } catch {
      return null
    }
  }
  return null
}

export const parseEmojiFromChatResponse = (payload: unknown): string | null => {
  if (!payload || typeof payload !== 'object') return null

  const directEmoji = (payload as { emoji?: unknown }).emoji
  if (typeof directEmoji === 'string') {
    return extractEmojiFromText(directEmoji) || null
  }

  const choices = (payload as { choices?: Array<{ message?: { content?: unknown } }> }).choices
  const content = choices?.[0]?.message?.content
  if (typeof content !== 'string' || !content.trim()) return null

  const parsed = parseJsonFromText(content)
  const parsedEmoji = parsed?.emoji
  if (typeof parsedEmoji === 'string') {
    return extractEmojiFromText(parsedEmoji) || null
  }

  return extractEmojiFromText(content)
}

export const parseEmojiReasonFromChatResponse = (payload: unknown): string | null => {
  if (!payload || typeof payload !== 'object') return null

  const directReason = (payload as { reason?: unknown }).reason
  if (typeof directReason === 'string' && directReason.trim()) {
    return directReason.trim()
  }

  const choices = (payload as { choices?: Array<{ message?: { content?: unknown } }> }).choices
  const content = choices?.[0]?.message?.content
  if (typeof content !== 'string' || !content.trim()) return null

  const parsed = parseJsonFromText(content)
  const parsedReason = parsed?.reason
  if (typeof parsedReason === 'string' && parsedReason.trim()) {
    return parsedReason.trim()
  }

  const flattened = content.replace(/[\r\n]+/g, ' ').trim()
  return flattened.length ? flattened : null
}

export const pickModelCandidates = (primary?: string, fallback?: string): string[] => {
  const output: string[] = []
  const insert = (value: string | undefined) => {
    const next = (value || '').trim()
    if (!next || output.includes(next)) return
    output.push(next)
  }

  insert(primary)
  insert(fallback)

  // Always keep resilient built-ins at the end, so env overrides remain first.
  insert(DEFAULT_MODEL)
  insert(DEFAULT_FALLBACK_MODEL)

  return output
}

export const resolveChatapConfig = (input: {
  chatap: string
  model?: string
  fallbackModel?: string
  reasonModel?: string
  reasonFallbackModel?: string
  siteUrl: string
  title: string
}): ChatapConfig | null => {
  const chatap = input.chatap.trim()
  const models = pickModelCandidates(input.model, input.fallbackModel)
  const hasReasonOverride = !!((input.reasonModel || '').trim() || (input.reasonFallbackModel || '').trim())
  const reasonModels = hasReasonOverride
    ? pickModelCandidates(input.reasonModel, input.reasonFallbackModel)
    : [...models]

  if (!chatap) {
    return {
      mode: 'proxy-endpoint',
      endpoint: DEFAULT_PROXY_ENDPOINT,
      models,
      reasonModels,
      siteUrl: input.siteUrl,
      title: input.title,
    }
  }

  if (chatap.startsWith('http://') || chatap.startsWith('https://')) {
    return {
      mode: 'proxy-endpoint',
      endpoint: chatap,
      models,
      reasonModels,
      siteUrl: input.siteUrl,
      title: input.title,
    }
  }

  return {
    mode: 'direct-openrouter',
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    secret: chatap,
    models,
    reasonModels,
    siteUrl: input.siteUrl,
    title: input.title,
  }
}

export const buildEmojiPrompt = (isZh: boolean): string => {
  const base =
    'You are a strict expression-to-emoji classifier. ' +
    'Return minified JSON only with keys: emoji(string), confidence(0..1). ' +
    'Pick exactly one most-likely emoji from this set: 😀 😄 😁 🙂 😐 😕 ☹️ 😢 😭 😠 😮 😲 🤔 😴 😎 🤫 👍 🤞 😛. ' +
    'Do not output any explanation, reason, or extra keys.'

  if (!isZh) {
    return `${base} Output JSON only.`
  }

  return `${base} 中文场景请优先返回最接近当前表情的 emoji，只输出 JSON。`
}

export const buildEmojiReasonPrompt = (input: { isZh: boolean; emojiHint?: string | null }): string => {
  const emojiHint = (input.emojiHint || '').trim()

  if (!input.isZh) {
    return [
      'You are a visual-cognition narrator.',
      'Describe observable facial cues only (mouth corners, brow tension, eyebrow direction, mouth openness, eye focus/opening).',
      emojiHint ? `The current predicted emoji is ${emojiHint}; keep the description consistent with it.` : 'Infer emotion cues directly from the face image.',
      'Return minified JSON only with key reason(string).',
      'The reason must be one concise sentence with fresh phrasing.',
    ].join(' ')
  }

  return [
    '你是视觉认知描述器。',
    '只描述可观察到的面部线索：嘴角、眉弓/额纹、眉毛方向、嘴巴开合、眼神/眼睑状态。',
    emojiHint ? `当前预测 emoji 为 ${emojiHint}，描述应与该表情一致。` : '请根据图像直接判断并描述线索。',
    '仅返回最小化 JSON，键为 reason(string)。',
    'reason 保持一句话、自然、每次用不同措辞。',
  ].join(' ')
}

const buildRequestHeaders = (config: ChatapConfig) => {
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

export const requestEmojiMatch = async (input: {
  config: ChatapConfig
  imageDataUrl: string
  isZh: boolean
}): Promise<string | null> => {
  const { config, imageDataUrl, isZh } = input
  const prompt = buildEmojiPrompt(isZh)
  const endpoints =
    config.mode === 'proxy-endpoint'
      ? buildProxyEndpointCandidates(config.endpoint)
      : [config.endpoint]

  for (let index = 0; index < config.models.length; index += 1) {
    const model = config.models[index]
    const messages: ChatMessage[] = [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: imageDataUrl } },
        ],
      },
    ]

    const headers = buildRequestHeaders(config)

    const body = JSON.stringify({
      model,
      messages,
      temperature: 0,
      // Proxy mode can ignore or use these fields if forwarding to OpenRouter.
      siteUrl: config.siteUrl,
      title: config.title,
    })

    for (let endpointIndex = 0; endpointIndex < endpoints.length; endpointIndex += 1) {
      const endpoint = endpoints[endpointIndex] || config.endpoint
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers,
          body,
        })

        if (!response.ok) {
          continue
        }

        const payload = await response.json()
        const emoji = parseEmojiFromChatResponse(payload)
        if (emoji) {
          return emoji
        }
      } catch {
        // try next endpoint or model candidate
      }
    }
  }

  return null
}

export const requestEmojiReason = async (input: {
  config: ChatapConfig
  imageDataUrl: string
  isZh: boolean
  emojiHint?: string | null
}): Promise<string | null> => {
  const { config, imageDataUrl, isZh, emojiHint } = input
  const prompt = buildEmojiReasonPrompt({ isZh, emojiHint })
  const endpoints =
    config.mode === 'proxy-endpoint'
      ? buildProxyEndpointCandidates(config.endpoint)
      : [config.endpoint]

  for (let index = 0; index < config.reasonModels.length; index += 1) {
    const model = config.reasonModels[index]
    const messages: ChatMessage[] = [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: imageDataUrl } },
        ],
      },
    ]

    const headers = buildRequestHeaders(config)

    const body = JSON.stringify({
      model,
      messages,
      temperature: 0.35,
      siteUrl: config.siteUrl,
      title: config.title,
    })

    for (let endpointIndex = 0; endpointIndex < endpoints.length; endpointIndex += 1) {
      const endpoint = endpoints[endpointIndex] || config.endpoint
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers,
          body,
        })

        if (!response.ok) {
          continue
        }

        const payload = await response.json()
        const reason = parseEmojiReasonFromChatResponse(payload)
        if (reason) {
          return reason
        }
      } catch {
        // try next endpoint or model candidate
      }
    }
  }

  return null
}
