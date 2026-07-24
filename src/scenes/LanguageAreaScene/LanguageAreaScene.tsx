import { useCallback, useMemo, useRef, useState } from 'react'
import { SceneFrame } from '../../components/SceneFrame'
import { useUiLanguageStore } from '../../stores/uiLanguageStore'
import { TerminalWindow } from '../VisualSystemsConsole/components/TerminalWindow'
import '../VisualSystemsConsole/visualSystemsConsole.css'
import { scoreLabelAffinity } from './languageDecoder'
import { LanguageKnowledgeGraph } from './components/LanguageKnowledgeGraph'
import { requestRealityLabelMatch, type RealityImageCard } from './realityMatcher'
import { resolveChatapConfig, type ChatapConfig } from '../FacePipelineScene/emojiMatcher'
import './languageArea.css'
import foxImage from '../../../assets/fox.png'
import catImage from '../../../assets/cat.jpeg'
import fortyTwoImage from '../../../assets/42.jpg'
import appleImage from '../../../assets/apple.jpg'
import artichokeImage from '../../../assets/artichoke.jpg'
import annImage from '../../../assets/Ann.png'
import advxImage from '../../../assets/advx.png'
import nijigenImage from '../../../assets/nijigen.png'
import volcanoImage from '../../../assets/Eyjafjallajökull Volcano – South Iceland - Iceland Travel Guide_ Locations & Tours.jpg'
import hydrantImage from '../../../assets/hydrant.jpg'
import brainImage from '../../../assets/brain.jpg'
import mouseImage from '../../../assets/mouse.jpg'
import constantinopleImage from '../../../assets/ Constantinople.jpg'

