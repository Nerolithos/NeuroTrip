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

export type RealityCardMatchResult = {
  score: number
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

const buildSingleCardPrompt = (input: {
  label: string
  isZh: boolean
  card: RealityImageCard
}) => {
  const cardText = `${input.card.label}; tags=${input.card.tags.join('|')}; desc=${input.card.description}`

  if (!input.isZh) {
    return [
      'You are a language-association evaluator for one image.',
      'Score only how strongly the user label semantically associates with this image concept.',
      'Use a fast 3-lens check: literal meaning, cultural symbolism, and metaphorical/idiomatic association.',
      'Do not collapse to strict literalism; if a stable cultural or metaphorical link exists, do not assign 0.',
      'Return strict minified JSON only: {"score":0.00,"reason":"..."}.',
      'reason must be 2-3 short sentences focused on lexical/semantic association paths.',
      'Do not mention percentages, confidence, or phrases like "so I think".',
      `User label: ${input.label}`,
      `Image concept hint: ${cardText}`,
    ].join(' ')
  }

  return [
    '你是单图语言联想评估器。',
    '只评估“标签词”与这张图概念之间的语义联想强度，不要写视觉审美判断。',
    '请快速做三路判断：字面义、文化象征、隐喻/习语联想。',
    '不要过度字面化；若存在稳定的文化或隐喻关联，不得直接判为 0。',
    '仅返回最小化 JSON：{"score":0.00,"reason":"..."}。',
    'reason 必须是 2 到 3 句短句，说明语义场/语词联想路径。',
    '禁止出现百分比、置信度、以及“所以我认为”之类措辞。',
    `用户标签：${input.label}`,
    `图像概念提示：${cardText}`,
  ].join(' ')
}

const toDataUrl = async (imageUrl: string): Promise<string | null> => {
  try {
    const response = await fetch(imageUrl)
    if (!response.ok) return null

    const blob = await response.blob()
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader()
      reader.onload = () => {
        resolve(typeof reader.result === 'string' ? reader.result : null)
      }
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

const parseSingleScore = (payload: unknown, card: RealityImageCard): number | null => {
  if (!payload || typeof payload !== 'object') return null

  const directScore = (payload as { score?: unknown }).score
  if (typeof directScore === 'number') return clamp01(directScore)
  if (typeof directScore === 'string') {
    const value = Number.parseFloat(directScore)
    if (Number.isFinite(value)) return clamp01(value)
  }

  const directScores = (payload as { scores?: unknown }).scores
  if (directScores && typeof directScores === 'object') {
    const raw = (directScores as Record<string, unknown>)[card.id]
    if (typeof raw === 'number') return clamp01(raw)
    if (typeof raw === 'string') {
      const value = Number.parseFloat(raw)
      if (Number.isFinite(value)) return clamp01(value)
    }
  }

  const choices = (payload as { choices?: Array<{ message?: { content?: unknown } }> }).choices
  const content = choices?.[0]?.message?.content
  if (typeof content !== 'string' || !content.trim()) return null

  const parsed = parseJsonFromText(content)
  const parsedScore = parsed?.score
  if (typeof parsedScore === 'number') return clamp01(parsedScore)
  if (typeof parsedScore === 'string') {
    const value = Number.parseFloat(parsedScore)
    if (Number.isFinite(value)) return clamp01(value)
  }

  const parsedScores = parsed?.scores
  if (parsedScores && typeof parsedScores === 'object') {
    const raw = (parsedScores as Record<string, unknown>)[card.id]
    if (typeof raw === 'number') return clamp01(raw)
    if (typeof raw === 'string') {
      const value = Number.parseFloat(raw)
      if (Number.isFinite(value)) return clamp01(value)
    }
  }

  return null
}

export const requestRealityCardMatch = async (input: {
  config: ChatapConfig
  label: string
  card: RealityImageCard
  isZh: boolean
}): Promise<RealityCardMatchResult | null> => {
  const { config, label, card, isZh } = input
  const trimmed = label.trim()
  if (!trimmed) return null

  const prompt = buildSingleCardPrompt({ label: trimmed, isZh, card })
  const imageDataUrl = await toDataUrl(card.imageUrl)
  const imagePayload = imageDataUrl || card.imageUrl

  for (let index = 0; index < config.models.length; index += 1) {
    const model = config.models[index]
    if (!model) continue

    const messages: ChatMessage[] = [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: imagePayload } },
        ],
      },
    ]

    const body = JSON.stringify({
      model,
      messages,
      temperature: 0.2,
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
      const score = parseSingleScore(payload, card)
      if (score == null) continue

      return {
        score,
        reason: parseReason(payload),
        model,
      }
    } catch {
      // try next model candidate
    }
  }

  return null
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
