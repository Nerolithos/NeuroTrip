import { useNavigate } from 'react-router-dom'
import { SceneFrame } from '../../components/SceneFrame'
import { ActivationSignature } from '../../visualizations/ActivationSignature/ActivationSignature'
import { BrainNetworkGraph } from '../../visualizations/BrainNetwork/BrainNetworkGraph'
import { getBehaviorById, getRegionById } from '../../data'
import { useNeuroTripStore } from '../../stores/neuroTripStore'
import { useUiLanguageStore } from '../../stores/uiLanguageStore'
import type { RegionId } from '../../types/neuro'

const regionRoutes: Record<RegionId, string> = {
  'visual-cortex': '/scene/visual-cortex',
  amygdala: '/scene/amygdala',
  hippocampus: '/scene/hippocampus',
  'default-mode-network': '/scene/default-mode-network',
}

const regionNameZh: Record<RegionId, string> = {
  'visual-cortex': '视觉皮层',
  amygdala: '杏仁核',
  hippocampus: '海马体',
  'default-mode-network': '默认模式网络',
}

const regionDisplayZh: Record<RegionId, string> = {
  'visual-cortex': '现实始于电信号噪声',
  amygdala: '思考之前的警报',
  hippocampus: '记忆是重写而非录像',
  'default-mode-network': '世界安静时，叙事开始运转',
}

export const BrainMapScene = () => {
  const navigate = useNavigate()
  const language = useUiLanguageStore((state) => state.language)
  const isZh = language === 'zh'

  const selectedBehavior = useNeuroTripStore((state) => state.selectedBehavior)
  const behavior = getBehaviorById(selectedBehavior)
  const recordInteraction = useNeuroTripStore((state) => state.recordInteraction)

  return (
    <SceneFrame
      title={isZh ? '网络地图' : 'Network Map'}
      subtitle={
        isZh
          ? '多数行为并非来自单一区域，而是由分布式网络共同涌现。'
          : 'Most behaviors emerge from distributed networks rather than a single region.'
      }
      previousPath="/behavior"
      nextPath="/scene/visual-cortex"
    >
      {!behavior ? (
        <p className="viz-fallback">
          {isZh
            ? '尚未选择行为，请返回上一页先选择一条通路。'
            : 'No behavior selected. Return to selection and choose a pathway.'}
        </p>
      ) : (
        <>
          <div className="map-grid">
            <BrainNetworkGraph
              behaviorId={selectedBehavior}
              onNodeSelect={(regionId) => {
                recordInteraction({
                  type: 'click',
                  scene: '/map',
                  timestamp: Date.now(),
                  target: regionId,
                })
                navigate(regionRoutes[regionId])
              }}
            />
            <ActivationSignature behaviorId={selectedBehavior} />
          </div>

          <ul className="region-quick-links" aria-label={isZh ? '区域场景快捷入口' : 'Region scene quick links'}>
            {behavior.regions.map((entry) => {
              const region = getRegionById(entry.regionId)
              if (!region) {
                return null
              }

              return (
                <li key={entry.regionId}>
                  <button
                    type="button"
                    onClick={() => navigate(regionRoutes[entry.regionId])}
                    aria-label={
                      isZh
                        ? `打开 ${regionNameZh[entry.regionId] ?? region.name} 章节`
                        : `Open ${region.name} chapter`
                    }
                  >
                    <span>{isZh ? regionNameZh[entry.regionId] ?? region.name : region.name}</span>
                    <small>{isZh ? regionDisplayZh[entry.regionId] ?? region.displayName : region.displayName}</small>
                  </button>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </SceneFrame>
  )
}
