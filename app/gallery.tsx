'use client'

import { useState, type CSSProperties } from 'react'
import Image from 'next/image'
import type { GalleryAlbum } from '../lib/gallery-types'
import styles from './page.module.css'

type GalleryStyle = CSSProperties & { '--controls-background': string }

export default function Gallery({ albums }: { albums: GalleryAlbum[] }) {
  const [photoIndex, setPhotoIndex] = useState(0)
  const [albumId, setAlbumId] = useState(albums[0]?.id ?? '')
  const album = albums.find((item) => item.id === albumId) ?? albums[0]
  const photos = album?.photos ?? []
  const activeIndex = Math.max(0, Math.min(photoIndex, photos.length - 1))
  const photo = photos[activeIndex]

  if (!album || !photo) {
    return <main className={styles.stage}><p className={styles.empty}>还没有图片作品</p></main>
  }
  const stageStyle: GalleryStyle = {
    backgroundColor: photo.backdrop,
    color: photo.ink,
    '--controls-background': `color-mix(in srgb, ${photo.backdrop} 80%, transparent)`,
  }

  return (
    <main className={styles.stage} style={stageStyle}>
      <div className={styles.panel} style={{ backgroundColor: photo.swatch }}>
        <section className={styles.gallery} aria-label={album.title}>
          <div className={styles.photoFrame}>
            <Image
              src={photo.src}
              alt={photo.alt}
              width={photo.width}
              height={photo.height}
              className={styles.photo}
              loading="eager"
            />
          </div>
          {albums.length > 1 && (
            <label className={styles.albumControl}>
              <span className={styles.srOnly}>选择相册</span>
              <select value={album.id} onChange={(event) => {
                setAlbumId(event.target.value)
                setPhotoIndex(0)
              }}>
                {albums.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
              </select>
            </label>
          )}
          <div className={styles.photoControls}>
            <button
              type="button"
              className={styles.photoArrow}
              aria-label="上一张图片"
              onClick={() => setPhotoIndex((activeIndex + photos.length - 1) % photos.length)}
            >
              ‹
            </button>
            {photos.length <= 4 && <div className={styles.photoDots}>
              {photos.map((photo, index) => (
                <button
                  key={photo.id}
                  type="button"
                  className={styles.photoDot}
                  aria-label={`查看第 ${index + 1} 张图片`}
                  aria-pressed={index === activeIndex}
                  onClick={() => setPhotoIndex(index)}
                />
              ))}
            </div>}
            <button
              type="button"
              className={styles.photoArrow}
              aria-label="下一张图片"
              onClick={() => setPhotoIndex((activeIndex + 1) % photos.length)}
            >
              ›
            </button>
            <span className={styles.photoCount} aria-live="polite" aria-atomic="true">
              {activeIndex + 1} / {photos.length}
            </span>
          </div>
        </section>
      </div>
    </main>
  )
}
