import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNeuroTripStore } from '../../stores/neuroTripStore'
import { useUiLanguageStore } from '../../stores/uiLanguageStore'
import { CHAPTER_II_CAMERA_FRAME_KEY } from './transitionKeys'
import './chapterII.css'

type MatrixColumn = {
  x: number
  y: number
  speed: number
  tail: string[]
}

const FONT_SIZE = 18
const SPEED_MIN = 6
const SPEED_MAX = 16
const TAIL_LEN = 14
const GLITCH_HOLD_MULTIPLIER = 2
const ZH_GLITCH_EXTRA_MULTIPLIER = 1.5
const CHARS =
  'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン' +
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()'
const TITLE_GLITCH_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*アイウエオカキクケコ'
const TITLE_GLITCH_CHARS_ZH =
  '龘靐齉爨麤饕曦黻黼囍讙纛鬯雠虁灈灏蠼鱻齾霻虋曨巘夔' +
  '象徴譯碼錯読異構鏡像訛字語義転換仮名混線章節断片意符音符' +
  'アイウエオカキクケコサシスセソタチツテトナニヌネノ'

const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min

const buildGreenShades = (count: number): string[] => {
  const shades: string[] = []
  for (let i = 0; i < count; i += 1) {
    const t = i / Math.max(1, count - 1)
    const g = Math.round(255 * (0.35 + 0.65 * (1 - t)))
    const r = Math.round(30 * (1 - t))
    const b = Math.round(30 * (1 - t))
    shades.push(`#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`)
  }
  return shades
}

const createColumns = (width: number, height: number): MatrixColumn[] => {
  const columns: MatrixColumn[] = []
  const columnCount = Math.max(1, Math.floor(width / FONT_SIZE))

  for (let index = 0; index < columnCount; index += 1) {
    if (Math.random() >= 0.85) continue
    columns.push({
      x: index * FONT_SIZE,
      y: randInt(-height, 0),
      speed: randInt(SPEED_MIN, SPEED_MAX),
      tail: new Array(TAIL_LEN).fill(' '),
    })
  }

  return columns
}

