import { useMemo, useState } from 'react'
import { DisconnectRegionButton } from '../../components/DisconnectRegionButton'
import { SceneFrame } from '../../components/SceneFrame'
import { useNeuroTripStore } from '../../stores/neuroTripStore'
import { useUiLanguageStore } from '../../stores/uiLanguageStore'
import { createSeededRandom, hashSeed } from '../../utils/seededRandom'
import type { MemoryFragment } from '../../types/neuro'

const remixFragment = (fragment: MemoryFragment, iteration: number, isZh: boolean) => {
  const random = createSeededRandom(hashSeed(`${fragment.id}-${iteration}`))
  const variants = isZh
    ? ['几乎', '也许', '不完全一致', '大致相符', '已改写']
    : ['almost', 'perhaps', 'not exactly', 'close enough', 'edited']
  const variant = variants[Math.floor(random() * variants.length)]
  return `${fragment.label} (${variant})`
}

export const HippocampusScene = () => {
  const language = useUiLanguageStore((state) => state.language)
  const isZh = language === 'zh'

  const memoryFragments = useNeuroTripStore((state) => state.memoryFragments)
  const setMemoryFragments = useNeuroTripStore((state) => state.setMemoryFragments)
  const disconnectedRegions = useNeuroTripStore((state) => state.disconnectedRegions)
  const recordInteraction = useNeuroTripStore((state) => state.recordInteraction)
  const isDisconnected = disconnectedRegions.includes('hippocampus')

  const [assembledMemory, setAssembledMemory] = useState<string[]>([])
  const [glitchLine, setGlitchLine] = useState('')

  const totalIntensity = useMemo(
    () => memoryFragments.reduce((acc, fragment) => acc + fragment.intensity, 0),
    [memoryFragments],
  )

  const reconstruct = (fragment: MemoryFragment) => {
    const nextLine = remixFragment(fragment, assembledMemory.length + 1, isZh)

    recordInteraction({
      type: 'memory-reconstruct',
      scene: '/scene/hippocampus',
      timestamp: Date.now(),
      target: fragment.id,
    })

    if (isDisconnected) {
      setGlitchLine(
        isZh
          ? '你似乎来过这里。至少，我们“认为”你来过。'
          : 'You have been here before. At least, we think you have.',
      )
      setAssembledMemory([])
      return
    }

    setAssembledMemory((current) => [...current.slice(-5), nextLine])
    setMemoryFragments(
      memoryFragments.map((entry) =>
        entry.id === fragment.id
          ? {
              ...entry,
              intensity: Math.min(entry.intensity + 0.03, 1),
            }
          : entry,
      ),
    )
    setGlitchLine('')
  }

  return (
    <SceneFrame
      title={isZh ? '海马体' : 'Hippocampus'}
      subtitle={
        isZh
          ? '记忆不是被原样取回，而是在每次触及时被重新建构。'
          : 'Memory is not retrieved. It is reconstructed each time you touch it.'
      }
      regionId="hippocampus"
      previousPath="/scene/amygdala"
      nextPath="/scene/default-mode-network"
    >
      <div className="hippocampus-layout">
        <section className="fragment-column" aria-label={isZh ? '记忆碎片' : 'Memory fragments'}>
          <h3>{isZh ? '碎片' : 'Fragments'}</h3>
          {memoryFragments.map((fragment) => (
            <button
              key={fragment.id}
              type="button"
              className="fragment-card"
              aria-label={isZh ? `重建 ${fragment.label}` : `Reconstruct ${fragment.label}`}
              onClick={() => reconstruct(fragment)}
            >
              <strong>{fragment.label}</strong>
              <span>{fragment.details}</span>
            </button>
          ))}
        </section>

        <section className="reconstruction-column" aria-label={isZh ? '重建时间线' : 'Reconstructed timeline'}>
          <h3>{isZh ? '重建输出' : 'Reconstruction Output'}</h3>
          {assembledMemory.length === 0 ? (
            <p className="scene-quote">
              {isZh
                ? '让注意力掠过记忆，它返回时往往已经发生了轻微改写。'
                : 'Drag memory through attention and it will return slightly altered.'}
            </p>
          ) : (
            <ol>
              {assembledMemory.map((line, index) => (
                <li key={`${line}-${index}`}>{line}</li>
              ))}
            </ol>
          )}

          {glitchLine ? <p className="warning-note">{glitchLine}</p> : null}
          <p className="prototype-note">
            {isZh ? '记忆信号负载' : 'Memory signal load'}: {Math.round(totalIntensity * 100)}%
          </p>
        </section>
      </div>

      <DisconnectRegionButton regionId="hippocampus" />
    </SceneFrame>
  )
}
