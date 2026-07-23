import { useState } from 'react'
import { DisconnectRegionButton } from '../../components/DisconnectRegionButton'
import { SceneFrame } from '../../components/SceneFrame'
import { useNeuroTripStore } from '../../stores/neuroTripStore'

type StimulusControls = {
  brightness: number
  contrast: number
  motion: number
  color: number
}

export const VisualCortexScene = () => {
  const recordInteraction = useNeuroTripStore((state) => state.recordInteraction)
  const disconnectedRegions = useNeuroTripStore((state) => state.disconnectedRegions)
  const isDisconnected = disconnectedRegions.includes('visual-cortex')

  const [controls, setControls] = useState<StimulusControls>({
    brightness: 58,
    contrast: 64,
    motion: 28,
    color: 62,
  })
  const [cursor, setCursor] = useState({ x: 50, y: 50 })

  const setControl = (key: keyof StimulusControls, value: number) => {
    setControls((current) => ({ ...current, [key]: value }))
  }

  return (
    <SceneFrame
      title="Visual Cortex"
      subtitle="Reality begins as electrical noise. Signal clarity depends on adaptive filtering."
      regionId="visual-cortex"
      previousPath="/map"
      nextPath="/scene/amygdala"
    >
      <div
        className={`visual-stage ${isDisconnected ? 'visual-disconnected' : ''}`}
        onMouseMove={(event) => {
          const box = event.currentTarget.getBoundingClientRect()
          const x = ((event.clientX - box.left) / box.width) * 100
          const y = ((event.clientY - box.top) / box.height) * 100
          setCursor({ x, y })
          recordInteraction({
            type: 'pointer-move',
            scene: '/scene/visual-cortex',
            timestamp: Date.now(),
            value: x,
          })
        }}
      >
        <div
          className="visual-layer visual-layer-raw"
          style={{
            filter: `brightness(${controls.brightness}%) contrast(${controls.contrast}%)`,
          }}
        />
        <div
          className="visual-layer visual-layer-processed"
          style={{
            clipPath: `circle(${18 + controls.motion * 0.16}% at ${cursor.x}% ${cursor.y}%)`,
            filter: `saturate(${controls.color}%) contrast(${controls.contrast + 20}%)`,
          }}
        />
        <div className="scanlines" />
      </div>

      <div className="control-grid">
        {Object.entries(controls).map(([key, value]) => (
          <label key={key}>
            <span>{key}</span>
            <input
              type="range"
              min={20}
              max={100}
              value={value}
              aria-label={`${key} modulation`}
              onChange={(event) => {
                const nextValue = Number(event.target.value)
                setControl(key as keyof StimulusControls, nextValue)
              }}
            />
          </label>
        ))}
      </div>

      <DisconnectRegionButton regionId="visual-cortex" />
      <p className="scene-quote">Original stimulus and processed signal are not the same thing.</p>
    </SceneFrame>
  )
}
