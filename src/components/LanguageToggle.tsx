import { useUiLanguageStore } from '../stores/uiLanguageStore'

type LanguageToggleProps = {
  className?: string
}

export const LanguageToggle = ({ className }: LanguageToggleProps) => {
  const language = useUiLanguageStore((state) => state.language)
  const setLanguage = useUiLanguageStore((state) => state.setLanguage)

  return (
    <div className={`language-toggle ${className ?? ''}`} role="group" aria-label="Language selection">
      <button
        type="button"
        className={language === 'en' ? 'active' : ''}
        aria-pressed={language === 'en'}
        onClick={() => setLanguage('en')}
      >
        EN
      </button>
      <button
        type="button"
        className={language === 'zh' ? 'active' : ''}
        aria-pressed={language === 'zh'}
        onClick={() => setLanguage('zh')}
      >
        中
      </button>
    </div>
  )
}
