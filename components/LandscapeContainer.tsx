'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import landscapes from '@/lib/landscapes.json'

export default function LandscapeContainer() {
  const [currentIndex, setCurrentIndex] = useState<number>(0)
  const [isAnimating, setIsAnimating] = useState(false)

  // 首次加载随机选择
  useEffect(() => {
    const animationFrame = window.requestAnimationFrame(() => {
      setCurrentIndex(Math.floor(Math.random() * landscapes.length))
    })
    return () => window.cancelAnimationFrame(animationFrame)
  }, [])

  const handleNext = () => {
    if (isAnimating) return
    setIsAnimating(true)

    // 随机选择下一张（避免重复）
    let nextIndex
    do {
      nextIndex = Math.floor(Math.random() * landscapes.length)
    } while (nextIndex === currentIndex && landscapes.length > 1)

    setCurrentIndex(nextIndex)

    setTimeout(() => {
      setIsAnimating(false)
    }, 1000) // 动画时长
  }

  const currentLandscape = landscapes[currentIndex]

  return (
    <div className="landscape-stage">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{
            duration: 1.2,
            ease: [0.4, 0, 0.2, 1], // 更明显的阻尼感
          }}
          className="landscape-frame"
        >
          <Image
            src={currentLandscape.url}
            alt={currentLandscape.title}
            fill
            sizes="100vw"
            priority={currentIndex === 0}
            unoptimized
            className="landscape-image"
          />
        </motion.div>
      </AnimatePresence>

      <button
        onClick={handleNext}
        disabled={isAnimating}
        className="landscape-next"
      >
        下一站
      </button>
    </div>
  )
}
