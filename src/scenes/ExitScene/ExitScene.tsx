import { Link } from 'react-router-dom'
import { SceneFrame } from '../../components/SceneFrame'
import { useNeuroTripStore } from '../../stores/neuroTripStore'
import { useUiLanguageStore } from '../../stores/uiLanguageStore'
import { deriveJourneySignature, signatureLabels } from '../../utils/journey'

const labelZhMap: Record<string, string> = {
  Curious: '好奇',
  Focused: '专注',
  'Threat-sensitive': '威胁敏感',
  Composed: '稳定',
  'Memory-seeking': '追索记忆',
  'Present-biased': '当下偏置',
  'Habit-resistant': '抗习惯锁定',
  'Pattern-locked': '模式锁定',
}

export const ExitScene = () => {
  const language = useUiLanguageStore((state) => state.language)
  const isZh = language === 'zh'

  const selectedBehavior = useNeuroTripStore((state) => state.selectedBehavior)
  const visitedRegions = useNeuroTripStore((state) => state.visitedRegions)
  const disconnectedRegions = useNeuroTripStore((state) => state.disconnectedRegions)
  const interactionHistory = useNeuroTripStore((state) => state.interactionHistory)
  const fearLevel = useNeuroTripStore((state) => state.fearLevel)
  const habitStrength = useNeuroTripStore((state) => state.habitStrength)
  const idleDuration = useNeuroTripStore((state) => state.idleDuration)

  const signature = deriveJourneySignature(
    interactionHistory,
    fearLevel,
    habitStrength,
    idleDuration,
  )
  const labels = signatureLabels(signature).map((label) => (isZh ? labelZhMap[label] ?? label : label))

  return (
    <SceneFrame
      title={isZh ? '整合' : 'Integration'}
      subtitle={
        isZh
          ? '并不是你“参观”了大脑，而是大脑创造了这次参观。'
          : 'You did not visit your brain. Your brain created the visit.'
      }
      previousPath="/scene/default-mode-network"
    >
      <div className="exit-grid">
        <section>
          <h3>{isZh ? '你的意识模式' : 'Your consciousness pattern'}</h3>
          <div className="summary-tags">
            {labels.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
          <p className="prototype-note">
            {isZh
              ? `已探索行为：${selectedBehavior}。记录交互：${interactionHistory.length}。`
              : `Behavior explored: ${selectedBehavior}. Interactions recorded: ${interactionHistory.length}.`}
          </p>
        </section>

        <section>
          <h3>{isZh ? '区域足迹' : 'Region footprint'}</h3>
          <ul>
            {visitedRegions.map((regionId) => (
              <li key={regionId}>{regionId}</li>
            ))}
          </ul>
          <p className="prototype-note">
            {isZh ? '断连区域' : 'Disconnected'}:{' '}
            {disconnectedRegions.length === 0 ? (isZh ? '无' : 'none') : disconnectedRegions.join(', ')}
          </p>
        </section>
      </div>

      <p className="disclaimer-inline">
        {isZh
          ? '本输出是叙事化结果，不构成诊断、人格测试或临床估计。'
          : 'This output is a narrative artifact, not a diagnosis, personality test, or clinical estimate.'}
      </p>

      <div className="cta-row">
        <Link className="primary-link" to="/" aria-label={isZh ? '重新开始旅程' : 'Restart the trip'}>
          {isZh ? '重新开始旅程' : 'RESTART THE TRIP'}
        </Link>
        <Link className="ghost-link" to="/map" aria-label={isZh ? '探索数据地图' : 'Explore data map'}>
          {isZh ? '探索数据地图' : 'EXPLORE THE DATA'}
        </Link>
        <Link className="ghost-link" to="/sources" aria-label={isZh ? '查看来源列表' : 'View source list'}>
          {isZh ? '查看来源' : 'VIEW SOURCES'}
        </Link>
      </div>
    </SceneFrame>
  )
}
