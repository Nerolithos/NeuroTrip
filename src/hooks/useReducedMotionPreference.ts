import { useEffect } from 'react'
import { useNeuroTripStore } from '../stores/neuroTripStore'

export const useReducedMotionPreference = () => {
  const setReducedMotion = useNeuroTripStore((state) => state.setReducedMotion)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')

    const applyPreference = (event: MediaQueryList | MediaQueryListEvent) => {
      setReducedMotion(event.matches)
    }

    applyPreference(mediaQuery)

    const handleChange = (event: MediaQueryListEvent) => applyPreference(event)
    mediaQuery.addEventListener('change', handleChange)

    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  }, [setReducedMotion])
}
