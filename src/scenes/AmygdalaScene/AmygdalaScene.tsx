import { useEffect, useRef, useState } from 'react'
import { DisconnectRegionButton } from '../../components/DisconnectRegionButton'
import { SceneFrame } from '../../components/SceneFrame'
import { useNeuroTripStore } from '../../stores/neuroTripStore'
import { useUiLanguageStore } from '../../stores/uiLanguageStore'

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

export const AmygdalaScene = () => {
  const language = useUiLanguageStore((state) => state.language)
  const isZh = language === 'zh'

  const fearLevel = useNeuroTripStore((state) => state.fearLevel)
  const setFearLevel = useNeuroTripStore((state) => state.setFearLevel)
  const disconnectedRegions = useNeuroTripStore((state) => state.disconnectedRegions)
  const recordInteraction = useNeuroTripStore((state) => state.recordInteraction)
  const isDisconnected = disconnectedRegions.includes('amygdala')

  const lastPointerRef = useRef<{ x: number; y: number; t: number } | null>(null)
  const [targetPosition, setTargetPosition] = useState({ x: 48, y: 45 })

  useEffect(() => {
    if (!isDisconnected) {
      return
    }

    const interval = window.setInterval(() => {
      setFearLevel(Math.max(0.05, fearLevel * 0.9))
    }, 220)

    return () => window.clearInterval(interval)
  }, [fearLevel, isDisconnected, setFearLevel])

  return (
    <SceneFrame
      title={isZh ? '杏仁核' : 'Amygdala'}
      subtitle={
        isZh
          ? '在你意识到危险之前，你的身体往往已经先做出反应。'
          : 'Before you understand danger, your body has already reacted.'
      }
      regionId="amygdala"
      previousPath="/scene/visual-cortex"
      nextPath="/scene/hippocampus"
    >
      <div
        className={`amygdala-arena ${isDisconnected ? 'arena-calm' : 'arena-alert'}`}
        onMouseMove={(event) => {
          const box = event.currentTarget.getBoundingClientRect()
          const relativeX = ((event.clientX - box.left) / box.width) * 100
          const relativeY = ((event.clientY - box.top) / box.height) * 100

          const now = performance.now()
          const previous = lastPointerRef.current
          lastPointerRef.current = { x: event.clientX, y: event.clientY, t: now }

          if (!previous || isDisconnected) {
            return
          }

          const distance = Math.hypot(event.clientX - previous.x, event.clientY - previous.y)
          const elapsed = Math.max(16, now - previous.t)
          const speed = distance / elapsed
          const normalizedThreat = clamp(speed * 1.8, 0, 1)
          const blendedFear = fearLevel * 0.68 + normalizedThreat * 0.32

          setFearLevel(blendedFear)
          setTargetPosition((current) => ({
            x: clamp(current.x + (current.x - relativeX) * 0.12, 10, 88),
            y: clamp(current.y + (current.y - relativeY) * 0.12, 14, 86),
          }))

          recordInteraction({
            type: 'pointer-move',
            scene: '/scene/amygdala',
            timestamp: Date.now(),
            value: normalizedThreat,
          })
        }}
      >
        <div className="threat-meter" aria-label={isZh ? '威胁显著性仪表' : 'Threat salience meter'}>
          <span>{isZh ? '威胁显著性' : 'Threat Salience'}</span>
          <strong>{Math.round(fearLevel * 100)}%</strong>
        </div>

        <button
          type="button"
          className="target-signal"
          style={{ left: `${targetPosition.x}%`, top: `${targetPosition.y}%` }}
          aria-label={isZh ? '威胁线索' : 'Threat cue'}
          onClick={() => {
            recordInteraction({
              type: 'click',
              scene: '/scene/amygdala',
              timestamp: Date.now(),
              target: 'threat-cue',
            })
          }}
        >
          ⚠
        </button>
      </div>

      <DisconnectRegionButton regionId="amygdala" />
      <p className="scene-quote">
        {isDisconnected
          ? isZh
            ? '恭喜，你几乎不再感到恐惧。但遗憾的是，恐惧也是生存机制的一部分。'
            : 'Congratulations. You no longer feel fear. Unfortunately, fear is also part of survival.'
          : isZh
            ? '鼠标移动速度会实时重塑显著性：靠近越快，警报越强。'
            : 'Mouse velocity reshapes salience in real time. Fast approach, stronger alarm.'}
      </p>
    </SceneFrame>
  )
}
