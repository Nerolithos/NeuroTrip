import { useEffect, useMemo, useRef } from 'react'
import rawFearHtml from '../../../fear.html?raw'
import { useUiLanguageStore } from '../../stores/uiLanguageStore'
import './fearScene.css'

declare global {
  interface Window {
    __FEAR_LANG?: 'zh' | 'en'
    __FEAR_API?: {
      setLang?: (next: 'zh' | 'en') => void
      destroy?: () => void
    }
    __FEAR_SET_APP_LANG?: (next: 'zh' | 'en') => void
  }
}

type FearTemplate = {
  style: string
  body: string
  script: string
}

const parseFearTemplate = (raw: string): FearTemplate => {
  const styleMatch = raw.match(/<style>([\s\S]*?)<\/style>/i)
  const bodyMatch = raw.match(/<body[^>]*>([\s\S]*?)<script>/i)
  const scriptMatch = raw.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/i)

  if (!styleMatch || !bodyMatch || !scriptMatch) {
    throw new Error('fear.html template parsing failed')
  }

  return {
    style: styleMatch[1] ?? '',
    body: bodyMatch[1] ?? '',
    script: scriptMatch[1] ?? '',
  }
}

const TEMPLATE = parseFearTemplate(rawFearHtml)

const buildRuntimeStyle = (style: string) => {
  const scoped = style
    .replace('*{box-sizing:border-box;margin:0;padding:0}', '.fear-experience, .fear-experience *{box-sizing:border-box;margin:0;padding:0}')
    .replace('html,body{height:100%}', '.fear-experience{height:100%}')
    .replace('body{', '.fear-experience{')

  return `${scoped}\n`
}

export const FearScene = () => {
  const language = useUiLanguageStore((state) => state.language)
  const setLanguage = useUiLanguageStore((state) => state.setLanguage)
  const hostRef = useRef<HTMLDivElement | null>(null)
  const runtimeStyle = useMemo(() => buildRuntimeStyle(TEMPLATE.style), [])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    window.__FEAR_LANG = language
    window.__FEAR_SET_APP_LANG = (next: 'zh' | 'en') => {
      setLanguage(next)
    }

    host.innerHTML = `<style id="fear-runtime-style">${runtimeStyle}</style>${TEMPLATE.body}`

    const scriptEl = document.createElement('script')
    scriptEl.type = 'text/javascript'
    scriptEl.textContent = `(function(){\n${TEMPLATE.script}\n})();`
    host.appendChild(scriptEl)

    return () => {
      window.__FEAR_API?.destroy?.()
      delete window.__FEAR_API
      delete window.__FEAR_SET_APP_LANG
      host.innerHTML = ''
    }
  }, [runtimeStyle, setLanguage])

  useEffect(() => {
    window.__FEAR_LANG = language
    window.__FEAR_API?.setLang?.(language)
  }, [language])

  return (
    <section className="fear-page">
      <div className="fear-stage">
        <div className="fear-experience" ref={hostRef} />
      </div>
    </section>
  )
}
