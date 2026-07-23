type Env = {
  neurotrip?: string
  NEUROTRIP?: string
}

type ChatBody = {
  model?: string
  messages?: unknown
  temperature?: number
  siteUrl?: string
  title?: string
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

  const model = (payload?.model || '').trim()
  const messages = payload?.messages
  if (!model || !Array.isArray(messages)) {
    return buildError(400, 'Both model and messages are required')
  }

  const origin = new URL(request.url).origin
  const siteUrl = (payload?.siteUrl || origin).trim() || origin
  const title = (payload?.title || 'neurotrip').trim() || 'neurotrip'

  const upstreamBody = JSON.stringify({
    model,
    messages,
    temperature: typeof payload?.temperature === 'number' ? payload.temperature : 0,
  })

  const upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secret}`,
      'HTTP-Referer': siteUrl,
      'X-Title': title,
    },
    body: upstreamBody,
  })

  const text = await upstream.text()
  return new Response(text, {
    status: upstream.status,
    headers: JSON_HEADERS,
  })
}
