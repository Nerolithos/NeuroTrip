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
  siteUrl: string
  title: string
}

const DEFAULT_MODEL = 'nvidia/nemotron-nano-12b-v2-vl:free'
const DEFAULT_FALLBACK_MODEL = 'google/gemma-4-31b-it:free'

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
  siteUrl: string
  title: string
}): ChatapConfig | null => {
  const chatap = input.chatap.trim()
  const models = pickModelCandidates(input.model, input.fallbackModel)

  if (!chatap) {
    return {
      mode: 'proxy-endpoint',
      endpoint: '/api/openrouter',
      models,
      siteUrl: input.siteUrl,
      title: input.title,
    }
  }

  if (chatap.startsWith('http://') || chatap.startsWith('https://')) {
    return {
      mode: 'proxy-endpoint',
      endpoint: chatap,
      models,
      siteUrl: input.siteUrl,
      title: input.title,
    }
  }

  return {
    mode: 'direct-openrouter',
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    secret: chatap,
    models,
    siteUrl: input.siteUrl,
    title: input.title,
  }
}

export const buildEmojiPrompt = (isZh: boolean): string => {
  const base =
    'You are a strict vision validator for expression-to-emoji matching. ' +
    'Return minified JSON only with keys: emoji(string), confidence(0..1), reason(string). ' +
    'Pick exactly one most-likely emoji from this set: 😀 😄 😁 🙂 😐 😕 ☹️ 😢 😭 😠 😮 😲 🤔 😴 😎 🤫 👍 🤞 😛.'

  if (!isZh) {
    return `${base} Do not output any extra text.`
  }

  return `${base} 中文场景优先识别当前表情最像的 emoji，不要输出多余文本。`
}

export const requestEmojiMatch = async (input: {
  config: ChatapConfig
  imageDataUrl: string
  isZh: boolean
}): Promise<string | null> => {
  const { config, imageDataUrl, isZh } = input
  const prompt = buildEmojiPrompt(isZh)

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

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (config.mode === 'direct-openrouter') {
      headers.Authorization = `Bearer ${config.secret || ''}`
      headers['HTTP-Referer'] = config.siteUrl
      headers['X-Title'] = config.title
    }

    const body = JSON.stringify({
      model,
      messages,
      temperature: 0,
      // Proxy mode can ignore or use these fields if forwarding to OpenRouter.
      siteUrl: config.siteUrl,
      title: config.title,
    })

    try {
      const response = await fetch(config.endpoint, {
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
      // try next model candidate
    }
  }

  return null
}
