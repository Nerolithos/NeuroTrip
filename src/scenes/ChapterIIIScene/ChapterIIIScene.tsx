import { useEffect, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNeuroTripStore } from '../../stores/neuroTripStore'
import { useUiLanguageStore } from '../../stores/uiLanguageStore'
import memory1 from '../../assets/memory/1.webp'
import memory2 from '../../assets/memory/2.webp'
import memory3 from '../../assets/memory/3.webp'
import memory4 from '../../assets/memory/4.webp'
import memory5 from '../../assets/memory/5.webp'
import memory6 from '../../assets/memory/6.webp'
import memory7 from '../../assets/memory/7.webp'
import memory8 from '../../assets/memory/8.webp'
import memory9 from '../../assets/memory/9.webp'
import memory10 from '../../assets/memory/10.webp'
import memory11 from '../../assets/memory/11.webp'
import memory12 from '../../assets/memory/12.webp'
import './chapterIII.css'

type Polaroid = {
  id: string
  src: string
  altZh: string
  altEn: string
  island: 'a' | 'b' | 'c'
  orientation: 'portrait' | 'landscape'
  width: string
  fallX: string
  delay: string
  duration: string
}

const polaroids: Polaroid[] = [
  {
    id: 'p01',
    src: memory1,
    altZh: '旧时街景',
    altEn: 'Old street memory',
    island: 'a',
    orientation: 'portrait',
    width: 'clamp(7.8rem, 12vw, 9.4rem)',
    fallX: '-1.3vw',
    delay: '0s',
    duration: '9s',
  },
  {
    id: 'p02',
    src: memory2,
    altZh: '旧时合影',
    altEn: 'Old group photo',
    island: 'a',
    orientation: 'landscape',
    width: 'clamp(10.2rem, 15.6vw, 12.6rem)',
    fallX: '0.8vw',
    delay: '0.05s',
    duration: '9.4s',
  },
  {
    id: 'p03',
    src: memory3,
    altZh: '旧镇记忆',
    altEn: 'Old town memory',
    island: 'a',
    orientation: 'portrait',
    width: 'clamp(7.4rem, 11.8vw, 9rem)',
    fallX: '-0.9vw',
    delay: '0.1s',
    duration: '9.2s',
  },
  {
    id: 'p04',
    src: memory4,
    altZh: '旧时报刊图像',
    altEn: 'Vintage press image',
    island: 'a',
    orientation: 'landscape',
    width: 'clamp(10rem, 15.2vw, 12.4rem)',
    fallX: '1.1vw',
    delay: '0.15s',
    duration: '10.2s',
  },
  {
    id: 'p05',
    src: memory5,
    altZh: '旧车站影像',
    altEn: 'Old station memory',
    island: 'b',
    orientation: 'portrait',
    width: 'clamp(7.8rem, 12vw, 9.4rem)',
    fallX: '-1vw',
    delay: '0.2s',
    duration: '8.8s',
  },
  {
    id: 'p06',
    src: memory6,
    altZh: '旧展会影像',
    altEn: 'Old exhibition memory',
    island: 'b',
    orientation: 'portrait',
    width: 'clamp(8rem, 12.2vw, 9.6rem)',
    fallX: '0.7vw',
    delay: '0.25s',
    duration: '9.8s',
  },
  {
    id: 'p07',
    src: memory7,
    altZh: '旧课堂影像',
    altEn: 'Old classroom memory',
    island: 'b',
    orientation: 'portrait',
    width: 'clamp(7.5rem, 11.8vw, 9rem)',
    fallX: '-0.8vw',
    delay: '0.3s',
    duration: '9.1s',
  },
  {
    id: 'p08',
    src: memory8,
    altZh: '旧窗前景象',
    altEn: 'Old window memory',
    island: 'b',
    orientation: 'landscape',
    width: 'clamp(10.3rem, 15.8vw, 12.8rem)',
    fallX: '1.2vw',
    delay: '0.35s',
    duration: '9.7s',
  },
  {
    id: 'p09',
    src: memory9,
    altZh: '旧街道角落',
    altEn: 'Old street corner',
    island: 'c',
    orientation: 'landscape',
    width: 'clamp(10rem, 15.2vw, 12.2rem)',
    fallX: '-1.1vw',
    delay: '0.4s',
    duration: '9.4s',
  },
  {
    id: 'p10',
    src: memory10,
    altZh: '旧店铺画面',
    altEn: 'Old storefront memory',
    island: 'c',
    orientation: 'landscape',
    width: 'clamp(9.8rem, 14.8vw, 12rem)',
    fallX: '0.9vw',
    delay: '0.45s',
    duration: '9.6s',
  },
  {
    id: 'p11',
    src: memory11,
    altZh: '旧城市片段',
    altEn: 'Old city fragment',
    island: 'c',
    orientation: 'landscape',
    width: 'clamp(10.4rem, 16vw, 13rem)',
    fallX: '-0.7vw',
    delay: '0.5s',
    duration: '10s',
  },
  {
    id: 'p12',
    src: memory12,
    altZh: '旧时风景',
    altEn: 'Past landscape memory',
    island: 'c',
    orientation: 'portrait',
    width: 'clamp(7.8rem, 12vw, 9.3rem)',
    fallX: '1.3vw',
    delay: '0.55s',
    duration: '10.2s',
  },
]