const realityCards: RealityImageCard[] = [
  { id: 'c01', label: 'fox', labelZh: '狐狸', imageUrl: foxImage, tags: ['animal', 'wildlife', 'predator'], description: 'fox in natural habitat' },
  { id: 'c02', label: 'cat', labelZh: '猫', imageUrl: catImage, tags: ['animal', 'pet', 'mammal'], description: 'domestic cat portrait' },
  { id: 'c03', label: 'apple fruit', labelZh: '苹果果实', imageUrl: appleImage, tags: ['food', 'fruit', 'nutrition'], description: 'red apple close-up' },
  { id: 'c04', label: 'annabergite', labelZh: '镍华', imageUrl: annImage, tags: ['mineral', 'annabergite', 'nickel'], description: 'green annabergite mineral sample' },
  { id: 'c05', label: 'apple logo device', labelZh: '苹果品牌设备', imageUrl: 'https://loremflickr.com/640/420/apple,logo,laptop?lock=105', tags: ['tool', 'device', 'brand', 'technology'], description: 'laptop with apple logo' },
  {
    id: 'c06',
    label: 'eyjafjallajökull volcano',
    labelZh: '冰岛艾雅法拉火山（eyjafjallajökull）',
    imageUrl: volcanoImage,
    tags: ['danger', 'nature', 'geology', 'volcano', 'iceland'],
    description: 'Eyjafjallajökull volcano landscape in Iceland',
  },
  { id: 'c07', label: 'charging cable', labelZh: '充电线', imageUrl: 'https://loremflickr.com/640/420/usb,cable,charger?lock=107', tags: ['tool', 'device', 'technology'], description: 'usb charging cable' },
  { id: 'c08', label: 'AdventureX', labelZh: 'AdventureX', imageUrl: advxImage, tags: ['conference', 'tech', 'event', 'brand'], description: 'AdventureX visual identity image' },
  { id: 'c09', label: 'trap', labelZh: '陷阱', imageUrl: 'https://loremflickr.com/640/420/trap,mousetrap?lock=109', tags: ['danger', 'tool', 'mechanical'], description: 'spring-loaded trap' },
  { id: 'c10', label: 'artichoke', labelZh: '菜蓟', imageUrl: artichokeImage, tags: ['food', 'vegetable', 'plant'], description: 'artichoke vegetable photo' },
  { id: 'c11', label: 'toolkit', labelZh: '工具箱', imageUrl: 'https://loremflickr.com/640/420/tools,toolbox?lock=111', tags: ['tool', 'hardware', 'repair'], description: 'toolbox with hand tools' },
  { id: 'c12', label: 'brain model', labelZh: '大脑模型', imageUrl: brainImage, tags: ['organ', 'biology', 'science'], description: 'human brain model' },
  { id: 'c13', label: 'mouse animal', labelZh: '老鼠', imageUrl: mouseImage, tags: ['animal', 'wildlife', 'rodent'], description: 'small mouse in field' },
  { id: 'c14', label: 'computer mouse', labelZh: '电脑鼠标', imageUrl: 'https://loremflickr.com/640/420/computer,mouse?lock=114', tags: ['tool', 'device', 'technology'], description: 'computer mouse on desk' },
  { id: 'c15', label: 'bread', labelZh: '面包', imageUrl: 'https://loremflickr.com/640/420/bread,bakery?lock=115', tags: ['food', 'meal', 'carb'], description: 'bread loaf on wooden board' },
  { id: 'c16', label: 'lightning', labelZh: '闪电', imageUrl: 'https://loremflickr.com/640/420/lightning,storm?lock=116', tags: ['danger', 'weather', 'energy'], description: 'lightning strike in storm' },
  { id: 'c17', label: 'knife', labelZh: '刀具', imageUrl: 'https://loremflickr.com/640/420/knife,kitchen?lock=117', tags: ['tool', 'danger', 'kitchen'], description: 'kitchen knife close-up' },
  { id: 'c18', label: 'nijigen', labelZh: '二次元', imageUrl: nijigenImage, tags: ['anime', 'illustration', 'culture', 'style'], description: '2D anime-style character visual' },
  { id: 'c19', label: '42', labelZh: '数字42', imageUrl: fortyTwoImage, tags: ['number', 'symbol', 'math', 'answer'], description: 'number 42 visual card' },
  { id: 'c20', label: 'noodles', labelZh: '面条', imageUrl: 'https://loremflickr.com/640/420/noodles,food?lock=120', tags: ['food', 'meal', 'asian'], description: 'bowl of noodles' },
  { id: 'c21', label: 'constantinople', labelZh: '君士坦丁堡', imageUrl: constantinopleImage, tags: ['city', 'history', 'culture', 'constantinople'], description: 'historical image of Constantinople' },
  { id: 'c22', label: 'fire extinguisher', labelZh: '灭火器', imageUrl: hydrantImage, tags: ['tool', 'safety', 'danger'], description: 'fire safety equipment image' },
  { id: 'c23', label: 'tree forest', labelZh: '树与森林', imageUrl: 'https://loremflickr.com/640/420/tree,forest?lock=123', tags: ['nature', 'plant', 'ecology'], description: 'forest tree scene' },
  { id: 'c24', label: 'capsule pill', labelZh: '胶囊', imageUrl: 'https://loremflickr.com/640/420/pill,capsule,medicine?lock=124', tags: ['medicine', 'health', 'pharmacy'], description: 'capsule pills close-up' },
  { id: 'c25', label: 'satellite dish', labelZh: '卫星天线', imageUrl: 'https://loremflickr.com/640/420/satellite,dish?lock=125', tags: ['tool', 'device', 'communication'], description: 'satellite communication dish' },
]

