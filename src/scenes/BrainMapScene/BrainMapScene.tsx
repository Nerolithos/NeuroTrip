import { useNavigate } from 'react-router-dom'
import { SceneFrame } from '../../components/SceneFrame'
import { useNeuroTripStore } from '../../stores/neuroTripStore'
import { useUiLanguageStore } from '../../stores/uiLanguageStore'
import { MergedKnowledgeGraph } from './components/MergedKnowledgeGraph'
import './brainMapKnowledge.css'

type ChapterEntry = {
  key: 'vision' | 'language' | 'memory' | 'fear' | 'sleep'
  titleZh: string
  titleEn: string
  summaryZh: string
  summaryEn: string
  route: string | null
}

const chapterEntries: ChapterEntry[] = [
  {
    key: 'vision',
    titleZh: '第一章 · 视觉',
    titleEn: 'Chapter I · Vision',
    summaryZh: '已开放：第一章封面',
    summaryEn: 'Available: Chapter I cover',
    route: '/',
  },
  {
    key: 'language',
    titleZh: '第二章 · 语言',
    titleEn: 'Chapter II · Language',
    summaryZh: '已开放：语言章节过渡入口',
    summaryEn: 'Available: Language chapter transition',
    route: '/scene/chapter-ii',
  },
  {
    key: 'memory',
    titleZh: '第三章 · 记忆',
    titleEn: 'Chapter III · Memory',
    summaryZh: '开发中：即将开放',
    summaryEn: 'In progress: coming soon',
    route: null,
  },
  {
    key: 'fear',
    titleZh: '第四章 · 恐惧',
    titleEn: 'Chapter IV · Fear',
    summaryZh: '开发中：即将开放',
    summaryEn: 'In progress: coming soon',
    route: null,
  },
  {
    key: 'sleep',
    titleZh: '第五章 · 睡眠',
    titleEn: 'Chapter V · Sleep',
    summaryZh: '开发中：即将开放',
    summaryEn: 'In progress: coming soon',
    route: null,
  },
]

export const BrainMapScene = () => {
  const navigate = useNavigate()
  const language = useUiLanguageStore((state) => state.language)
  const isZh = language === 'zh'

  const recordInteraction = useNeuroTripStore((state) => state.recordInteraction)

  return (
    <SceneFrame
      title={isZh ? '脑网络总图谱' : 'Neural Knowledge Graph'}
      subtitle={
        isZh
          ? '已融合五域知识图谱：可在下方直接进入对应章节目录。'
          : 'Five-domain merged graph: jump to each chapter directory below.'
      }
      previousPath="/behavior"
      nextPath="/scene/visual-cortex"
    >
      <div className="map-knowledge-shell">
        <div className="map-knowledge-graph">
          <MergedKnowledgeGraph isZh={isZh} />
        </div>

        <ul className="region-quick-links map-chapter-links" aria-label={isZh ? '章节目录跳转' : 'Chapter directory shortcuts'}>
          {chapterEntries.map((entry) => {
            const isAvailable = !!entry.route
            return (
              <li key={entry.key}>
                <button
                  type="button"
                  disabled={!isAvailable}
                  className={isAvailable ? 'is-available' : 'is-disabled'}
                  onClick={() => {
                    if (!entry.route) return
                    recordInteraction({
                      type: 'click',
                      scene: '/map',
                      timestamp: Date.now(),
                      target: `chapter-${entry.key}`,
                    })
                    if (entry.key === 'vision') {
                      navigate(entry.route, { state: { gatewayPreset: 'chapter-i-cover' } })
                      return
                    }
                    navigate(entry.route)
                  }}
                  aria-label={isZh ? `跳转 ${entry.titleZh}` : `Open ${entry.titleEn}`}
                >
                  <span>{isZh ? entry.titleZh : entry.titleEn}</span>
                  <small>{isZh ? entry.summaryZh : entry.summaryEn}</small>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </SceneFrame>
  )
}
