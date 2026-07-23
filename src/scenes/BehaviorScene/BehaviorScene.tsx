import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { behaviors } from '../../data'
import { SceneFrame } from '../../components/SceneFrame'
import { useNeuroTripStore } from '../../stores/neuroTripStore'
import { useUiLanguageStore } from '../../stores/uiLanguageStore'
import type { BehaviorId } from '../../types/neuro'

const behaviorLabelsZh: Record<string, string> = {
  fear: '恐惧',
  memory: '记忆',
  attention: '注意',
  language: '语言',
}

const behaviorSummaryZh: Record<string, string> = {
  fear: '对潜在威胁视觉刺激的分布式处理。',
  memory: '通过海马-皮层网络进行重建式回忆。',
  attention: '任务聚焦下的选择性信号增强。',
  language: '分布式网络中的语义与符号建构。',
}

export const BehaviorScene = () => {
  const navigate = useNavigate()
  const language = useUiLanguageStore((state) => state.language)
  const isZh = language === 'zh'

  const selectedBehavior = useNeuroTripStore((state) => state.selectedBehavior)
  const selectBehavior = useNeuroTripStore((state) => state.selectBehavior)
  const setActivationLevels = useNeuroTripStore((state) => state.setActivationLevels)
  const recordInteraction = useNeuroTripStore((state) => state.recordInteraction)

  const sortedBehaviors = useMemo(() => {
    return [...behaviors].sort((left, right) =>
      left.id === 'fear' ? -1 : right.id === 'fear' ? 1 : left.name.localeCompare(right.name),
    )
  }, [])

  const handleBehaviorSelect = (behaviorId: BehaviorId) => {
    const behavior = behaviors.find((entry) => entry.id === behaviorId)
    if (!behavior) {
      return
    }

    selectBehavior(behaviorId)

    const levels = behavior.regions.reduce<Record<string, number>>((acc, entry) => {
      acc[entry.regionId] = entry.activation
      return acc
    }, {})

    setActivationLevels(levels)

    recordInteraction({
      type: 'behavior-select',
      scene: '/behavior',
      timestamp: Date.now(),
      target: behaviorId,
    })

    navigate('/map')
  }

  return (
    <SceneFrame
      title={isZh ? '选择第一束投影' : 'Choose the First Projection'}
      subtitle={
        isZh
          ? '每一次思维都是不同投影。先选择一种行为，网络将随之重组。'
          : 'Every thought is a different projection. Start with a behavior and the network will reconfigure.'
      }
      nextPath="/map"
      previousPath="/"
    >
      <div className="behavior-grid">
        {sortedBehaviors.map((behavior) => (
          <button
            key={behavior.id}
            type="button"
            className={`behavior-card ${selectedBehavior === behavior.id ? 'active' : ''}`}
            aria-label={
              isZh
                ? `选择 ${behaviorLabelsZh[behavior.id] ?? behavior.name} 行为通路`
                : `Select ${behavior.name} behavior pathway`
            }
            onClick={() => handleBehaviorSelect(behavior.id)}
          >
            <span>{isZh ? behaviorLabelsZh[behavior.id] ?? behavior.name : behavior.name}</span>
            <small>{isZh ? behaviorSummaryZh[behavior.id] ?? behavior.summary : behavior.summary}</small>
          </button>
        ))}
      </div>
      <p className="prototype-note">
        {isZh
          ? '当前原型数值用于叙事展示并已归一化，不代表个体临床读数。'
          : 'Prototype values are illustrative and normalized for storytelling. They are not individual clinical readouts.'}
      </p>
    </SceneFrame>
  )
}
