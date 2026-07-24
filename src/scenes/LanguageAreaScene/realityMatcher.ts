import type { ChatapConfig, ChatMessage } from '../FacePipelineScene/emojiMatcher.js'

export type RealityImageCard = {
  id: string
  label: string
  labelZh: string
  imageUrl: string
  tags: string[]
  description: string
}

export type RealityMatchResult = {
  scores: Record<string, number>
  reason: string
  model: string
}

const clamp01 = (value: number) => {
  if (!Number.isFinite(value)) return 0
  if (value < 0) return 0
  if (value > 1) return 1
  return Number(value.toFixed(2))
}

const parseJsonFromText = (text: string): Record<string, unknown> | null => {
  if (!text) return null
  try {
    const direct = JSON.parse(text)
    if (direct && typeof direct === 'object') return direct as Record<string, unknown>
  } catch {
    // continue
  }

  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start < 0 || end <= start) return null

  try {
    const sliced = JSON.parse(text.slice(start, end + 1))
    if (sliced && typeof sliced === 'object') return sliced as Record<string, unknown>
  } catch {
    return null
  }

  return null
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

const buildPrompt = (input: {
  label: string
  isZh: boolean
  cards: RealityImageCard[]
}) => {
  const cardsText = input.cards
    .map((card) => `${card.id}: ${card.label}; tags=${card.tags.join('|')}; desc=${card.description}`)
    .join('\n')

  if (!input.isZh) {
    return [
      'You are a semantic image matcher.',
      'Task: score each image-card against the user label from 0 to 1, where 1 means highly related.',
      'You must score ALL card IDs and return strict minified JSON only.',
      'Output format: {"scores":{"id":0.00},"reason":"one concise sentence"}.',
      'No markdown, no explanation outside JSON.',
      `User label: ${input.label}`,
      `Cards:\n${cardsText}`,
    ].join(' ')
  }

  return [
    '你是语义图片匹配器。',
    '任务：根据用户输入标签，为每个图片卡片打 0 到 1 的相关度分数，1 表示高度相关。',
    '必须给所有 id 打分，并且只返回最小化 JSON。',
    '输出格式：{"scores":{"id":0.00},"reason":"一句简短解释"}。',
    '不要输出 markdown，不要输出 JSON 以外内容。',
    `用户标签：${input.label}`,
    `卡片列表：\n${cardsText}`,
  ].join(' ')
}

const parseScores = (payload: unknown, cards: RealityImageCard[]): Record<string, number> | null => {
  if (!payload || typeof payload !== 'object') return null

  const directScores = (payload as { scores?: unknown }).scores
  if (directScores && typeof directScores === 'object') {
    const output: Record<string, number> = {}
    cards.forEach((card) => {
      const raw = (directScores as Record<string, unknown>)[card.id]
      if (typeof raw === 'number') output[card.id] = clamp01(raw)
    })
    if (Object.keys(output).length) return output
  }

  const choices = (payload as { choices?: Array<{ message?: { content?: unknown } }> }).choices
  const content = choices?.[0]?.message?.content
  if (typeof content !== 'string' || !content.trim()) return null

  const parsed = parseJsonFromText(content)
  const parsedScores = parsed?.scores
  if (!parsedScores || typeof parsedScores !== 'object') return null

  const output: Record<string, number> = {}
  cards.forEach((card) => {
    const raw = (parsedScores as Record<string, unknown>)[card.id]
    if (typeof raw === 'number') {
      output[card.id] = clamp01(raw)
    } else if (typeof raw === 'string') {
      const value = Number.parseFloat(raw)
      if (Number.isFinite(value)) output[card.id] = clamp01(value)
    }
  })

  return Object.keys(output).length ? output : null
}

const parseReason = (payload: unknown): string => {
  if (!payload || typeof payload !== 'object') return ''

  const directReason = (payload as { reason?: unknown }).reason
  if (typeof directReason === 'string' && directReason.trim()) {
    return directReason.trim()
  }

  const choices = (payload as { choices?: Array<{ message?: { content?: unknown } }> }).choices
  const content = choices?.[0]?.message?.content
  if (typeof content !== 'string' || !content.trim()) return ''

  const parsed = parseJsonFromText(content)
  const parsedReason = parsed?.reason
  if (typeof parsedReason === 'string' && parsedReason.trim()) {
    return parsedReason.trim()
  }

  return ''
}

export const requestRealityLabelMatch = async (input: {
  config: ChatapConfig
  label: string
  cards: RealityImageCard[]
  isZh: boolean
}): Promise<RealityMatchResult | null> => {
  const { config, label, cards, isZh } = input
  const trimmed = label.trim()
  if (!trimmed) return null

  const prompt = buildPrompt({ label: trimmed, isZh, cards })

  for (let index = 0; index < config.models.length; index += 1) {
    const model = config.models[index]
    if (!model) continue

    const messages: ChatMessage[] = [
      {
        role: 'user',
        content: [{ type: 'text', text: prompt }],
      },
    ]

    const body = JSON.stringify({
      model,
      messages,
      temperature: 0,
      siteUrl: config.siteUrl,
      title: config.title,
    })

    try {
      const response = await fetch(config.endpoint, {
        method: 'POST',
        headers: buildRequestHeaders(config),
        body,
      })

      if (!response.ok) continue

      const payload = await response.json()
      const scores = parseScores(payload, cards)
      if (!scores) continue

      return {
        scores,
        reason: parseReason(payload),
        model,
      }
    } catch {
      // try next model candidate
    }
  }

  return null
}
