import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

test('Hippocampus init-memory uses PNG sources', () => {
  const scenePath = resolve(process.cwd(), 'src/scenes/HippocampusScene/HippocampusScene.tsx')
  const content = readFileSync(scenePath, 'utf8')

  assert.equal(content.includes("init-memory/male-hackathon.png"), true)
  assert.equal(content.includes("init-memory/perfume-poster.png"), true)
  assert.equal(content.includes("init-memory/oil-painting.png"), true)
  assert.equal(content.includes("init-memory/lakeside-view.png"), true)
  assert.equal(content.includes('init-memory/male-hackathon.webp'), false)
})

test('Hippocampus image candidate list excludes known invalid stability model id', () => {
  const scenePath = resolve(process.cwd(), 'src/scenes/HippocampusScene/HippocampusScene.tsx')
  const content = readFileSync(scenePath, 'utf8')

  assert.equal(content.includes('const HIPPO_ARK_ONLY = true'), true)
  assert.equal(content.includes("'doubao-seedream-4-5-251128'"), true)
  assert.equal(content.includes('stabilityai/stable-diffusion-3.5-large'), false)
  assert.equal(content.includes("provider: arkOnly ? 'ark' : undefined"), true)
  assert.equal(content.includes("size: arkOnly ? '2048x2048' : '1024x1024'"), true)
})
