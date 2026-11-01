'use client'

import { useEffect, useRef } from 'react'

interface Ripple {
  x: number
  y: number
  radius: number
  maxRadius: number
}

export default function ZimaCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const parent = canvas?.parentElement
    const context = canvas?.getContext('2d')
    if (!canvas || !parent || !context) return

    let width = 0
    let height = 0
    let pool = { x: 0, y: 0, width: 0, height: 0 }
    let robot = { x: 0, y: 0, targetX: 0, targetY: 0, hasTarget: false }
    let animationFrame = 0
    let lastTime = performance.now()
    const ripples: Ripple[] = []
    const caustics = Array.from({ length: 22 }, (_, index) => ({
      phase: index * 1.71,
      x: Math.random(),
      y: Math.random(),
      radius: 10 + Math.random() * 16,
    }))

    const resize = () => {
      const rect = parent.getBoundingClientRect()
      const ratio = window.devicePixelRatio || 1
      width = rect.width
      height = rect.height
      canvas.width = Math.max(1, Math.floor(width * ratio))
      canvas.height = Math.max(1, Math.floor(height * ratio))
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
      pool = {
        x: width * 0.06,
        y: height * 0.04,
        width: width * 0.88,
        height: height * 0.92,
      }
      robot = {
        x: pool.x + pool.width * 0.25,
        y: pool.y + pool.height * 0.35,
        targetX: 0,
        targetY: 0,
        hasTarget: false,
      }
    }

    const handleClick = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      if (x < pool.x || x > pool.x + pool.width || y < pool.y || y > pool.y + pool.height) return
      robot.targetX = x
      robot.targetY = y
      robot.hasTarget = true
      ripples.push({ x, y, radius: 3, maxRadius: 28 + Math.random() * 24 })
    }

    const draw = (time: number) => {
      const delta = Math.min(40, time - lastTime)
      lastTime = time
      context.clearRect(0, 0, width, height)
      context.fillStyle = 'rgba(255,255,255,0.025)'
      context.fillRect(pool.x, pool.y, pool.width, pool.height)

      context.save()
      context.beginPath()
      context.roundRect(pool.x, pool.y, pool.width, pool.height, 6)
      context.clip()

      const tile = Math.max(18, Math.min(28, pool.width / 9))
      context.strokeStyle = 'rgba(255,255,255,0.09)'
      context.lineWidth = 0.6
      for (let x = pool.x; x <= pool.x + pool.width; x += tile) {
        context.beginPath()
        context.moveTo(x, pool.y)
        context.lineTo(x, pool.y + pool.height)
        context.stroke()
      }
      for (let y = pool.y; y <= pool.y + pool.height; y += tile) {
        context.beginPath()
        context.moveTo(pool.x, y)
        context.lineTo(pool.x + pool.width, y)
        context.stroke()
      }

      for (const caustic of caustics) {
        const wave = Math.sin(time * 0.0012 + caustic.phase) * 0.5 + 0.5
        const x = pool.x + caustic.x * pool.width + Math.sin(time * 0.0005 + caustic.phase) * 8
        const y = pool.y + caustic.y * pool.height + Math.cos(time * 0.0007 + caustic.phase) * 6
        context.beginPath()
        context.ellipse(x, y, caustic.radius * (0.7 + wave * 0.5), caustic.radius * 0.6, wave, 0, Math.PI * 2)
        context.fillStyle = `rgba(255,255,255,${0.025 + wave * 0.05})`
        context.fill()
      }
      context.restore()

      context.strokeStyle = 'rgba(255,255,255,0.4)'
      context.lineWidth = 2
      context.beginPath()
      context.roundRect(pool.x, pool.y, pool.width, pool.height, 6)
      context.stroke()

      if (robot.hasTarget) {
        const dx = robot.targetX - robot.x
        const dy = robot.targetY - robot.y
        const distance = Math.hypot(dx, dy)
        const step = Math.min(distance, delta * 0.08)
        if (distance > 1) {
          robot.x += (dx / distance) * step
          robot.y += (dy / distance) * step
        } else {
          robot.hasTarget = false
        }
      } else {
        robot.x += Math.sin(time * 0.00035) * delta * 0.012
        robot.y += Math.cos(time * 0.00028) * delta * 0.01
      }

      context.fillStyle = 'rgba(255,255,255,0.85)'
      context.fillRect(robot.x - 9, robot.y - 6, 18, 12)
      context.fillStyle = 'rgba(0,0,0,0.8)'
      context.fillRect(robot.x - 4, robot.y - 3, 8, 6)

      for (let index = ripples.length - 1; index >= 0; index -= 1) {
        const ripple = ripples[index]
        ripple.radius += delta * 0.04
        const alpha = Math.max(0, 1 - ripple.radius / ripple.maxRadius)
        context.strokeStyle = `rgba(255,255,255,${alpha * 0.35})`
        context.lineWidth = 1
        context.beginPath()
        context.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2)
        context.stroke()
        if (ripple.radius >= ripple.maxRadius) ripples.splice(index, 1)
      }

      animationFrame = window.requestAnimationFrame(draw)
    }

    resize()
    canvas.addEventListener('click', handleClick)
    window.addEventListener('resize', resize)
    animationFrame = window.requestAnimationFrame(draw)

    return () => {
      window.cancelAnimationFrame(animationFrame)
      canvas.removeEventListener('click', handleClick)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={canvasRef} className="zima-canvas" aria-label="Zima Blue 池面动画" />
}
