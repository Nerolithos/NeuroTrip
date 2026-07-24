import { AnimatePresence, motion } from 'framer-motion'
import { type PropsWithChildren, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LanguageToggle } from './LanguageToggle'
import { useNeuroTripStore } from '../stores/neuroTripStore'
import { useUiLanguageStore } from '../stores/uiLanguageStore'
import type { RegionId } from '../types/neuro'

type SceneFrameProps = PropsWithChildren<{
  title: string
  subtitle: string
  regionId?: RegionId
  nextPath?: string
  previousPath?: string
}>

export const SceneFrame = ({
  title,
  subtitle,
  regionId,
  nextPath,
  previousPath,
  children,
}: SceneFrameProps) => {
  const location = useLocation()
  const navigate = useNavigate()
  const setCurrentScene = useNeuroTripStore((state) => state.setCurrentScene)
  const visitRegion = useNeuroTripStore((state) => state.visitRegion)
  const recordInteraction = useNeuroTripStore((state) => state.recordInteraction)
  const reducedMotion = useNeuroTripStore((state) => state.reducedMotion)
  const language = useUiLanguageStore((state) => state.language)
  const isZh = language === 'zh'

  useEffect(() => {
    setCurrentScene(location.pathname)
    recordInteraction({
      type: 'scene-enter',
      scene: location.pathname,
      timestamp: Date.now(),
    })

    if (regionId) {
      visitRegion(regionId)
    }

    return () => {
      recordInteraction({
        type: 'scene-exit',
        scene: location.pathname,
        timestamp: Date.now(),
      })
    }
  }, [location.pathname, recordInteraction, regionId, setCurrentScene, visitRegion])

  return (
    <div className="scene-shell">
      <header className="scene-topbar">
        <button
          type="button"
          className="ghost-button"
          aria-label={isZh ? '返回上一场景' : 'Back to previous scene'}
          onClick={() => {
            if (previousPath) {
              navigate(previousPath)
              return
            }
            navigate(-1)
          }}
        >
          {isZh ? '返回' : 'Back'}
        </button>
        <p className="scene-status">
          NeuroTrip
        </p>
        <div className="scene-links">
          <Link className="ghost-link" to="/map">
            {isZh ? '脑网络地图' : 'Brain Map'}
          </Link>
          <Link className="ghost-link" to="/sources">
            {isZh ? '参考来源' : 'Sources'}
          </Link>
          <LanguageToggle />
        </div>
      </header>

      <AnimatePresence mode="wait">
        <motion.main
          key={location.pathname}
          className="scene-main"
          initial={reducedMotion ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reducedMotion ? {} : { opacity: 0, y: -10 }}
          transition={{ duration: reducedMotion ? 0 : 0.42, ease: 'easeOut' }}
        >
          <section className="scene-heading">
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </section>

          <section className="scene-content">{children}</section>

          <footer className="scene-footer">
            <p className="disclaimer-inline">
              {isZh
                ? 'NeuroTrip 是受神经科学研究启发的艺术化教育可视化作品。它不是医疗诊断工具，交互效果是简化表达，不是脑功能的逐字面模拟。'
                : 'NeuroTrip is an artistic and educational visualization inspired by neuroscience research. It is not a medical diagnostic tool, and its interactive effects are simplified representations rather than literal simulations of brain function.'}
            </p>
            {nextPath ? (
              <Link
                className="primary-link"
                to={nextPath}
                aria-label={isZh ? '前往下一章节' : 'Continue to next chapter'}
              >
                {isZh ? '继续' : 'Continue'}
              </Link>
            ) : null}
          </footer>
        </motion.main>
      </AnimatePresence>
    </div>
  )
}