export const ChapterIIScene = () => {
  const navigate = useNavigate()
  const language = useUiLanguageStore((state) => state.language)
  const isZh = language === 'zh'
  const setCurrentScene = useNeuroTripStore((state) => state.setCurrentScene)
  const recordInteraction = useNeuroTripStore((state) => state.recordInteraction)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null)
  const [typedCounts, setTypedCounts] = useState<number[]>([0, 0, 0])
  const [resolvedCounts, setResolvedCounts] = useState<number[]>([0, 0, 0])
  const [scrambleTick, setScrambleTick] = useState(0)

  const copyLines = useMemo(() => {
    return [
      isZh ? '第二章' : 'CHAPTER II',
      isZh ? '符号' : 'The Symbol',
      isZh ? '点击任意处继续' : 'Click Anywhere To Continue',
    ]
  }, [isZh])

  const glitchChars = isZh ? TITLE_GLITCH_CHARS_ZH : TITLE_GLITCH_CHARS

  useEffect(() => {
    setCurrentScene('/scene/chapter-ii')
    recordInteraction({ type: 'scene-enter', scene: '/scene/chapter-ii', timestamp: Date.now() })

    return () => {
      recordInteraction({ type: 'scene-exit', scene: '/scene/chapter-ii', timestamp: Date.now() })
    }
  }, [recordInteraction, setCurrentScene])

  useEffect(() => {
    try {
      const cached = sessionStorage.getItem(CHAPTER_II_CAMERA_FRAME_KEY)
      setSnapshotUrl(cached || null)
    } catch {
      setSnapshotUrl(null)
    }
  }, [])

  useEffect(() => {
    const intervalIds: number[] = []
    const timeoutIds: number[] = []

    setTypedCounts(new Array(copyLines.length).fill(0))
    setResolvedCounts(new Array(copyLines.length).fill(0))
    setScrambleTick(0)

    const scrambleTimer = window.setInterval(() => {
      setScrambleTick((value) => value + 1)
    }, 300)
    intervalIds.push(scrambleTimer)

    for (let lineIndex = 0; lineIndex < copyLines.length; lineIndex += 1) {
      const line = copyLines[lineIndex] || ''
      const startDelayMs = lineIndex === 0 ? 0 : lineIndex === 1 ? 320 : 1100

      const typeStart = window.setTimeout(() => {
        let typed = 0
        const typeTimer = window.setInterval(() => {
          typed = Math.min(line.length, typed + 1)
          setTypedCounts((prev) => {
            const next = prev.slice()
            next[lineIndex] = typed
            return next
          })

          if (typed >= line.length) {
            window.clearInterval(typeTimer)
          }
        }, 150)

        intervalIds.push(typeTimer)

        const resolveDelay = window.setTimeout(() => {
          let resolved = 0
          const resolveTimer = window.setInterval(() => {
            resolved = Math.min(line.length, resolved + 1)
            setResolvedCounts((prev) => {
              const next = prev.slice()
              next[lineIndex] = resolved
              return next
            })

            if (resolved >= line.length) {
              window.clearInterval(resolveTimer)
            }
          }, 260)

          intervalIds.push(resolveTimer)
        }, Math.max(780, line.length * 165) * GLITCH_HOLD_MULTIPLIER * (isZh ? ZH_GLITCH_EXTRA_MULTIPLIER : 1))

        timeoutIds.push(resolveDelay)
      }, startDelayMs)

      timeoutIds.push(typeStart)
    }

    return () => {
      for (let i = 0; i < intervalIds.length; i += 1) {
        window.clearInterval(intervalIds[i])
      }

      for (let i = 0; i < timeoutIds.length; i += 1) {
        window.clearTimeout(timeoutIds[i])
      }
    }
  }, [copyLines, isZh])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const shades = buildGreenShades(TAIL_LEN)
    let columns = createColumns(window.innerWidth || 1, window.innerHeight || 1)
    let rafId = 0
    let lastFrameMs = 0

    const resize = () => {
      const width = Math.max(1, window.innerWidth || document.documentElement.clientWidth || 1)
      const height = Math.max(1, window.innerHeight || document.documentElement.clientHeight || 1)
      canvas.width = width
      canvas.height = height
      columns = createColumns(width, height)
      ctx.font = `bold ${FONT_SIZE}px 'Courier New', monospace`
      ctx.textBaseline = 'top'
    }

    const drawFrame = (nowMs: number) => {
      if (nowMs - lastFrameMs < 33) {
        rafId = window.requestAnimationFrame(drawFrame)
        return
      }
      lastFrameMs = nowMs

      const width = canvas.width
      const height = canvas.height

      ctx.fillStyle = 'rgba(0, 0, 0, 0.22)'
      ctx.fillRect(0, 0, width, height)

      for (let i = 0; i < columns.length; i += 1) {
        const col = columns[i]
        if (!col) continue

        const headChar = CHARS[randInt(0, CHARS.length - 1)] || 'A'
        col.tail = [headChar, ...col.tail.slice(0, TAIL_LEN - 1)]
        col.y += col.speed

        for (let t = 0; t < col.tail.length; t += 1) {
          const ch = col.tail[t]
          if (!ch || ch === ' ') continue

          const yPos = col.y - t * FONT_SIZE
          if (yPos < -FONT_SIZE || yPos > height + FONT_SIZE) continue

          ctx.fillStyle = t === 0 ? '#ccffcc' : shades[t] || '#2b6f2b'
          ctx.fillText(ch, col.x, yPos)
        }

        if (col.y - TAIL_LEN * FONT_SIZE > height + FONT_SIZE) {
          col.y = randInt(-height, 0)
          col.speed = randInt(SPEED_MIN, SPEED_MAX)
          col.tail = new Array(TAIL_LEN).fill(' ')
        }
      }

      rafId = window.requestAnimationFrame(drawFrame)
    }

    resize()
    window.addEventListener('resize', resize)
    rafId = window.requestAnimationFrame(drawFrame)

    return () => {
      window.removeEventListener('resize', resize)
      if (rafId) {
        window.cancelAnimationFrame(rafId)
      }
    }
  }, [])

  const renderGlitchLine = (lineIndex: number) => {
    const line = copyLines[lineIndex] || ''
    const typed = typedCounts[lineIndex] || 0
    const resolved = resolvedCounts[lineIndex] || 0
    if (typed < 1) return ''

    const chars = line.split('')
    const output: string[] = []

    for (let i = 0; i < typed; i += 1) {
      if (i < resolved) {
        output.push(chars[i] || '')
      } else {
        const next = glitchChars[(scrambleTick * 13 + lineIndex * 29 + i * 17) % glitchChars.length] || 'X'
        output.push(next)
      }
    }

    return output.join('')
  }

  const continueToScene = () => {
    recordInteraction({
      type: 'click',
      scene: '/scene/chapter-ii',
      target: 'continue-to-language-area',
      timestamp: Date.now(),
    })
    navigate('/scene/language-area')
  }

  return (
    <section
      className="chapter-ii-scene"
      aria-label={isZh ? '第二章节过渡' : 'Chapter II transition'}
      role="button"
      tabIndex={0}
      onClick={continueToScene}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return
        event.preventDefault()
        continueToScene()
      }}
    >
      {snapshotUrl ? (
        <img
          className="chapter-ii-camera-frame"
          src={snapshotUrl}
          alt={isZh ? '上一阶段摄像头画面' : 'Captured camera frame from previous chapter'}
        />
      ) : null}

      <canvas ref={canvasRef} className="chapter-ii-matrix" />

      <div className="chapter-ii-copy" aria-live="polite">
        <p className="chapter-ii-chapter">{renderGlitchLine(0)}</p>
        <h1 className="chapter-ii-title">{renderGlitchLine(1)}</h1>
      </div>

      <p className="chapter-ii-continue-hint">{renderGlitchLine(2)}</p>
    </section>
  )
}
