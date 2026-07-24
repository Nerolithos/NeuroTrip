import { useCallback, useMemo, useRef, useState } from 'react'
import { SceneFrame } from '../../components/SceneFrame'
import { useUiLanguageStore } from '../../stores/uiLanguageStore'
import { TerminalWindow } from '../VisualSystemsConsole/components/TerminalWindow'
import '../VisualSystemsConsole/visualSystemsConsole.css'
import { scoreLabelAffinity } from './languageDecoder'
import { LanguageKnowledgeGraph } from './components/LanguageKnowledgeGraph'
import { requestRealityCardMatch, type RealityImageCard } from './realityMatcher'
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
import appleDeviceImage from '../../../assets/apple-device.jpg'
import chargerImage from '../../../assets/charger.jpg'
import trapImage from '../../../assets/trap.jpg'
import toolboxImage from '../../../assets/toolbox.jpg'
import computerMouseImage from '../../../assets/computer-mouse.jpg'
import breadImage from '../../../assets/bread.jpg'
import forestImage from '../../../assets/forest.jpg'
import capsuleImage from '../../../assets/capsule.jpg'
import antennaImage from '../../../assets/antenna.jpg'
import mriImage from '../../../assets/MRI.jpg'
import knifeImage from '../../../assets/knife.jpg'
import lightningImage from '../../../assets/lightening.jpg'

const realityCards: RealityImageCard[] = [
  { id: 'c01', label: 'fox', labelZh: '狐狸', imageUrl: foxImage, tags: ['animal', 'wildlife', 'predator'], description: 'fox in natural habitat' },
  { id: 'c02', label: 'cat', labelZh: '猫', imageUrl: catImage, tags: ['animal', 'pet', 'mammal'], description: 'domestic cat portrait' },
  { id: 'c03', label: 'apple fruit', labelZh: '苹果果实', imageUrl: appleImage, tags: ['food', 'fruit', 'nutrition'], description: 'red apple close-up' },
  { id: 'c04', label: 'annabergite', labelZh: '镍华', imageUrl: annImage, tags: ['mineral', 'annabergite', 'nickel'], description: 'green annabergite mineral sample' },
  { id: 'c05', label: 'apple logo device', labelZh: '苹果品牌设备', imageUrl: appleDeviceImage, tags: ['tool', 'device', 'brand', 'technology'], description: 'laptop with apple logo' },
  {
    id: 'c06',
    label: 'eyjafjallajökull volcano',
    labelZh: '冰岛艾雅法拉火山',
    imageUrl: volcanoImage,
    tags: ['danger', 'nature', 'geology', 'volcano', 'iceland'],
    description: 'Eyjafjallajökull volcano landscape in Iceland',
  },
  { id: 'c07', label: 'charging cable', labelZh: '充电线', imageUrl: chargerImage, tags: ['tool', 'device', 'technology'], description: 'usb charging cable' },
  { id: 'c08', label: 'AdventureX', labelZh: 'AdventureX', imageUrl: advxImage, tags: ['conference', 'tech', 'event', 'brand'], description: 'AdventureX visual identity image' },
  { id: 'c09', label: 'trap', labelZh: '陷阱', imageUrl: trapImage, tags: ['danger', 'tool', 'mechanical'], description: 'spring-loaded trap' },
  { id: 'c10', label: 'artichoke', labelZh: '菜蓟', imageUrl: artichokeImage, tags: ['food', 'vegetable', 'plant'], description: 'artichoke vegetable photo' },
  { id: 'c11', label: 'toolkit', labelZh: '工具箱', imageUrl: toolboxImage, tags: ['tool', 'hardware', 'repair'], description: 'toolbox with hand tools' },
  { id: 'c12', label: 'brain model', labelZh: '大脑模型', imageUrl: brainImage, tags: ['organ', 'biology', 'science'], description: 'human brain model' },
  { id: 'c13', label: 'mouse animal', labelZh: '老鼠', imageUrl: mouseImage, tags: ['animal', 'wildlife', 'rodent'], description: 'small mouse in field' },
  { id: 'c14', label: 'computer mouse', labelZh: '电脑鼠标', imageUrl: computerMouseImage, tags: ['tool', 'device', 'technology'], description: 'computer mouse on desk' },
  { id: 'c15', label: 'bread', labelZh: '面包', imageUrl: breadImage, tags: ['food', 'meal', 'carb'], description: 'bread loaf on wooden board' },
  { id: 'c16', label: 'lightning', labelZh: '闪电', imageUrl: lightningImage, tags: ['danger', 'weather', 'energy'], description: 'lightning strike in storm' },
  { id: 'c17', label: 'knife', labelZh: '刀具', imageUrl: knifeImage, tags: ['tool', 'danger', 'kitchen'], description: 'kitchen knife close-up' },
  { id: 'c18', label: 'nijigen', labelZh: '二次元', imageUrl: nijigenImage, tags: ['anime', 'illustration', 'culture', 'style'], description: '2D anime-style character visual' },
  { id: 'c19', label: '42', labelZh: '数字42', imageUrl: fortyTwoImage, tags: ['number', 'symbol', 'math', 'answer'], description: 'number 42 visual card' },
  { id: 'c20', label: 'MRI', labelZh: 'MRI', imageUrl: mriImage, tags: ['medical', 'brain', 'imaging'], description: 'brain MRI scan image' },
  { id: 'c21', label: 'constantinople', labelZh: '君士坦丁堡', imageUrl: constantinopleImage, tags: ['city', 'history', 'culture', 'constantinople'], description: 'historical image of Constantinople' },
  { id: 'c22', label: 'fire extinguisher', labelZh: '灭火器', imageUrl: hydrantImage, tags: ['tool', 'safety', 'danger'], description: 'fire safety equipment image' },
  { id: 'c23', label: 'tree forest', labelZh: '树与森林', imageUrl: forestImage, tags: ['nature', 'plant', 'ecology'], description: 'forest tree scene' },
  { id: 'c24', label: 'capsule pill', labelZh: '胶囊', imageUrl: capsuleImage, tags: ['medicine', 'health', 'pharmacy'], description: 'capsule pills close-up' },
  { id: 'c25', label: 'satellite dish', labelZh: '卫星天线', imageUrl: antennaImage, tags: ['tool', 'device', 'communication'], description: 'satellite communication dish' },
]

