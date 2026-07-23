import test from 'node:test'
import assert from 'node:assert/strict'
import {
  applyMachadoApproximation,
  getColorDeficiencyProfile,
} from '../../src/visual/color/machadoCvd.js'

const distance = (a: [number, number, number], b: [number, number, number]) => {
  const dr = a[0] - b[0]
  const dg = a[1] - b[1]
  const db = a[2] - b[2]
  return Math.sqrt(dr * dr + dg * dg + db * db)
}

test('severity mapping is continuous at weak/blind boundary', () => {
  const boundary = 0.74
  const below = getColorDeficiencyProfile('deuteranomaly', boundary - 0.001)
  const at = getColorDeficiencyProfile('deuteranopia', boundary)

  assert.ok(Math.abs(below.effectiveSeverity - at.effectiveSeverity) < 0.03)
})

test('color transform does not jump at weak/blind boundary', () => {
  const boundary = 0.74
  const rgb: [number, number, number] = [0.74, 0.28, 0.12]

  const below = applyMachadoApproximation(rgb, 'deuteranomaly', boundary - 0.001)
  const at = applyMachadoApproximation(rgb, 'deuteranopia', boundary)

  assert.ok(distance(below, at) < 0.05)
})
