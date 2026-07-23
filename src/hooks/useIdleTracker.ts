import { useEffect, useRef } from 'react'
import { useNeuroTripStore } from '../stores/neuroTripStore'

const IDLE_RESET_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart']

export const useIdleTracker = () => {
  const setIdleDuration = useNeuroTripStore((state) => state.setIdleDuration)
  const recordInteraction = useNeuroTripStore((state) => state.recordInteraction)
  const currentScene = useNeuroTripStore((state) => state.currentScene)
  const idleSecondsRef = useRef(0)

  useEffect(() => {
    const interval = window.setInterval(() => {
      idleSecondsRef.current += 1
      setIdleDuration(idleSecondsRef.current)

      if (idleSecondsRef.current % 4 === 0) {
        recordInteraction({
          type: 'idle-shift',
          scene: currentScene,
          timestamp: Date.now(),
          value: idleSecondsRef.current,
        })
      }
    }, 1000)

    const resetIdle = () => {
      idleSecondsRef.current = 0
      setIdleDuration(0)
    }

    IDLE_RESET_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, resetIdle, { passive: true })
    })

    return () => {
      window.clearInterval(interval)
      IDLE_RESET_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, resetIdle)
      })
    }
  }, [currentScene, recordInteraction, setIdleDuration])
}
