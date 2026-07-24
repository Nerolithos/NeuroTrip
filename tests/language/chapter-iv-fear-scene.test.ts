import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const appPath = `${process.cwd()}/src/App.tsx`
const mapPath = `${process.cwd()}/src/scenes/BrainMapScene/BrainMapScene.tsx`
const scenePath = `${process.cwd()}/src/scenes/FearScene/FearScene.tsx`
const cssPath = `${process.cwd()}/src/scenes/FearScene/fearScene.css`
const htmlPath = `${process.cwd()}/fear.html`

const appSource = readFileSync(appPath, 'utf8')
const mapSource = readFileSync(mapPath, 'utf8')
const sceneSource = readFileSync(scenePath, 'utf8')
const cssSource = readFileSync(cssPath, 'utf8')
const htmlSource = readFileSync(htmlPath, 'utf8')

test('chapter iv fear scene is routed and hosted as full-screen fear html', () => {
  assert.match(appSource, /\/scene\/chapter-iv/)
  assert.match(appSource, /FearScene/)
  assert.match(sceneSource, /fear\.html\?raw/)
  assert.match(sceneSource, /fear-experience/)
  assert.match(sceneSource, /window\.__FEAR_SET_APP_LANG/)
  assert.match(sceneSource, /window\.__FEAR_API\?\.setLang/)
  assert.match(cssSource, /fear-page/)
  assert.match(cssSource, /fear-stage/)
  assert.match(htmlSource, /第 四 章|CHAPTER FOUR/)
  assert.match(htmlSource, /id="chapter"/)
  assert.match(htmlSource, /\.num\.panic/)
  assert.match(htmlSource, /window\.__FEAR_LANG/)
  assert.match(htmlSource, /window\.__FEAR_API/)
  assert.match(htmlSource, /scrIntro\(\)/)
})

test('brain map chapter iv entry is available and points to chapter iv scene', () => {
  assert.match(mapSource, /key: 'fear'/)
  assert.match(mapSource, /route: '\/scene\/chapter-iv'/)
  assert.match(mapSource, /第四章 · 恐惧|Chapter IV · Fear/)
})
