import test from 'node:test'
import assert from 'node:assert/strict'
import { requestRealityLabelMatch, type RealityImageCard } from '../../src/scenes/LanguageAreaScene/realityMatcher.js'

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
