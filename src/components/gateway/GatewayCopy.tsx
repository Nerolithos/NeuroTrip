import { motion } from 'framer-motion'
import type { RefObject } from 'react'
import { useUiLanguageStore } from '../../stores/uiLanguageStore'

type GatewayCopyProps = {
  ctaRef: RefObject<HTMLButtonElement | null>
  nodeCount: number
  reducedMotion: boolean
  isLaunching: boolean
  onBegin: () => void
  onCtaEngage: () => void
  onCtaDisengage: () => void
}

const animatedTransition = { duration: 0.44, ease: 'easeOut' as const }

export const GatewayCopy = ({
  ctaRef,
  nodeCount,
  reducedMotion,
  isLaunching,
  onBegin,
  onCtaEngage,
  onCtaDisengage,
}: GatewayCopyProps) => {
  const language = useUiLanguageStore((state) => state.language)
  const isZh = language === 'zh'

  return (
    <div className="gateway-copy">
      <motion.p
        className="gateway-kicker-text"
        initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 7 }}
        animate={{ opacity: 1, y: 0 }}
        transition={animatedTransition}
      >
        {isZh ? '欢迎，旅者。' : 'WELCOME, TRAVELER.'}
      </motion.p>

      <motion.h1
        className="gateway-title-text"
        initial={
          reducedMotion ? { opacity: 0 } : { opacity: 0, filter: 'blur(6px)', letterSpacing: '0.2em' }
        }
        animate={{ opacity: 1, filter: 'blur(0px)', letterSpacing: '0.02em' }}
        transition={{ ...animatedTransition, delay: reducedMotion ? 0.06 : 0.1 }}
      >
        NeuroTrip
      </motion.h1>

      <motion.h2
        className="gateway-subtitle-text"
        initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...animatedTransition, delay: reducedMotion ? 0.12 : 0.2 }}
      >
        {isZh ? '意识的万花筒' : 'A Kaleidoscope of Consciousness'}
      </motion.h2>

      <motion.p
        className="gateway-lines"
        initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...animatedTransition, delay: reducedMotion ? 0.16 : 0.28 }}
      >
        {isZh ? '进入那台'
        : 'Enter the machinery'}
        <br />
        {isZh ? '塑造你现实的机器。' : 'that constructs your reality.'}
      </motion.p>

      <motion.p
        className="gateway-microcopy"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ ...animatedTransition, delay: reducedMotion ? 0.2 : 0.38 }}
      >
        {isZh
          ? '5-7 分钟 · 感知可能扭曲 · 科学准确性为近似表达'
          : '5-7 minutes · perception may distort · scientific accuracy partially intact'}
      </motion.p>

      <motion.button
        ref={ctaRef}
        type="button"
        className={`gateway-cta ${isLaunching ? 'is-launching' : ''}`}
        aria-label={isZh ? '开始 NeuroTrip' : 'Begin the neuro trip'}
        disabled={isLaunching}
        initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...animatedTransition, delay: reducedMotion ? 0.24 : 0.5 }}
        onMouseEnter={onCtaEngage}
        onMouseLeave={onCtaDisengage}
        onFocus={onCtaEngage}
        onBlur={onCtaDisengage}
        onClick={onBegin}
      >
        <span>{isZh ? '开始旅程' : 'BEGIN THE TRIP'}</span>
        <i aria-hidden="true">→</i>
      </motion.button>

      <motion.p
        className="gateway-assist"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ ...animatedTransition, delay: reducedMotion ? 0.28 : 0.66 }}
      >
        {isZh ? '意识不是一张图像，而是流动中的信号。' : 'Consciousness is not a picture. It is a signal in motion.'}
      </motion.p>

      <p className="gateway-statusline">
        {isZh
          ? `信号在线 / ${nodeCount} 节点 / 非临床模拟`
          : `SIGNAL ONLINE / ${nodeCount} NODES / NON-CLINICAL SIMULATION`}
      </p>
    </div>
  )
}
