'use client'

import { useEffect, useState } from 'react'

interface Photo {
  alt: string
  src: string
}

interface PhotoGalleryProps {
  photos: Photo[]
}

export default function PhotoGallery({ photos }: PhotoGalleryProps) {
  const [current, setCurrent] = useState(0)
  const [zoomed, setZoomed] = useState(false)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        setCurrent((index) => (index - 1 + photos.length) % photos.length)
        setZoomed(false)
      } else if (event.key === 'ArrowRight') {
        setCurrent((index) => (index + 1) % photos.length)
        setZoomed(false)
      } else if (event.key === 'Escape') {
        setZoomed(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [photos.length])

  if (photos.length === 0) {
    return <p className="muted">这个相册还没有照片。</p>
  }

  const photo = photos[current]

  return (
    <div className="photo-gallery" aria-label="照片浏览器">
      <div className="photo-gallery-stage">
        {/* The original photographs have mixed dimensions, so native layout preserves their aspect ratios. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.src}
          alt={photo.alt}
          className={`photo-gallery-image${zoomed ? ' is-zoomed' : ''}`}
          draggable={false}
          onClick={() => setZoomed((value) => !value)}
        />
      </div>

      <div className="photo-gallery-controls">
        <button type="button" onClick={() => { setCurrent((index) => (index - 1 + photos.length) % photos.length); setZoomed(false) }} aria-label="上一张">
          ←
        </button>
        <span aria-live="polite">{current + 1} / {photos.length}</span>
        <button type="button" onClick={() => { setCurrent((index) => (index + 1) % photos.length); setZoomed(false) }} aria-label="下一张">
          →
        </button>
      </div>
      <p className="photo-gallery-hint">点击照片缩放，方向键切换，Esc 还原</p>
    </div>
  )
}
