import test from 'node:test'
import assert from 'node:assert/strict'
import { requestRealityCardMatch, requestRealityLabelMatch, type RealityImageCard } from '../../src/scenes/LanguageAreaScene/realityMatcher.js'

const cards: RealityImageCard[] = [
  {
    id: 'c01',
    label: 'fox',
    labelZh: '狐狸',
    imageUrl: 'https://example.com/fox.jpg',
    tags: ['animal', 'wildlife'],
    description: 'fox in grassland',
  },
  {
    id: 'c02',
    label: 'phone',
    labelZh: '手机',
    imageUrl: 'https://example.com/phone.jpg',
    tags: ['tool', 'device'],
    description: 'smartphone close-up',
  },
]

test('requestRealityLabelMatch parses scores JSON content from OpenRouter response', async () => {
  const originalFetch = globalThis.fetch

  globalThis.fetch = (async () => {
    const payload = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              scores: { c01: 0.91, c02: 0.12 },
              reason: 'animal label maps strongly to fox image',
            }),
          },
        },
      ],
    }

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }) as typeof fetch

  const result = await requestRealityLabelMatch({
    config: {
      mode: 'proxy-endpoint',
      endpoint: '/api/openrouter',
      models: ['mock/model'],
      reasonModels: ['mock/model'],
      siteUrl: 'https://example.com',
      title: 'test',
    },
    label: 'animal',
    cards,
    isZh: false,
  })

  globalThis.fetch = originalFetch

  assert.ok(result)
  assert.equal(result?.model, 'mock/model')
  assert.equal(result?.scores.c01, 0.91)
  assert.equal(result?.scores.c02, 0.12)
})

test('requestRealityLabelMatch returns null when API response has no valid scores', async () => {
  const originalFetch = globalThis.fetch

  globalThis.fetch = (async () => {
    const payload = {
      choices: [
        {
          message: {
            content: '{"reason":"no score payload"}',
          },
        },
      ],
    }

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }) as typeof fetch

  const result = await requestRealityLabelMatch({
    config: {
      mode: 'proxy-endpoint',
      endpoint: '/api/openrouter',
      models: ['mock/model'],
      reasonModels: ['mock/model'],
      siteUrl: 'https://example.com',
      title: 'test',
    },
    label: 'animal',
    cards,
    isZh: true,
  })

  globalThis.fetch = originalFetch

  assert.equal(result, null)
})

test('requestRealityCardMatch prompt includes cultural and metaphor association guardrails', async () => {
  const originalFetch = globalThis.fetch
  const firstCard = cards[0]
  assert.ok(firstCard)
  let capturedBody = ''
  let callCount = 0

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    callCount += 1

    if (typeof input === 'string' && input.startsWith('https://example.com/')) {
      return new Response('mock-image-bytes', {
        status: 200,
        headers: { 'Content-Type': 'image/png' },
      })
    }

    capturedBody = typeof init?.body === 'string' ? init.body : ''
    const payload = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              score: 0.31,
              reason: '文化语境里有象征联想路径。',
            }),
          },
        },
      ],
    }

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }) as typeof fetch

  const result = await requestRealityCardMatch({
    config: {
      mode: 'proxy-endpoint',
      endpoint: '/api/openrouter',
      models: ['mock/model'],
      reasonModels: ['mock/model'],
      siteUrl: 'https://example.com',
      title: 'test',
    },
    label: '性',
    card: firstCard,
    isZh: true,
  })

  globalThis.fetch = originalFetch

  assert.ok(result)
  assert.ok(callCount >= 2)
  assert.match(capturedBody, /字面|文化|隐喻/)
  assert.match(capturedBody, /不得直接判为 0|不要直接判为 0|not assign 0/i)
  assert.match(capturedBody, /复合词|固定搭配|器物|茶刀|Pu-erh|tea knife/i)
  assert.match(capturedBody, /0\.15|0\.33|0\.50|0\.70|0\.85/)
  assert.match(capturedBody, /button[- ]keyboard|button[- ]apple|button[- ]light switch|button[- ]choice|button-选择/i)
  assert.match(capturedBody, /音乐|music/)
  assert.match(capturedBody, /灭火器|fire extinguisher/)
  assert.match(capturedBody, /0\.10-0\.25/)
  assert.match(capturedBody, /只能依据|Use ONLY/)
  assert.match(capturedBody, /严禁依据|Never score from/)
  assert.match(capturedBody, /文件名|filename|URL|元数据|metadata/)
  assert.doesNotMatch(capturedBody, /图像概念提示|Image concept hint|tags=|desc=|fox in grassland/)
  assert.match(capturedBody, /temperature":0(\D|$)/)
})
