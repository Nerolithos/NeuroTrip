type Env = {
  imager?: string
  IMAGER?: string
  neurotrip?: string
  NEUROTRIP?: string
}

type ChatBody = {
  kind?: 'chat' | 'image'
  provider?: 'ark' | 'openrouter'
  model?: string
  messages?: unknown
  prompt?: string
  temperature?: number
  size?: string
  n?: number
  response_format?: string
  siteUrl?: string
  title?: string
  [key: string]: unknown
}

const JSON_HEADERS = {
  'Content-Type': 'application/json',
} as const

const firstNonEmpty = (...values: Array<string | undefined>) => {
  for (let index = 0; index < values.length; index += 1) {
    const next = (values[index] || '').trim()
    if (next) return next
  }
  return ''
}

const normalizeApiKey = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) return ''

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim()
  }

  return trimmed
}

const normalizeImageModel = (model: string) => {
  const normalized = model.trim()
  if (!normalized) return normalized

  if (normalized === 'bytedance-seed/seedream-4.5') return 'doubao-seedream-4-5-251128'
  if (normalized === 'bytedance-seed/seedream-4') return 'doubao-seedream-4-5-251128'

  return normalized
}

const ARK_MIN_IMAGE_PIXELS = 3_686_400
const DEFAULT_ARK_IMAGE_SIZE = '2048x2048'

const parseImageSize = (value: string) => {
  const match = value.trim().match(/^(\d+)\s*x\s*(\d+)$/i)
  if (!match) return null

  const width = Number.parseInt(match[1], 10)
  const height = Number.parseInt(match[2], 10)
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null
  }

  return { width, height }
}

const normalizeImageSize = (value: string | undefined, provider: 'ark' | 'openrouter') => {
  const normalized = (value || '').trim()
  if (!normalized) {
    return provider === 'ark' ? DEFAULT_ARK_IMAGE_SIZE : '1024x1024'
  }

  if (provider !== 'ark') return normalized

  const parsed = parseImageSize(normalized)
  if (!parsed) return DEFAULT_ARK_IMAGE_SIZE

  if (parsed.width * parsed.height < ARK_MIN_IMAGE_PIXELS) {
    return DEFAULT_ARK_IMAGE_SIZE
  }

  return `${parsed.width}x${parsed.height}`
}

const isArkModel = (model: string) => {
  return model.startsWith('doubao-') || model.startsWith('seedream-')
}

const buildError = (status: number, message: string) => {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: JSON_HEADERS,
  })
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let payload: ChatBody | null = null
  try {
    payload = (await request.json()) as ChatBody
  } catch {
    return buildError(400, 'Invalid JSON body')
  }

  const kind = payload?.kind === 'image' ? 'image' : 'chat'
  const rawModel = (payload?.model || '').trim()
  const model = kind === 'image' ? normalizeImageModel(rawModel) : rawModel
  if (!model) {
    return buildError(400, 'model is required')
  }

  const requestedProvider =
    payload?.provider === 'ark'
      ? 'ark'
      : payload?.provider === 'openrouter'
        ? 'openrouter'
        : null

  const provider =
    requestedProvider || (kind === 'image' && isArkModel(model) ? 'ark' : 'openrouter')

  const secretRaw =
    kind === 'image'
      ? provider === 'ark'
        ? firstNonEmpty(env.imager, env.IMAGER)
        : firstNonEmpty(env.neurotrip, env.NEUROTRIP)
      : firstNonEmpty(env.neurotrip, env.NEUROTRIP, env.imager, env.IMAGER)

  const secret = normalizeApiKey(secretRaw)

  if (!secret) {
    return kind === 'image'
      ? provider === 'ark'
        ? buildError(500, 'Missing Cloudflare Pages secret: imager')
        : buildError(500, 'Missing Cloudflare Pages secret: neurotrip')
      : buildError(500, 'Missing Cloudflare Pages secret: neurotrip (or imager fallback)')
  }

  const messages = payload?.messages
  const prompt = (payload?.prompt || '').trim()

  if (kind === 'chat' && !Array.isArray(messages)) {
    return buildError(400, 'messages must be an array for chat requests')
  }

  if (kind === 'image' && !prompt) {
    return buildError(400, 'prompt is required for image requests')
  }

  const origin = new URL(request.url).origin
  const siteUrl = (payload?.siteUrl || origin).trim() || origin
  const title = (payload?.title || 'neurotrip').trim() || 'neurotrip'

  const upstreamEndpoint =
    provider === 'ark'
      ? kind === 'image'
        ? 'https://ark.cn-beijing.volces.com/api/v3/images/generations'
        : 'https://ark.cn-beijing.volces.com/api/v3/chat/completions'
      : kind === 'image'
        ? 'https://openrouter.ai/api/v1/images/generations'
        : 'https://openrouter.ai/api/v1/chat/completions'

  const responseFormat =
    typeof payload?.response_format === 'string' && payload.response_format.trim()
      ? payload.response_format.trim()
      : provider === 'ark'
        ? 'url'
        : 'b64_json'

  const upstreamPayload =
    kind === 'image'
      ? {
          model,
          prompt,
          size: normalizeImageSize(typeof payload?.size === 'string' ? payload.size : undefined, provider),
          n: typeof payload?.n === 'number' ? payload.n : 1,
          response_format: responseFormat,
        }
      : {
          ...payload,
          kind: undefined,
          provider: undefined,
          model,
          messages,
          temperature: typeof payload?.temperature === 'number' ? payload.temperature : 0,
        }

  const upstreamHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${secret}`,
  }

  if (provider === 'openrouter') {
    upstreamHeaders['HTTP-Referer'] = siteUrl
    upstreamHeaders['X-Title'] = title
  }

  const upstream = await fetch(upstreamEndpoint, {
    method: 'POST',
    headers: upstreamHeaders,
    body: JSON.stringify(upstreamPayload),
  })

  const text = await upstream.text()
  return new Response(text, {
    status: upstream.status,
    headers: JSON_HEADERS,
  })
}