type CardStage = 'neutral' | 'pending' | 'processing' | 'done' | 'fallback'
type CardTier = 'neutral' | 'processing' | 'tier-100' | 'tier-80' | 'tier-60' | 'tier-40' | 'tier-10-40' | 'tier-0-10'

const summarizeAssociationReason = (input: {
  rawReason: string
  fallbackLabel: string
  fallbackTag: string
  isZh: boolean
}) => {
  const normalizedRaw = input.rawReason
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\d+(\.\d+)?\s*%/g, '')
    .replace(/confidence/gi, '')
    .replace(/所以我认为[^。！？.!?]*/g, '')
    .replace(/so i think[^.?!]*/gi, '')

  const pieces = normalizedRaw
    .split(/(?<=[。！？.!?])\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .slice(0, 3)

  const merged = pieces.join(' ')
  if (merged.length >= 14) return merged

  if (input.isZh) {
    return `标签“${input.fallbackLabel}”与该图像在“${input.fallbackTag}”语义场上形成直接联想。语词触发的是概念关联路径，而不是单纯外观匹配。`
  }

  return `The label "${input.fallbackLabel}" links to this image through the semantic field of "${input.fallbackTag}". The association is concept-driven rather than only visual similarity.`
}

const tierFromScore = (score: number): CardTier => {
  if (score >= 0.999) return 'tier-100'
  if (score >= 0.8) return 'tier-80'
  if (score >= 0.6) return 'tier-60'
  if (score >= 0.4) return 'tier-40'
  if (score >= 0.1) return 'tier-10-40'
  return 'tier-0-10'
}

const clamp01 = (value: number) => {
  if (!Number.isFinite(value)) return 0
  if (value < 0) return 0
  if (value > 1) return 1
  return Number(value.toFixed(2))
}

const calibrateAssociationScore = (input: {
  llmScore: number
  reason: string
}) => {
  const reasonNormalized = (input.reason || '').toLowerCase()
  const hasStrongBridgeCue = /(direct|functional|function|control|input|switch|interface|device|operate|canonical|risk|threat|danger|fear|功能|控制|开关|输入|设备|操作|规范|绑定|风险|威胁|危险|恐惧|灾害|灾难)/.test(reasonNormalized)
  const hasWeakCue = /(metaphor|symbol|cultural|theme|association|隐喻|象征|文化|语境|联想)/.test(reasonNormalized)
  const hasUncertainCue = /(insufficient|uncertain|not enough|unclear|不确定|证据不足|难以判断|信息不足)/.test(reasonNormalized)
  const hasCanonicalCue = /(canonical|fixed|strict|direct function|规范|固定搭配|直接功能|强绑定)/.test(reasonNormalized)

  let score = input.llmScore

  if (hasStrongBridgeCue) score += 0.03
  if (hasWeakCue && !hasStrongBridgeCue && score < 0.7) score -= 0.05
  if (hasUncertainCue) score = Math.min(score, 0.35)

  // Keep high model confidence unless there is explicit uncertainty.
  if (input.llmScore > 0.85 && !hasCanonicalCue) {
    score = Math.min(score, 0.78)
  }

  return clamp01(score)
}

