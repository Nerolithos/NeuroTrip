import { getBehaviorById, getRegionById } from '../../data'
import type { BehaviorId } from '../../types/neuro'

type ActivationSignatureProps = {
  behaviorId: BehaviorId
}

const SIZE = 280
const CENTER = SIZE / 2
const BASE_RADIUS = 36
const MAX_RADIUS = 105

export const ActivationSignature = ({ behaviorId }: ActivationSignatureProps) => {
  const behavior = getBehaviorById(behaviorId)

  if (!behavior) {
    return <p className="viz-fallback">No activation signature available.</p>
  }

  const points = behavior.regions
    .map((regionActivation, index, all) => {
      const angle = (Math.PI * 2 * index) / all.length - Math.PI / 2
      const radius = BASE_RADIUS + regionActivation.activation * (MAX_RADIUS - BASE_RADIUS)
      const x = CENTER + radius * Math.cos(angle)
      const y = CENTER + radius * Math.sin(angle)
      return `${x},${y}`
    })
    .join(' ')

  return (
    <section className="activation-panel" aria-label="Activation signature">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="activation-svg" role="img">
        <circle cx={CENTER} cy={CENTER} r={MAX_RADIUS} className="activation-ring" />
        <circle cx={CENTER} cy={CENTER} r={BASE_RADIUS} className="activation-ring" />
        <polygon points={points} className="activation-shape" />
      </svg>

      <ul className="activation-list" aria-label="Activation values by region">
        {behavior.regions.map((entry) => {
          const region = getRegionById(entry.regionId)
          if (!region) {
            return null
          }

          return (
            <li key={entry.regionId}>
              <span>{region.name}</span>
              <span>{Math.round(entry.activation * 100)}%</span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
