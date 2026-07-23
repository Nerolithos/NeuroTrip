import { useEffect, useRef } from 'react'
import type { JourneySignature } from '../../types/neuro'
import { createSeededRandom } from '../../utils/seededRandom'

type KaleidoscopeCanvasProps = {
  seed: number
  signature: JourneySignature
  reducedMotion: boolean
}

const WAVE_PALETTE = ['#f25f4c', '#ffe066', '#50c9ce', '#7fd18b', '#f3f5f7']

export const KaleidoscopeCanvas = ({
  seed,
  signature,
  reducedMotion,
}: KaleidoscopeCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }

    const context = canvas.getContext('2d')
    if (!context) {
      return
    }

    let animationFrame = 0
    let phase = 0

    const resize = () => {
      const parent = canvas.parentElement
      const width = Math.max(320, parent?.clientWidth ?? 560)
      const height = 320
      const pixelRatio = window.devicePixelRatio || 1

      canvas.width = width * pixelRatio
      canvas.height = height * pixelRatio
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
    }

    const draw = () => {
      const width = canvas.clientWidth
      const height = canvas.clientHeight
      const cx = width / 2
      const cy = height / 2
      const random = createSeededRandom(seed + Math.floor(phase * 20))
      const sectors = 12

      context.fillStyle = '#05070a'
      context.fillRect(0, 0, width, height)

      for (let sector = 0; sector < sectors; sector += 1) {
        const angle = (Math.PI * 2 * sector) / sectors + phase * 0.12
        const branchCount = 9 + Math.floor(signature.curiosity * 6)

        for (let branch = 0; branch < branchCount; branch += 1) {
          const distance = 16 + branch * (15 + signature.memorySeeking * 10)
          const wobble = (random() - 0.5) * (22 + signature.threatSensitive * 20)
          const radius = distance + wobble
          const x = cx + Math.cos(angle) * radius
          const y = cy + Math.sin(angle) * radius
          const size = 2 + random() * (5 + signature.habitResistance * 4)

          context.beginPath()
          context.fillStyle =
            WAVE_PALETTE[(branch + sector) % WAVE_PALETTE.length] ?? '#f3f5f7'
          context.globalAlpha = 0.16 + random() * 0.5
          context.arc(x, y, size, 0, Math.PI * 2)
          context.fill()
        }
      }

      context.globalAlpha = 1
      context.strokeStyle = 'rgba(255, 255, 255, 0.25)'
      context.lineWidth = 1
      context.beginPath()
      context.arc(cx, cy, 24 + signature.curiosity * 48, 0, Math.PI * 2)
      context.stroke()

      if (!reducedMotion) {
        phase += 0.014
        animationFrame = window.requestAnimationFrame(draw)
      }
    }

    resize()
    draw()

    if (!reducedMotion) {
      animationFrame = window.requestAnimationFrame(draw)
    }

    window.addEventListener('resize', resize)
    return () => {
      window.removeEventListener('resize', resize)
      window.cancelAnimationFrame(animationFrame)
    }
  }, [reducedMotion, seed, signature.curiosity, signature.habitResistance, signature.memorySeeking, signature.threatSensitive])

  return <canvas className="kaleidoscope-canvas" ref={canvasRef} aria-label="Generated neural kaleidoscope" />
}
