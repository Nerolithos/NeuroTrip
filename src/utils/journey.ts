import type { InteractionEvent, JourneySignature } from '../types/neuro'
import { hashSeed } from './seededRandom'

const clamp = (value: number) => Math.min(Math.max(value, 0), 1)

export const createPatternSeed = (
  interactionHistory: InteractionEvent[],
  selectedBehavior: string,
) => {
  const compact = interactionHistory
    .slice(-120)
    .map((entry) => `${entry.type}:${entry.scene}:${entry.value ?? 0}`)
    .join('|')

  return hashSeed(`${selectedBehavior}|${compact}`)
}

export const deriveJourneySignature = (
  interactionHistory: InteractionEvent[],
  fearLevel: number,
  habitStrength: number,
  idleDuration: number,
): JourneySignature => {
  const clickCount = interactionHistory.filter((entry) => entry.type === 'click').length
  const memoryActions = interactionHistory.filter(
    (entry) => entry.type === 'memory-reconstruct',
  ).length

  return {
    threatSensitive: clamp(fearLevel),
    curiosity: clamp(clickCount / 24),
    memorySeeking: clamp(memoryActions / 12),
    habitResistance: clamp(1 - habitStrength + idleDuration / 60),
  }
}

export const signatureLabels = (signature: JourneySignature) => {
  const labels: string[] = []

  labels.push(signature.curiosity > 0.55 ? 'Curious' : 'Focused')
  labels.push(signature.threatSensitive > 0.6 ? 'Threat-sensitive' : 'Composed')
  labels.push(signature.memorySeeking > 0.45 ? 'Memory-seeking' : 'Present-biased')
  labels.push(signature.habitResistance > 0.55 ? 'Habit-resistant' : 'Pattern-locked')

  return labels
}
