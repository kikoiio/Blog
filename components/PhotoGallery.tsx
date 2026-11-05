'use client'

import { useEffect, useRef, useState } from 'react'

interface Photo {
  alt: string
  src: string
}

interface PhotoGalleryProps {
  photos: Photo[]
}

export default function PhotoGallery({ photos }: PhotoGalleryProps) {
  const [current, setCurrent] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const openButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!lightboxOpen) return

    const previousOverflow = document.body.style.overflow
    const openButton = openButtonRef.current
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event: KeyboardEvent) => {
      if (document.body.dataset.commandOpen === 'true') return
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        setCurrent((index) => (index - 1 + photos.length) % photos.length)
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        setCurrent((index) => (index + 1) % photos.length)
      } else if (event.key === 'Escape') {
        event.preventDefault()
        setLightboxOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    closeButtonRef.current?.focus()
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
      openButton?.focus()
    }
  }, [lightboxOpen, photos.length])

  if (photos.length === 0) {
    return <div className="t-line t-faint">这个相册还没有照片。</div>
  }

  const photo = photos[current]

  const openAt = (index: number) => {
    const button = document.activeElement
    if (button instanceof HTMLButtonElement) openButtonRef.current = button
    setCurrent(index)
    setLightboxOpen(true)
  }

  const prevPhoto = () => setCurrent((index) => (index - 1 + photos.length) % photos.length)
  const nextPhoto = () => setCurrent((index) => (index + 1) % photos.length)

  return (
    <div className="photo-gallery-container" aria-label="照片画廊">
      <div className="photo-masonry-grid">
        {photos.map((item, index) => (
          <button
            key={item.src}
            type="button"
            className="photo-thumb-card"
            onClick={() => openAt(index)}
            aria-label={`放大查看照片 ${index + 1}：${item.alt || '点击放大'}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.src} alt={item.alt} className="photo-thumb-img" draggable={false} />
            <span className="photo-thumb-overlay">
              <span className="zoom">[+]</span>
              <span className="alt">{item.alt}</span>
            </span>
          </button>
        ))}
      </div>

      {lightboxOpen && (
        <dialog
          open
          className="photo-lightbox-modal"
          aria-label={`照片 ${current + 1}，共 ${photos.length} 张`}
          aria-modal="true"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setLightboxOpen(false)
            }
          }}
        >
          <div className="lightbox-topbar">
            <span>
              -- 照片 {current + 1}/{photos.length} --
            </span>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={() => setLightboxOpen(false)}
              aria-label="关闭画廊预览"
            >
              [x]
            </button>
          </div>

          <figure className="lightbox-main-figure">
            <button
              className="lightbox-nav-arrow"
              type="button"
              onClick={prevPhoto}
              aria-label="上一张照片"
            >
              &lt;
            </button>
            <div className="lightbox-image-wrap">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.src} alt={photo.alt} className="lightbox-img" draggable={false} />
            </div>
            <button
              className="lightbox-nav-arrow"
              type="button"
              onClick={nextPhoto}
              aria-label="下一张照片"
            >
              &gt;
            </button>
            {photo.alt && <figcaption className="lightbox-caption">{photo.alt}</figcaption>}
          </figure>
        </dialog>
      )}
    </div>
  )
}