export const LanguageAreaScene = () => {
  const language = useUiLanguageStore((state) => state.language)
  const isZh = language === 'zh'
  const activeRealityMatchReqRef = useRef(0)

  const [labelInput, setLabelInput] = useState('animal')
  const [llmRealityScores, setLlmRealityScores] = useState<Record<string, number>>({})
  const [cardStages, setCardStages] = useState<Record<string, CardStage>>({})
  const [cardReasons, setCardReasons] = useState<Record<string, string>>({})
  const [processedCount, setProcessedCount] = useState(0)
  const [activeCardId, setActiveCardId] = useState('')
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
    return localScoredReality.map((entry) => {
      const stage = cardStages[entry.card.id] || 'neutral'
      const llmScore = llmRealityScores[entry.card.id]
      const reason = cardReasons[entry.card.id] || ''
      const hasResolved = stage === 'done' || stage === 'fallback'
      const score = typeof llmScore === 'number' ? llmScore : entry.score

      let tier: CardTier = 'neutral'
      if (stage === 'processing') {
        tier = 'processing'
      } else if (hasResolved) {
        tier = tierFromScore(score)
      }

      return {
        card: entry.card,
        score,
        tier,
        stage,
        reason,
      }
    })
  }, [localScoredReality, cardStages, llmRealityScores, cardReasons])

  const activeCardLabel = useMemo(() => {
    if (!activeCardId) return ''
    const card = realityCards.find((item) => item.id === activeCardId)
    return card ? (isZh ? card.labelZh : card.label) : ''
  }, [activeCardId, isZh])

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
      setCardStages({})
      setCardReasons({})
      setProcessedCount(0)
      setActiveCardId('')
      setMatchStatus('idle')
      setMatchReason('')
      setLastMatchedLabel('')
      return
    }

    const requestId = activeRealityMatchReqRef.current + 1
    activeRealityMatchReqRef.current = requestId
    setMatchStatus('matching')
    setProcessedCount(0)
    setActiveCardId(realityCards[0]?.id || '')
    setLlmRealityScores({})
    setCardReasons({})
    setLastMatchedLabel('')

    const initialStages: Record<string, CardStage> = {}
    realityCards.forEach((card) => {
      initialStages[card.id] = 'pending'
    })
    setCardStages(initialStages)

    const config = resolveRealityConfig()

    let fallbackCount = 0
    for (let index = 0; index < realityCards.length; index += 1) {
      const card = realityCards[index]!
      if (activeRealityMatchReqRef.current !== requestId) return

      setActiveCardId(card.id)
      setCardStages((prev) => ({ ...prev, [card.id]: 'processing' }))

      const localScore = scoreLabelAffinity(normalizedLabel, [card.label, card.labelZh, card.description, ...card.tags])
      const fallbackTag = card.tags[0] || card.label

      if (!config) {
        const localReason = summarizeAssociationReason({
          rawReason: '',
          fallbackLabel: normalizedLabel,
          fallbackTag,
          isZh,
        })

        setLlmRealityScores((prev) => ({ ...prev, [card.id]: localScore }))
        setCardReasons((prev) => ({ ...prev, [card.id]: localReason }))
        setCardStages((prev) => ({ ...prev, [card.id]: 'fallback' }))
        setProcessedCount(index + 1)
        fallbackCount += 1
        continue
      }

      const cardResult = await requestRealityCardMatch({
        config,
        label: normalizedLabel,
        card,
        isZh,
      })

      if (activeRealityMatchReqRef.current !== requestId) return

      if (!cardResult) {
        const localReason = summarizeAssociationReason({
          rawReason: '',
          fallbackLabel: normalizedLabel,
          fallbackTag,
          isZh,
        })

        setLlmRealityScores((prev) => ({ ...prev, [card.id]: localScore }))
        setCardReasons((prev) => ({ ...prev, [card.id]: localReason }))
        setCardStages((prev) => ({ ...prev, [card.id]: 'fallback' }))
        setProcessedCount(index + 1)
        fallbackCount += 1
        continue
      }

      const aiReason = summarizeAssociationReason({
        rawReason: cardResult.reason,
        fallbackLabel: normalizedLabel,
        fallbackTag,
        isZh,
      })

      const calibratedScore = calibrateAssociationScore({
        llmScore: cardResult.score,
        reason: aiReason,
      })

      setLlmRealityScores((prev) => ({ ...prev, [card.id]: calibratedScore }))
      setCardReasons((prev) => ({ ...prev, [card.id]: aiReason }))
      setCardStages((prev) => ({ ...prev, [card.id]: 'done' }))
      setProcessedCount(index + 1)
    }

    if (activeRealityMatchReqRef.current !== requestId) return

    setActiveCardId('')
    setMatchStatus(fallbackCount > 0 ? 'fallback' : 'llm')
    setLastMatchedLabel(normalizedLabel)
    setMatchReason(
      fallbackCount > 0
        ?
        (isZh
          ? `已完成 ${realityCards.length} 张匹配，兜底 ${fallbackCount} 张。`
          : `Processed ${realityCards.length} cards; fallback used on ${fallbackCount}.`)
        : (isZh
          ? `已完成 ${realityCards.length} 张语义联想匹配。`
          : `Processed ${realityCards.length} cards with semantic association.`),
    )
  }, [isZh, labelInput, resolveRealityConfig])

  return (
    <SceneFrame
      title={isZh ? '第二章 / 使用语言' : 'Chapter II / Using Language'}
      subtitle={
        isZh
          ? '语言实验终端：输入文字并查看语义联想。'
          : 'Language lab: type text and view semantic associations.'
      }
      previousPath="/scene/chapter-ii"
      nextPath="/scene/rev-lingual"
    >
      <section className="lang-shell" aria-label={isZh ? '使用语言交互实验终端' : 'Using language interaction lab'}>
        <div className="lang-stage-header">
          <h2>{isZh ? '第一部分：使用语言' : 'Part I: Using Language'}</h2>
          <p>
            {isZh
              ? '输入文字，AI 认为能联想到什么？'
              : 'Type text. What will AI associate with it?'}
          </p>
        </div>

        <div className="lang-grid">
          <TerminalWindow
            id="L-01"
            title={isZh ? '联想与语义' : 'Association & Semantics'}
            status="linked"
            className="lang-window-reality"
          >
            <p className="lang-note">
              {isZh
                ? '输入文字，AI 认为能联想到什么？'
                : 'Type text. What does AI associate it with?'}
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
                  setProcessedCount(0)
                  setActiveCardId('')
                  setLlmRealityScores({})
                  setCardStages({})
                  setCardReasons({})
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    void runRealityMatch()
                  }
                }}
                placeholder={isZh ? '输入文字，例如 茶 / 记忆 / 仪式' : 'Type text, e.g. tea / memory / ritual'}
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
                      setProcessedCount(0)
                      setActiveCardId('')
                      setLlmRealityScores({})
                      setCardStages({})
                      setCardReasons({})
                    }}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {matchStatus === 'matching' ? (
              <p className="lang-match-note">
                {isZh ? '匹配进度：' : 'Progress: '}
                <b>{processedCount}/{realityCards.length}</b>
                {activeCardLabel ? ` · ${isZh ? '当前：' : 'Current: '}${activeCardLabel}` : ''}
              </p>
            ) : null}

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

            <div className="lang-reality-grid" role="list" aria-label={isZh ? '语义重组对象网格' : 'Semantic reality grid'}>
              {scoredReality.map((entry) => {
                const hasBlackFill = entry.card.id === 'c06' || entry.card.id === 'c22'
                return (
                  <article
                    key={entry.card.id}
                    role="listitem"
                    className={`lang-reality-card is-${entry.tier} ${hasBlackFill ? 'has-black-fill' : ''}`}
                    title={entry.reason || undefined}
                  >
                    <img src={entry.card.imageUrl} alt={isZh ? entry.card.labelZh : entry.card.label} loading="lazy" />
                    <div className="lang-reality-meta">
                      <small>{isZh ? entry.card.labelZh : entry.card.label}</small>
                      <b>{entry.stage === 'done' || entry.stage === 'fallback' ? `${Math.round(entry.score * 100)}%` : '...'}</b>
                    </div>
                    {(entry.stage === 'done' || entry.stage === 'fallback') && entry.reason ? (
                      <div className="lang-reality-reason">
                        <p>{entry.reason}</p>
                      </div>
                    ) : null}
                  </article>
                )
              })}
            </div>

            <p className="lang-disclaimer">
              {isZh
                ? '提示：高亮表示语义联想强度。'
                : 'Note: highlights indicate semantic association strength.'}
            </p>
          </TerminalWindow>

          <TerminalWindow
            id="L-02"
            title={isZh ? '语言知识图谱' : 'Language Knowledge Graph'}
            status="linked"
            className="lang-window-graph"
          >
            <LanguageKnowledgeGraph isZh={isZh} />
          </TerminalWindow>
        </div>

        <p className="lang-global-disclaimer">
          {isZh
            ? '本页为语义联想可视化。'
            : 'This page is a semantic-association visualization.'}
        </p>
      </section>
    </SceneFrame>
  )
}
