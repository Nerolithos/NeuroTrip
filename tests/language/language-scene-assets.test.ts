import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

test('LanguageAreaScene does not depend on unstable loremflickr external images', () => {
  const scenePath = resolve(process.cwd(), 'src/scenes/LanguageAreaScene/LanguageAreaScene.tsx')
  const content = readFileSync(scenePath, 'utf8')

  assert.equal(content.includes('loremflickr.com'), false)
})

test('volcano Chinese label stays Chinese-only in LanguageAreaScene', () => {
  const scenePath = resolve(process.cwd(), 'src/scenes/LanguageAreaScene/LanguageAreaScene.tsx')
  const content = readFileSync(scenePath, 'utf8')

  assert.equal(content.includes("labelZh: '冰岛艾雅法拉火山'"), true)
  assert.equal(content.includes('冰岛艾雅法拉火山（eyjafjallajökull）'), false)
})

test('LanguageAreaScene does not hard-cap high LLM scores at 0.46', () => {
  const scenePath = resolve(process.cwd(), 'src/scenes/LanguageAreaScene/LanguageAreaScene.tsx')
  const content = readFileSync(scenePath, 'utf8')

  assert.equal(content.includes('Math.min(score, 0.46)'), false)
})

test('LanguageAreaScene card images use local assets and avoid init-memory pool', () => {
  const scenePath = resolve(process.cwd(), 'src/scenes/LanguageAreaScene/LanguageAreaScene.tsx')
  const content = readFileSync(scenePath, 'utf8')

  assert.equal(content.includes("from '../../assets/init-memory/"), false)
})

test('LanguageAreaScene MRI card uses MRI image and text', () => {
  const scenePath = resolve(process.cwd(), 'src/scenes/LanguageAreaScene/LanguageAreaScene.tsx')
  const content = readFileSync(scenePath, 'utf8')

  assert.equal(content.includes("{ id: 'c20', label: 'MRI', labelZh: 'MRI', imageUrl: mriImage"), true)
  assert.equal(content.includes("{ id: 'c20', label: 'noodles', labelZh: '面条', imageUrl: mriImage"), false)
})

test('LanguageAreaScene lightning and knife cards use dedicated local images', () => {
  const scenePath = resolve(process.cwd(), 'src/scenes/LanguageAreaScene/LanguageAreaScene.tsx')
  const content = readFileSync(scenePath, 'utf8')

  assert.equal(content.includes("{ id: 'c16', label: 'lightning', labelZh: '闪电', imageUrl: lightningImage"), true)
  assert.equal(content.includes("{ id: 'c17', label: 'knife', labelZh: '刀具', imageUrl: knifeImage"), true)
})
