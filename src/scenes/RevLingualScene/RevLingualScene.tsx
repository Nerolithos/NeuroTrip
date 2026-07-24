import { useEffect, useMemo, useRef, useState } from 'react'
import { SceneFrame } from '../../components/SceneFrame'
import { useUiLanguageStore } from '../../stores/uiLanguageStore'
import { TerminalWindow } from '../VisualSystemsConsole/components/TerminalWindow'
import '../VisualSystemsConsole/visualSystemsConsole.css'
import {
  buildSemanticClusters,
  detectLanguageCommands,
  predictNextWords,
  tokenizeInput,
} from '../LanguageAreaScene/languageDecoder'
import './revLingual.css'

type FinalPhase = 'interactive' | 'manifesto' | 'cursor' | 'blackout'

type CompetitionState = {
  accepted: number
  resisted: number
}

const finalManifesto = [
  'YOU THOUGHT YOU WERE CHOOSING WORDS.',
  'THE WORDS WERE CHOOSING THE NEXT THOUGHT.',
]

export const RevLingualScene = () => {
  const language = useUiLanguageStore((state) => state.language)
  const isZh = language === 'zh'

  const [inputText, setInputText] = useState('')
  const [machineSuggestion, setMachineSuggestion] = useState('')
  const [takeoverLevel, setTakeoverLevel] = useState(0)
  const [machineInjected, setMachineInjected] = useState(0)
  const [competition, setCompetition] = useState<CompetitionState>({ accepted: 0, resisted: 0 })
  const [showWhiteElephant, setShowWhiteElephant] = useState(false)
  const [finalPhase, setFinalPhase] = useState<FinalPhase>('interactive')
  const [cursorText, setCursorText] = useState('')

  const waveCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const autoInsertRef = useRef(false)
  const lastTokenCountRef = useRef(0)

  const tokens = useMemo(() => tokenizeInput(inputText), [inputText])
  const predictions = useMemo(() => predictNextWords(tokens), [tokens])
  const semanticClusters = useMemo(() => buildSemanticClusters(tokens.slice(-16)), [tokens])
  const commands = useMemo(() => detectLanguageCommands(inputText), [inputText])

  const categoryLabels = useMemo(() => {
    const categories = new Set<string>()
    semanticClusters.forEach((cluster) => {
      if (cluster.anchor === 'i' || cluster.anchor === '我' || cluster.anchor === 'self') categories.add('self-reference')
      if (cluster.anchor === 'fear' || cluster.anchor === 'love' || cluster.anchor === 'emotion') categories.add('affect')
      if (cluster.anchor === 'bank' || cluster.anchor === 'symbol' || cluster.anchor === 'language') categories.add('polysemy')
      if (cluster.anchor === 'fall' || cluster.anchor === 'dark' || cluster.anchor === 'silence') categories.add('command-like')
    })
    if (!categories.size && tokens.length > 0) categories.add('unclassified')
    return [...categories]
  }, [semanticClusters, tokens.length])

  useEffect(() => {
    if (finalPhase !== 'interactive') return

    const timerId = window.setInterval(() => {
      setTakeoverLevel((value) => Math.min(5, value + 1))
    }, 6800)

    return () => {
      window.clearInterval(timerId)
    }
  }, [finalPhase])

  useEffect(() => {
    if (finalPhase !== 'interactive') return

    const timerId = window.setInterval(() => {
      const top = predictions[0]?.token
      if (!top) return

      setMachineSuggestion(top)

      if (takeoverLevel < 2) return

      setInputText((prev) => {
        const normalized = prev.trim()
        const currentTokens = tokenizeInput(prev)
        const lastToken = currentTokens[currentTokens.length - 1]
        if (lastToken === top) return prev

        autoInsertRef.current = true
        const nextText = normalized.length > 0 ? `${prev}${prev.endsWith(' ') ? '' : ' '}${top}` : top
        return nextText
      })

      setMachineInjected((value) => value + 1)
      setCompetition((prev) => ({ ...prev, accepted: prev.accepted + 1 }))
    }, 2400)

    return () => {
      window.clearInterval(timerId)
    }
  }, [finalPhase, predictions, takeoverLevel])

  useEffect(() => {
    if (finalPhase !== 'interactive') return
    if (tokens.length < 8 || showWhiteElephant) return

    const timerId = window.setTimeout(() => {
      setShowWhiteElephant(true)
      setTakeoverLevel((value) => Math.max(value, 3))
    }, 1100)

    return () => {
      window.clearTimeout(timerId)
    }
  }, [finalPhase, showWhiteElephant, tokens.length])

  useEffect(() => {
    const nowCount = tokens.length
    if (nowCount <= lastTokenCountRef.current) return

    if (!autoInsertRef.current) {
      const lastToken = tokens[nowCount - 1] || ''
      if (machineSuggestion && lastToken === machineSuggestion) {
        setCompetition((prev) => ({ ...prev, accepted: prev.accepted + 1 }))
      } else {
        setCompetition((prev) => ({ ...prev, resisted: prev.resisted + 1 }))
      }
    }

    autoInsertRef.current = false
    lastTokenCountRef.current = nowCount
  }, [machineSuggestion, tokens])

  useEffect(() => {
    if (finalPhase !== 'interactive') return
    if (!(takeoverLevel >= 4 || machineInjected >= 5)) return

    setFinalPhase('manifesto')
    const toCursor = window.setTimeout(() => {
      setFinalPhase('cursor')
    }, 3300)

    const toBlackout = window.setTimeout(() => {
      setFinalPhase('blackout')
    }, 5400)

    return () => {
      window.clearTimeout(toCursor)
      window.clearTimeout(toBlackout)
    }
  }, [finalPhase, machineInjected, takeoverLevel])

  useEffect(() => {
    if (finalPhase !== 'cursor') return

    setCursorText('')
    const target = 'I'
    let index = 0

    const timerId = window.setInterval(() => {
      index += 1
      setCursorText(target.slice(0, index))
      if (index >= target.length) {
        window.clearInterval(timerId)
      }
    }, 450)

    return () => {
      window.clearInterval(timerId)
    }
  }, [finalPhase])

  useEffect(() => {
    const canvas = waveCanvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let rafId = 0
    let tick = 0

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      canvas.width = Math.max(1, Math.floor(rect.width))
      canvas.height = Math.max(1, Math.floor(rect.height))
    }

    const drawFlat = () => {
      const w = canvas.width
      const h = canvas.height
      ctx.fillStyle = 'rgba(8, 12, 18, 0.96)'
      ctx.fillRect(0, 0, w, h)
      ctx.strokeStyle = 'rgba(156, 171, 181, 0.72)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(0, h * 0.5)
      ctx.lineTo(w, h * 0.5)
      ctx.stroke()
    }

    const draw = () => {
      if (commands.silence) {
        drawFlat()
        return
      }

      tick += 1
      const w = canvas.width
      const h = canvas.height
      ctx.fillStyle = 'rgba(8, 12, 18, 0.95)'
      ctx.fillRect(0, 0, w, h)

      const amp = 9 + takeoverLevel * 3 + Math.min(tokens.length * 0.4, 10)
      ctx.strokeStyle = showWhiteElephant ? 'rgba(249, 238, 196, 0.95)' : 'rgba(128, 223, 248, 0.94)'
      ctx.lineWidth = 2
      ctx.beginPath()
      for (let x = 0; x < w; x += 1) {
        const phase = x * 0.035 + tick * 0.08
        const y = h * 0.5 + Math.sin(phase) * amp + Math.sin(phase * 0.24) * amp * 0.45
        if (x === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()

      rafId = window.requestAnimationFrame(draw)
    }

    resize()
    if (commands.silence) {
      drawFlat()
    } else {
      draw()
    }

    window.addEventListener('resize', resize)
    return () => {
      window.removeEventListener('resize', resize)
      if (rafId) window.cancelAnimationFrame(rafId)
    }
  }, [commands.silence, showWhiteElephant, takeoverLevel, tokens.length])

  return (
    <SceneFrame
      title={isZh ? 'Chapter II / 被语言所用 USED BY LANGUAGE' : 'Chapter II / USED BY LANGUAGE'}
      subtitle={
        isZh
          ? '你以为在使用语言，实际上语言正在预测并组织你的下一念。'
          : 'You think you are using language; language is predicting and organizing your next thought.'
      }
      previousPath="/scene/language-area"
    >
      <section
        className={`rev-shell ${commands.dark ? 'is-dark' : ''} ${commands.fall ? 'is-fall' : ''} ${commands.silence ? 'is-silent' : ''}`}
      >
        <div className="rev-banner">
          <strong>{isZh ? 'Write something the machine cannot predict.' : 'Write something the machine cannot predict.'}</strong>
        </div>

        <div className="rev-grid">
          <TerminalWindow
            id="R-01"
            title={isZh ? '内心语句采集' : 'INNER STATEMENT CAPTURE'}
            status="active"
            className="rev-window-input"
          >
            <p className="rev-note">{isZh ? '写一句关于自己内心的话。' : 'Write one sentence about your inner state.'}</p>
            <textarea
              className="rev-input"
              value={inputText}
              onChange={(event) => setInputText(event.target.value)}
              rows={5}
              placeholder={isZh ? '例如：我害怕自己正在被语言提前定义。' : 'Example: I fear that language defines me before I speak.'}
              disabled={finalPhase !== 'interactive'}
            />
            <p className="rev-note">
              {isZh
                ? `接管等级 L${takeoverLevel} · 机器注入 ${machineInjected}`
                : `Takeover level L${takeoverLevel} · machine injections ${machineInjected}`}
            </p>
          </TerminalWindow>

          <TerminalWindow
            id="R-02"
            title={isZh ? '预测竞争引擎' : 'PREDICTIVE COMPETITION ENGINE'}
            status="linked"
            className="rev-window-predict"
          >
            <p className="rev-suggestion">
              {isZh ? '机器下一词建议：' : 'Machine next-word suggestion: '}
              <b>{machineSuggestion || (isZh ? '等待上下文' : 'waiting context')}</b>
            </p>
            <ul className="rev-predictions">
              {predictions.map((item) => (
                <li key={item.token}>
                  <span>{item.token}</span>
                  <i style={{ width: `${Math.round(item.probability * 100)}%` }} />
                  <b>{Math.round(item.probability * 100)}%</b>
                </li>
              ))}
            </ul>
            <div className="rev-competition">
              <p>{isZh ? '机器建议被采纳' : 'Machine accepted'}: {competition.accepted}</p>
              <p>{isZh ? '用户偏离建议' : 'User divergence'}: {competition.resisted}</p>
            </div>
          </TerminalWindow>

          <TerminalWindow
            id="R-03"
            title={isZh ? '命名 / 分类 / 语义连接' : 'NAMING / CLASSIFYING / SEMANTIC LINKING'}
            status={showWhiteElephant ? 'active' : 'linked'}
            className="rev-window-semantic"
          >
            <div className="rev-tags">
              {categoryLabels.length ? categoryLabels.map((tag) => <span key={tag}>{tag}</span>) : <span>idle</span>}
            </div>
            <div className="rev-cluster-list">
              {semanticClusters.slice(0, 4).map((cluster) => (
                <article key={cluster.anchor}>
                  <h4>{cluster.anchor}</h4>
                  <p>{cluster.tokens.join(' · ')}</p>
                  <small>{cluster.branches.join(' / ')}</small>
                </article>
              ))}
            </div>

            <div className={`rev-elephant ${showWhiteElephant ? 'is-live' : ''}`}>
              <strong>DO NOT THINK OF A WHITE ELEPHANT</strong>
              <div>
                <span className={showWhiteElephant ? 'is-hot' : ''}>white</span>
                <span className={showWhiteElephant ? 'is-hot' : ''}>elephant</span>
                <span className={showWhiteElephant ? 'is-hot' : ''}>trunk</span>
              </div>
            </div>
          </TerminalWindow>

          <TerminalWindow
            id="R-04"
            title={isZh ? '语言接管监测' : 'LINGUISTIC TAKEOVER MONITOR'}
            status={commands.silence ? 'idle' : 'linked'}
            className="rev-window-monitor"
          >
            <canvas ref={waveCanvasRef} className="rev-wave" />
            <p className="rev-note">
              {isZh
                ? '关键词控制：dark→变暗，fall→坠落，silence→波形停止。'
                : 'Keyword controls: dark -> dim, fall -> collapse text, silence -> freeze waveform.'}
            </p>
          </TerminalWindow>
        </div>

        {finalPhase === 'manifesto' ? (
          <div className="rev-overlay rev-manifesto" aria-live="assertive">
            <p>{finalManifesto[0]}</p>
            <p>{finalManifesto[1]}</p>
          </div>
        ) : null}

        {finalPhase === 'cursor' ? (
          <div className="rev-overlay rev-cursor" aria-live="polite">
            <span>{cursorText}</span>
            <i />
          </div>
        ) : null}

        {finalPhase === 'blackout' ? <div className="rev-overlay rev-blackout" aria-hidden="true" /> : null}
      </section>
    </SceneFrame>
  )
}