const islands: Array<'a' | 'b' | 'c'> = ['a', 'b', 'c']

export const ChapterIIIScene = () => {
  const navigate = useNavigate()
  const language = useUiLanguageStore((state) => state.language)
  const isZh = language === 'zh'
  const setCurrentScene = useNeuroTripStore((state) => state.setCurrentScene)
  const recordInteraction = useNeuroTripStore((state) => state.recordInteraction)

  useEffect(() => {
    setCurrentScene('/scene/chapter-iii')
    recordInteraction({ type: 'scene-enter', scene: '/scene/chapter-iii', timestamp: Date.now() })

    return () => {
      recordInteraction({ type: 'scene-exit', scene: '/scene/chapter-iii', timestamp: Date.now() })
    }
  }, [recordInteraction, setCurrentScene])

  const continueToMemory = () => {
    recordInteraction({
      type: 'click',
      scene: '/scene/chapter-iii',
      target: 'continue-to-memory',
      timestamp: Date.now(),
    })
    navigate('/scene/hippocampus')
  }

  return (
    <section
      className="chapter-iii-scene"
      aria-label={isZh ? '第三章节过渡' : 'Chapter III transition'}
      role="button"
      tabIndex={0}
      onClick={continueToMemory}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return
        event.preventDefault()
        continueToMemory()
      }}
    >
      <div className="chapter-iii-paper-noise" aria-hidden="true" />

      <div className="chapter-iii-collage" aria-hidden="true">
        {islands.map((island) => (
          <div key={island} className={`chapter-iii-island chapter-iii-island-${island}`}>
            {polaroids
              .filter((item) => item.island === island)
              .map((item) => (
                <figure
                  key={item.id}
                  className={`chapter-iii-polaroid chapter-iii-polaroid-${item.orientation}`}
                  style={{
                    '--w': item.width,
                    '--photo-ratio': item.orientation === 'landscape' ? '4 / 3' : '3 / 4',
                    '--fall-x': item.fallX,
                    '--delay': item.delay,
                    '--duration': item.duration,
                  } as CSSProperties}
                >
                  <div className="chapter-iii-photo-window">
                    <img src={item.src} alt={isZh ? item.altZh : item.altEn} loading="lazy" referrerPolicy="no-referrer" />
                  </div>
                </figure>
              ))}
          </div>
        ))}
      </div>

      <div className="chapter-iii-copy" aria-live="polite">
        <p className="chapter-iii-chapter">{isZh ? '第三章' : 'Chapter III'}</p>
        <h1 className="chapter-iii-title">{isZh ? '回响' : 'The Echo'}</h1>
      </div>

      <p className="chapter-iii-continue-hint">{isZh ? '点击任意处继续' : 'Click Anywhere To Continue'}</p>
    </section>
  )
}
