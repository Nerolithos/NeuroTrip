import { useEffect, useMemo, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LanguageToggle } from '../../components/LanguageToggle'
import { useNeuroTripStore } from '../../stores/neuroTripStore'
import { useUiLanguageStore } from '../../stores/uiLanguageStore'
import rawUsedByLanguageHtml from '../../../UsedByLanguage.html?raw'
import './revLingual.css'

declare global {
  interface Window {
    __UBL_LANG?: 'zh' | 'en'
    __UBL_API?: {
      setLang?: (next: 'zh' | 'en') => void
      destroy?: () => void
    }
    __UBL_NAVIGATE?: (to: string) => void
  }
}

type UsedByLanguageTemplate = {
  style: string
  body: string
  script: string
}

const parseUsedByLanguageTemplate = (raw: string): UsedByLanguageTemplate => {
  const styleMatch = raw.match(/<style>([\s\S]*?)<\/style>/i)
  const bodyMatch = raw.match(/<body[^>]*>([\s\S]*?)<script>/i)
  const scriptMatch = raw.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/i)

  if (!styleMatch || !bodyMatch || !scriptMatch) {
    throw new Error('UsedByLanguage.html template parsing failed')
  }

  return {
    style: styleMatch[1] ?? '',
    body: bodyMatch[1] ?? '',
    script: scriptMatch[1] ?? '',
  }
}

const TEMPLATE = parseUsedByLanguageTemplate(rawUsedByLanguageHtml)

const buildRuntimeStyle = (style: string) => {
  const scoped = style
    .replace('*{box-sizing:border-box;margin:0;padding:0}', '.ubl-experience, .ubl-experience *{box-sizing:border-box;margin:0;padding:0}')
    .replace('html,body{height:100%}', '.ubl-experience{height:100%}')
    .replace('body{', '.ubl-experience{')

  return `${scoped}

#langbtn { display: none !important; }
#field,
#vignette,
#stage,
#hud {
  top: var(--ubl-top-offset, 0px) !important;
}

#field,
#vignette,
#stage {
  bottom: 0 !important;
}

#hud {
  padding-top: 14px !important;
}
`
}

export const RevLingualScene = () => {
  const navigate = useNavigate()
  const language = useUiLanguageStore((state) => state.language)
  const isZh = language === 'zh'
  const setCurrentScene = useNeuroTripStore((state) => state.setCurrentScene)
  const recordInteraction = useNeuroTripStore((state) => state.recordInteraction)
  const topbarRef = useRef<HTMLDivElement | null>(null)
  const experienceRef = useRef<HTMLDivElement | null>(null)
  const runtimeStyle = useMemo(() => buildRuntimeStyle(TEMPLATE.style), [])

  useEffect(() => {
    setCurrentScene('/scene/rev-lingual')
    recordInteraction({ type: 'scene-enter', scene: '/scene/rev-lingual', timestamp: Date.now() })

    return () => {
      recordInteraction({ type: 'scene-exit', scene: '/scene/rev-lingual', timestamp: Date.now() })
    }
  }, [recordInteraction, setCurrentScene])

  useEffect(() => {
    const syncTopOffset = () => {
      const topbarBottom = topbarRef.current?.getBoundingClientRect().bottom ?? 0
      const offset = Math.max(0, Math.round(topbarBottom + 8))
      document.documentElement.style.setProperty('--ubl-top-offset', `${offset}px`)
    }

    syncTopOffset()
    window.addEventListener('resize', syncTopOffset)

    return () => {
      window.removeEventListener('resize', syncTopOffset)
      document.documentElement.style.removeProperty('--ubl-top-offset')
    }
  }, [language, topbarRef])

  useEffect(() => {
    const host = experienceRef.current
    if (!host) return

    window.__UBL_LANG = language
    host.innerHTML = `<style id="ubl-runtime-style">${runtimeStyle}</style>${TEMPLATE.body}`

    const scriptEl = document.createElement('script')
    scriptEl.type = 'text/javascript'
    scriptEl.textContent = `(function(){\n${TEMPLATE.script}\n})();`
    host.appendChild(scriptEl)

    return () => {
      window.__UBL_API?.destroy?.()
      delete window.__UBL_API
      host.innerHTML = ''
    }
  }, [experienceRef, runtimeStyle])

  useEffect(() => {
    window.__UBL_LANG = language
    window.__UBL_API?.setLang?.(language)
  }, [language])

  useEffect(() => {
    window.__UBL_NAVIGATE = (to: string) => {
      navigate(to)
    }

    return () => {
      delete window.__UBL_NAVIGATE
    }
  }, [navigate])

  return (
    <section className="rev-lingual-page">
      <header className="scene-topbar rev-lingual-topbar" ref={topbarRef}>
        <button
          type="button"
          className="ghost-button"
          aria-label={isZh ? '返回上一场景' : 'Back to previous scene'}
          onClick={() => navigate('/scene/language-area')}
        >
          {isZh ? '返回' : 'Back'}
        </button>

        <p className="scene-status rev-lingual-status">
          {isZh ? '语言的边界 · The Limits of My Language' : 'The Limits of My Language · 语言的边界'}
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

      <div className="rev-lingual-stage">
        <div className="ubl-experience" ref={experienceRef} />
      </div>
    </section>
  )
}
