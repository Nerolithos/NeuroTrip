import { useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNeuroTripStore } from '../../stores/neuroTripStore'
import { useUiLanguageStore } from '../../stores/uiLanguageStore'
import rawMemoryGameHtml from '../../../Memory_game.html?raw'
import './memoryGame.css'

declare global {
  interface Window {
    __MEMORY_GAME_LANG?: 'zh' | 'en'
    __MEMORY_GAME_API?: {
      setLang?: (next: 'zh' | 'en') => void
      destroy?: () => void
    }
    __MEMORY_GAME_NAVIGATE?: (to: string) => void
    __MEMORY_GAME_SET_APP_LANG?: (next: 'zh' | 'en') => void
    __MEMORY_GAME_CONTINUE_PATH?: string
  }
}

type MemoryGameTemplate = {
  style: string
  body: string
  script: string
}

const parseMemoryGameTemplate = (raw: string): MemoryGameTemplate => {
  const styleMatch = raw.match(/<style>([\s\S]*?)<\/style>/i)
  const bodyMatch = raw.match(/<body[^>]*>([\s\S]*?)<script>/i)
  const scriptMatch = raw.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/i)

  if (!styleMatch || !bodyMatch || !scriptMatch) {
    throw new Error('Memory_game.html template parsing failed')
  }

  return {
    style: styleMatch[1] ?? '',
    body: bodyMatch[1] ?? '',
    script: scriptMatch[1] ?? '',
  }
}

const TEMPLATE = parseMemoryGameTemplate(rawMemoryGameHtml)

const buildRuntimeStyle = (style: string) => {
  const scoped = style
    .replace('*{box-sizing:border-box;margin:0;padding:0}', '.memory-game-experience, .memory-game-experience *{box-sizing:border-box;margin:0;padding:0}')
    .replace('html,body{height:100%}', '.memory-game-experience{height:100%}')
    .replace('body{', '.memory-game-experience{')

  return `${scoped}\n`
}

export const MemoryGameScene = () => {
  const navigate = useNavigate()
  const language = useUiLanguageStore((state) => state.language)
  const setLanguage = useUiLanguageStore((state) => state.setLanguage)
  const setCurrentScene = useNeuroTripStore((state) => state.setCurrentScene)
  const recordInteraction = useNeuroTripStore((state) => state.recordInteraction)
  const hostRef = useRef<HTMLDivElement | null>(null)
  const runtimeStyle = useMemo(() => buildRuntimeStyle(TEMPLATE.style), [])

  useEffect(() => {
    setCurrentScene('/scene/memory-game')
    recordInteraction({ type: 'scene-enter', scene: '/scene/memory-game', timestamp: Date.now() })

    return () => {
      recordInteraction({ type: 'scene-exit', scene: '/scene/memory-game', timestamp: Date.now() })
    }
  }, [recordInteraction, setCurrentScene])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    window.__MEMORY_GAME_LANG = language
    window.__MEMORY_GAME_CONTINUE_PATH = '/scene/chapter-iv'
    window.__MEMORY_GAME_NAVIGATE = (to: string) => {
      navigate(to)
    }
    window.__MEMORY_GAME_SET_APP_LANG = (next: 'zh' | 'en') => {
      setLanguage(next)
    }

    host.innerHTML = `<style id="memory-game-runtime-style">${runtimeStyle}</style>${TEMPLATE.body}`

    const scriptEl = document.createElement('script')
    scriptEl.type = 'text/javascript'
    scriptEl.textContent = `(function(){\n${TEMPLATE.script}\n})();`
    host.appendChild(scriptEl)

    return () => {
      window.__MEMORY_GAME_API?.destroy?.()
      delete window.__MEMORY_GAME_API
      delete window.__MEMORY_GAME_NAVIGATE
      delete window.__MEMORY_GAME_SET_APP_LANG
      delete window.__MEMORY_GAME_CONTINUE_PATH
      host.innerHTML = ''
    }
  }, [navigate, runtimeStyle, setLanguage])

  useEffect(() => {
    window.__MEMORY_GAME_LANG = language
    window.__MEMORY_GAME_API?.setLang?.(language)
  }, [language])

  return (
    <section className="memory-game-page">
      <div className="memory-game-stage">
        <div className="memory-game-experience" ref={hostRef} />
      </div>
    </section>
  )
}