export const LanguageAreaScene = () => {
  const language = useUiLanguageStore((state) => state.language)
  const isZh = language === 'zh'
  const activeRealityMatchReqRef = useRef(0)

  const [labelInput, setLabelInput] = useState('animal')
  const [llmRealityScores, setLlmRealityScores] = useState<Record<string, number>>({})
  const [matchStatus, setMatchStatus] = useState<'idle' | 'matching' | 'llm' | 'fallback'>('idle')
  const [matchReason, setMatchReason] = useState('')
  const [lastMatchedLabel, setLastMatchedLabel] = useState('')

  const localScoredReality = useMemo(() => {
    return realityCards.map((card) => ({
      card,
      score: scoreLabelAffinity(labelInput, [card.label, card.labelZh, card.description, ...card.tags]),
    }))
  }, [labelInput])

  const scoredReality = useMemo(() => {
    const merged = localScoredReality.map((entry) => {
      const llmScore = llmRealityScores[entry.card.id]
      return {
        card: entry.card,
        score: typeof llmScore === 'number' ? llmScore : entry.score,
      }
    })

    const hasResolvedMatch = matchStatus === 'llm' || matchStatus === 'fallback'
    return merged.map((entry) => {
      if (!hasResolvedMatch) {
        return { ...entry, tier: 'neutral' as const }
      }

      const score = entry.score
      if (score <= 0.01) {
        return { ...entry, tier: 'low' as const }
      }

      if (score >= 0.72) {
        return { ...entry, tier: 'high' as const }
      }

      if (score >= 0.35) {
        return { ...entry, tier: 'mid' as const }
      }

      return { ...entry, tier: 'low' as const }
    })
  }, [localScoredReality, llmRealityScores, matchStatus])

  const resolveRealityConfig = useCallback((): ChatapConfig | null => {
    const env = import.meta.env as Record<string, string | undefined>
    const scopedWindow = window as Window & { CHATAP?: string; __CHATAP__?: string }
    const chatap = (env.VITE_CHATAP || scopedWindow.CHATAP || scopedWindow.__CHATAP__ || '').trim()

    return resolveChatapConfig({
      chatap,
      model: (env.VITE_LANGUAGE_MATCH_MODEL || env.VITE_CHATAP_MODEL || '').trim(),
      fallbackModel: (env.VITE_LANGUAGE_MATCH_MODEL_FALLBACK || env.VITE_CHATAP_MODEL_FALLBACK || '').trim(),
      siteUrl: (env.VITE_CHATAP_SITE_URL || window.location.origin).trim(),
      title: (env.VITE_CHATAP_TITLE || 'FutureGate-LanguageArea').trim(),
    })
  }, [])

  const runRealityMatch = useCallback(async () => {
    const normalizedLabel = labelInput.trim()
    if (!normalizedLabel) {
      setLlmRealityScores({})
      setMatchStatus('idle')
      setMatchReason('')
      setLastMatchedLabel('')
      return
    }

    const requestId = activeRealityMatchReqRef.current + 1
    activeRealityMatchReqRef.current = requestId
    setMatchStatus('matching')

    const config = resolveRealityConfig()
    if (!config) {
      if (activeRealityMatchReqRef.current !== requestId) return
      setLlmRealityScores({})
      setMatchStatus('fallback')
      setMatchReason(isZh ? '匹配服务未配置，已回退到本地相似度。' : 'Matching service is unavailable; using local affinity fallback.')
      setLastMatchedLabel(normalizedLabel)
      return
    }

    const result = await requestRealityLabelMatch({
      config,
      label: normalizedLabel,
      cards: realityCards,
      isZh,
    })

    if (activeRealityMatchReqRef.current !== requestId) return

    if (!result) {
      setLlmRealityScores({})
      setMatchStatus('fallback')
      setMatchReason(
        isZh
          ? 'OpenRouter 未返回有效分数，已使用本地相似度模型。'
          : 'OpenRouter did not return valid scores; switched to local affinity model.',
      )
      setLastMatchedLabel(normalizedLabel)
      return
    }

    setLlmRealityScores(result.scores)
    setMatchStatus('llm')
    setLastMatchedLabel(normalizedLabel)
    setMatchReason(
      result.reason ||
        (isZh
          ? `OpenRouter(${result.model}) 已完成 25 张图片动态语义匹配。`
          : `OpenRouter (${result.model}) completed dynamic semantic matching for all 25 images.`),
    )
  }, [isZh, labelInput, resolveRealityConfig])

  return (
    <SceneFrame
      title={isZh ? 'Chapter II / 使用语言 USING LANGUAGE' : 'Chapter II / USING LANGUAGE'}
      subtitle={
        isZh
          ? '语言实验终端：标签匹配与知识图谱。'
          : 'Language lab terminal: dynamic label matching and knowledge graph.'
      }
      previousPath="/scene/chapter-ii"
      nextPath="/scene/rev-lingual"
    >
      <section className="lang-shell" aria-label={isZh ? '使用语言交互实验终端' : 'Using language interaction lab'}>
        <div className="lang-stage-header">
          <h2>{isZh ? '第一部分：使用语言' : 'Part I: Using Language'}</h2>
          <p>
            {isZh
              ? 'One label, new reality / Language connectome'
              : 'One label, new reality / Language connectome'}
          </p>
        </div>

        <div className="lang-grid">
          <TerminalWindow
            id="L-01"
            title={isZh ? 'One label, new reality（一个标签，重新组织现实）' : 'ONE LABEL, NEW REALITY'}
            status="linked"
            className="lang-window-reality"
          >
            <p className="lang-note">
              {isZh
                ? '输入任意标签（例如 fragile / ritual / healing / predator），按回车或点击按钮后，系统调用 OpenRouter 对 25 张真实图片做动态匹配。'
                : 'Type any label (e.g. fragile/ritual/healing/predator), then press Enter or click the button to run dynamic OpenRouter matching for all 25 real images.'}
            </p>
            <div className="lang-label-row">
              <input
                className="lang-label-input"
                value={labelInput}
                onChange={(event) => {
                  setLabelInput(event.target.value)
                  setMatchStatus('idle')
                  setMatchReason('')
                  setLastMatchedLabel('')
                  setLlmRealityScores({})
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    void runRealityMatch()
                  }
                }}
                placeholder={isZh ? '输入任意标签，例如 predator / memory / ritual' : 'type any label, e.g. predator / memory / ritual'}
              />
              <div className="lang-reality-toolbar">
                <button type="button" className="lang-match-button" onClick={() => void runRealityMatch()}>
                  {matchStatus === 'matching'
                    ? (isZh ? '匹配中...' : 'Matching...')
                    : (isZh ? '运行动态匹配' : 'Run Dynamic Match')}
                </button>
                {['animal', 'tool', 'danger', 'food', 'healing', 'predator'].map((preset) => (
                  <button
                    type="button"
                    key={preset}
                    onClick={() => {
                      setLabelInput(preset)
                      setMatchStatus('idle')
                      setMatchReason('')
                      setLastMatchedLabel('')
                      setLlmRealityScores({})
                    }}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {lastMatchedLabel ? (
              <p className="lang-match-note">
                {isZh ? '最近匹配标签：' : 'Latest label: '}<b>{lastMatchedLabel}</b>
                {' · '}
                {matchStatus === 'llm'
                  ? (isZh ? '模式：OpenRouter 动态匹配' : 'Mode: OpenRouter dynamic')
                  : matchStatus === 'matching'
                    ? (isZh ? '模式：匹配执行中' : 'Mode: matching in progress')
                    : matchStatus === 'fallback'
                      ? (isZh ? '模式：本地兜底' : 'Mode: local fallback')
                      : (isZh ? '模式：待匹配' : 'Mode: idle')}
              </p>
            ) : null}

            {matchReason ? <p className="lang-note">{matchReason}</p> : null}

            <div
              className={`lang-reality-grid ${matchStatus === 'matching' ? 'is-matching' : ''}`}
              role="list"
              aria-label={isZh ? '语义重组对象网格' : 'Semantic reality grid'}
            >
              {scoredReality.map((entry) => {
                const hasBlackFill = entry.card.id === 'c06' || entry.card.id === 'c22'
                return (
                  <article
                    key={entry.card.id}
                    role="listitem"
                    className={`lang-reality-card is-${entry.tier} ${hasBlackFill ? 'has-black-fill' : ''}`}
                  >
                    <img src={entry.card.imageUrl} alt={isZh ? entry.card.labelZh : entry.card.label} loading="lazy" />
                    <div className="lang-reality-meta">
                      <small>{isZh ? entry.card.labelZh : entry.card.label}</small>
                      <b>{Math.round(entry.score * 100)}%</b>
                    </div>
                  </article>
                )
              })}
            </div>

            <p className="lang-disclaimer">
              {isZh
                ? '注：高亮强度来自语义模型估计（OpenRouter 或本地兜底），不代表神经影像真实分类结果。'
                : 'Note: highlight strength is estimated by a semantic model (OpenRouter or local fallback), not a real neural measurement.'}
            </p>
          </TerminalWindow>

          <TerminalWindow
            id="L-02"
            title={isZh ? '语言连接知识图谱' : 'LANGUAGE CONNECTOME'}
            status="linked"
            className="lang-window-graph"
          >
            <LanguageKnowledgeGraph isZh={isZh} />
          </TerminalWindow>
        </div>

        <p className="lang-global-disclaimer">
          {isZh
            ? '本页中的预测值、标签相似度和语义切换均为模型可视化，不是真实脑电测量。'
            : 'All predictions, label affinity scores, and semantic switches here are model visualizations, not real EEG measurements.'}
        </p>
      </section>
    </SceneFrame>
  )
}
