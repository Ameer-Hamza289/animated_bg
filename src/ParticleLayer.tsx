import { useEffect, useMemo, useRef } from 'react'

type Particle = {
  x: number
  y: number
  radius: number
  baseRadius: number
  alpha: number
  vx: number
  vy: number
  glow: number
  twinkleSpeed: number
  twinklePhase: number
  sparkleFrames: number
  colorR: number
  colorG: number
  colorB: number
  variant: 'purple' | 'blue' | 'white'
}

const PURPLE_HEX = '#4B2A8B'
const BLUE_HEX = '#4BA3FF'
const PARTICLE_COUNT_DESKTOP = 64
const PARTICLE_COUNT_MOBILE = 36

function hexToRgb(hex: string) {
  const clean = hex.replace('#', '')
  const bigint = parseInt(clean, 16)
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  }
}

function mixRgb(
  r1: number,
  g1: number,
  b1: number,
  r2: number,
  g2: number,
  b2: number,
  t: number,
) {
  const clamp = (v: number) => Math.max(0, Math.min(255, v))
  return {
    r: clamp(Math.round(r1 + (r2 - r1) * t)),
    g: clamp(Math.round(g1 + (g2 - g1) * t)),
    b: clamp(Math.round(b1 + (b2 - b1) * t)),
  }
}

export default function ParticleLayer() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const particlesRef = useRef<Particle[]>([])
  const animationRef = useRef<number | null>(null)
  const reducedMotion = useMemo(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const resize = () => {
      const { innerWidth, innerHeight } = window
      canvas.width = Math.floor(innerWidth * dpr)
      canvas.height = Math.floor(innerHeight * dpr)
      canvas.style.width = `${innerWidth}px`
      canvas.style.height = `${innerHeight}px`
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctxRef.current = ctx
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    const isMobile = window.matchMedia('(max-width: 768px)').matches
    const count = isMobile ? PARTICLE_COUNT_MOBILE : PARTICLE_COUNT_DESKTOP

    const speedBase = 0.03

    // Initialize colored stars: purple, blue, soft white
    const particles: Particle[] = new Array(count).fill(0).map(() => {
      const radius = 1.2 + Math.random() * 2.0
      const speed = speedBase + Math.random() * 0.08
      const direction = Math.random() * Math.PI * 2
      // Choose variant with weights
      const roll = Math.random()
      let variant: Particle['variant'] = 'purple'
      if (roll < 0.45) variant = 'purple'
      else if (roll < 0.80) variant = 'blue'
      else variant = 'white'

      const { r: pr, g: pg, b: pb } = hexToRgb(PURPLE_HEX)
      const { r: br, g: bg, b: bb } = hexToRgb(BLUE_HEX)
      const cr = variant === 'purple' ? pr : variant === 'blue' ? br : 255
      const cg = variant === 'purple' ? pg : variant === 'blue' ? bg : 255
      const cb = variant === 'purple' ? pb : variant === 'blue' ? bb : 255
      return {
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        radius,
        baseRadius: radius,
        alpha: 0.2 + Math.random() * 0.2,
        vx: Math.cos(direction) * speed,
        vy: Math.sin(direction) * speed,
        glow: 5 + Math.random() * 6,
        twinkleSpeed: 0.02 + Math.random() * 0.04,
        twinklePhase: Math.random() * Math.PI * 2,
        sparkleFrames: 0,
        colorR: cr,
        colorG: cg,
        colorB: cb,
        variant,
      }
    })
    particlesRef.current = particles

    let t = 0

    const draw = () => {
      const ctx = ctxRef.current
      if (!ctx) return
      const width = window.innerWidth
      const height = window.innerHeight
      ctx.clearRect(0, 0, width, height)

      for (const p of particlesRef.current) {
        // Twinkle and rare sparkle
        const twinkle = 0.75 + 0.25 * Math.sin(t * p.twinkleSpeed + p.twinklePhase)
        let effectiveAlpha = p.alpha * twinkle
        let r = p.baseRadius
        if (p.sparkleFrames > 0) {
          effectiveAlpha *= 1.6
          r *= 1.25
          p.sparkleFrames -= 1
        } else if (Math.random() < 0.0035) {
          p.sparkleFrames = 6 + Math.floor(Math.random() * 8)
        }

        // Gentle drift
        p.x += p.vx
        p.y += p.vy

        // Wrap around edges
        if (p.x < -20) p.x = width + 20
        if (p.x > width + 20) p.x = -20
        if (p.y < -20) p.y = height + 20
        if (p.y > height + 20) p.y = -20

        // Colored glow aura
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * p.glow)
        const auraAlpha = (p.variant === 'white' ? 0.18 : 0.24) * effectiveAlpha
        gradient.addColorStop(0, `rgba(${p.colorR}, ${p.colorG}, ${p.colorB}, ${auraAlpha})`)
        gradient.addColorStop(1, `rgba(${p.colorR}, ${p.colorG}, ${p.colorB}, 0)`)
        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(p.x, p.y, r * p.glow, 0, Math.PI * 2)
        ctx.fill()

        // Star core: white for white variant, softly tinted for colored variants
        const coreColor =
          p.variant === 'white'
            ? { r: 255, g: 255, b: 255 }
            : mixRgb(255, 255, 255, p.colorR, p.colorG, p.colorB, 0.35)
        const shadowColor =
          p.variant === 'white'
            ? { r: 255, g: 255, b: 255 }
            : mixRgb(255, 255, 255, p.colorR, p.colorG, p.colorB, 0.2)
        ctx.shadowColor = `rgba(${shadowColor.r}, ${shadowColor.g}, ${shadowColor.b}, ${Math.min(0.6, effectiveAlpha + 0.1)})`
        ctx.shadowBlur = 6
        ctx.fillStyle = `rgba(${coreColor.r}, ${coreColor.g}, ${coreColor.b}, ${Math.min(0.9, effectiveAlpha + 0.18)})`
        ctx.beginPath()
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0

        // Optional subtle cross glint (very faint)
        if (effectiveAlpha > 0.28) {
          const glint = mixRgb(255, 255, 255, p.colorR, p.colorG, p.colorB, p.variant === 'white' ? 0 : 0.15)
          ctx.strokeStyle = `rgba(${glint.r}, ${glint.g}, ${glint.b}, ${effectiveAlpha * 0.12})`
          ctx.lineWidth = 0.5
          ctx.beginPath()
          ctx.moveTo(p.x - r * 1.8, p.y)
          ctx.lineTo(p.x + r * 1.8, p.y)
          ctx.moveTo(p.x, p.y - r * 1.8)
          ctx.lineTo(p.x, p.y + r * 1.8)
          ctx.stroke()
        }
      }

      t += 1
      animationRef.current = requestAnimationFrame(draw)
    }

    if (!reducedMotion) {
      draw()
    }

    return () => {
      window.removeEventListener('resize', resize)
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <canvas className="particle-layer" ref={canvasRef} />
}


