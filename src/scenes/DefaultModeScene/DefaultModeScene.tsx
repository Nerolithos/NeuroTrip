import { SceneFrame } from '../../components/SceneFrame'
import { useNeuroTripStore } from '../../stores/neuroTripStore'
import { useUiLanguageStore } from '../../stores/uiLanguageStore'
import { deriveJourneySignature, createPatternSeed, signatureLabels } from '../../utils/journey'
import { KaleidoscopeCanvas } from '../../visualizations/Kaleidoscope/KaleidoscopeCanvas'

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

export const DefaultModeScene = () => {
  const language = useUiLanguageStore((state) => state.language)
  const isZh = language === 'zh'

  const interactionHistory = useNeuroTripStore((state) => state.interactionHistory)
  const selectedBehavior = useNeuroTripStore((state) => state.selectedBehavior)
  const fearLevel = useNeuroTripStore((state) => state.fearLevel)
  const habitStrength = useNeuroTripStore((state) => state.habitStrength)
  const idleDuration = useNeuroTripStore((state) => state.idleDuration)
  const reducedMotion = useNeuroTripStore((state) => state.reducedMotion)

  const signature = deriveJourneySignature(
    interactionHistory,
    fearLevel,
    habitStrength,
    idleDuration,
  )
  const seed = createPatternSeed(interactionHistory, selectedBehavior)
  const labels = signatureLabels(signature).map((label) => (isZh ? labelZhMap[label] ?? label : label))

  return (
    <SceneFrame
      title={isZh ? '默认模式网络' : 'Default Mode Network'}
      subtitle={
        isZh
          ? '当外部世界安静下来，大脑会开始讲述它自己的叙事。'
          : 'When the world goes quiet, the brain begins narrating itself.'
      }
      regionId="default-mode-network"
      previousPath="/scene/hippocampus"
      nextPath="/exit"
    >
      <div className="dmn-shell">
        <p className="scene-quote">
          {isZh
            ? '请静止几秒。空闲时间会让潜在叙事逐步放大。'
            : 'Stay still for a few seconds. Idle time allows latent narratives to amplify.'}
        </p>
        <KaleidoscopeCanvas seed={seed} signature={signature} reducedMotion={reducedMotion} />
        <p className="prototype-note">
          {idleDuration > 3
            ? isZh
              ? 'DMN 放大已激活。先前选择正在被重混为自我叙事模式。'
              : 'DMN amplification online. Prior choices are being remixed into a self-narrative pattern.'
            : isZh
              ? '短暂停顿后，DMN 激活将进一步增强。'
              : 'DMN activation will intensify after short idle periods.'}
        </p>
        <div className="summary-tags" aria-label={isZh ? '实时旅程标签' : 'Live journey labels'}>
          {labels.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
      </div>
    </SceneFrame>
  )
}
