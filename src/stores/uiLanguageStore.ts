import { create } from 'zustand'

export type UiLanguage = 'en' | 'zh'

type UiLanguageState = {
  language: UiLanguage
  setLanguage: (language: UiLanguage) => void
  toggleLanguage: () => void
}

const STORAGE_KEY = 'neurotrip:ui-language'

const resolveInitialLanguage = (): UiLanguage => {
  if (typeof window === 'undefined') {
    return 'en'
  }

  const stored = window.localStorage.getItem(STORAGE_KEY)
  return stored === 'zh' ? 'zh' : 'en'
}

const persistLanguage = (language: UiLanguage) => {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(STORAGE_KEY, language)
}

export const useUiLanguageStore = create<UiLanguageState>((set) => ({
  language: resolveInitialLanguage(),
  setLanguage: (language) => {
    persistLanguage(language)
    set({ language })
  },
  toggleLanguage: () =>
    set((state) => {
      const nextLanguage = state.language === 'en' ? 'zh' : 'en'
      persistLanguage(nextLanguage)
      return { language: nextLanguage }
    }),
}))
