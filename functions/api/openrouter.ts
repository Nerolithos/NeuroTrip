type Env = {
  neurotrip?: string
  NEUROTRIP?: string
}

type ChatBody = {
  kind?: 'chat' | 'image'
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

const buildError = (status: number, message: string) => {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: JSON_HEADERS,
  })
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const secret = (env.neurotrip || env.NEUROTRIP || '').trim()
  if (!secret) {
    return buildError(500, 'Missing Cloudflare Pages secret: neurotrip')
  }

  let payload: ChatBody | null = null
  try {
    payload = (await request.json()) as ChatBody
  } catch {
    return buildError(400, 'Invalid JSON body')
  }

  const kind = payload?.kind === 'image' ? 'image' : 'chat'
  const model = (payload?.model || '').trim()
  if (!model) {
    return buildError(400, 'model is required')
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
    kind === 'image'
      ? 'https://openrouter.ai/api/v1/images/generations'
      : 'https://openrouter.ai/api/v1/chat/completions'

  const upstreamPayload =
    kind === 'image'
      ? {
          model,
          prompt,
          size: typeof payload?.size === 'string' && payload.size.trim() ? payload.size : '1024x1024',
          n: typeof payload?.n === 'number' ? payload.n : 1,
          response_format:
            typeof payload?.response_format === 'string' && payload.response_format.trim()
              ? payload.response_format
              : 'b64_json',
        }
      : {
          ...payload,
          kind: undefined,
          model,
          messages,
          temperature: typeof payload?.temperature === 'number' ? payload.temperature : 0,
        }

  const upstream = await fetch(upstreamEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secret}`,
      'HTTP-Referer': siteUrl,
      'X-Title': title,
    },
    body: JSON.stringify(upstreamPayload),
  })

  const text = await upstream.text()
  return new Response(text, {
    status: upstream.status,
    headers: JSON_HEADERS,
  })
}
