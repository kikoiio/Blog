'use client'

import { memo, useCallback, useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import type { GalleryAlbum, GalleryPhoto } from '../lib/gallery-types'
import { filmstripLayout, filmstripTransform } from '../lib/filmstrip-layout.mjs'
import { MOBILE_QUERY, gallerySwipeDirection, type GalleryAxis, type GallerySwipe } from '../lib/gallery-gestures'
import { heroImage, photoSources, sameFrameWindow, sameSettlement, requestedPhoto, settledPhoto, settledSource, thumbnailSource, type FilmstripMotion, type GalleryViewport, type SettledPhoto } from '../lib/gallery-performance'
import { currentAlbum, rememberAlbum, rememberPhoto, subscribeAlbum } from '../lib/gallery-navigation'
import styles from './page.module.css'

type PanelStyle = CSSProperties & { '--paint-reveal': number; '--panel-side': string }
type Frame = ReturnType<typeof filmstripLayout>[number]
type FilmstripView = { frames: Frame[]; activeIndex: number; moving: boolean; settled: SettledPhoto | null; requested: SettledPhoto | null }
type PhotographSource = { kind: 'responsive'; image: ReturnType<typeof heroImage> } | { kind: 'fixed'; src: string }

const clamp = (value: number) => Math.max(0, Math.min(1, value))
const smooth = (value: number) => value * value * (3 - 2 * value)
const positions = new Map<string, number>()
const emptyViewport: GalleryViewport = { width: 0, height: 0, dpr: 1, fit: 'cover' }

// Keep only a few detached decoded images, including in-flight requests. Live img
// nodes retain their own resource; eviction never changes a displayed photograph.
const decodedPhotos = new Map<string, { image: HTMLImageElement; promise: Promise<boolean> }>()
function decodePhoto(src: string): Promise<boolean> {
  const cached = decodedPhotos.get(src)
  if (cached) {
    decodedPhotos.delete(src)
    decodedPhotos.set(src, cached)
    return cached.promise
  }
  const image = new window.Image()
  image.decoding = 'async'
  image.fetchPriority = 'high'
  image.src = src
  const promise = image.decode().then(() => true, () => {
    if (decodedPhotos.get(src)?.image === image) decodedPhotos.delete(src)
    return false
  })
  decodedPhotos.set(src, { image, promise })
  while (decodedPhotos.size > 3) {
    const oldest = decodedPhotos.keys().next().value
    if (oldest === undefined) break
    const entry = decodedPhotos.get(oldest)
    decodedPhotos.delete(oldest)
    if (entry) entry.image.src = ''
  }
  return promise
}

const Photograph = memo(function Photograph({ image, active, hero, requested, isRequested }: {
  image: GalleryPhoto
  active: boolean
  hero: boolean
  requested: SettledPhoto | null
  isRequested: (target: SettledPhoto) => boolean
}) {
  const element = useRef<HTMLImageElement>(null)
  // A mounted, decoded photograph keeps its source through every gesture. Only
  // newly visible photographs start at 640; active-index changes do not reset it.
  const [source, setSource] = useState<PhotographSource>(() => hero
    ? { kind: 'responsive', image: heroImage(image) }
    : { kind: 'fixed', src: thumbnailSource(image) })

  useEffect(() => {
    // The initial responsive hero already has a browser-selected request. Do not
    // compete with it or add a second preload (React 19 can emit one itself).
    if (!requested || requested.revision === 0) return
    const next = settledSource(image, requested.viewport)
    const node = element.current
    if (node?.complete && node.naturalWidth > 0) {
      const currentSrc = node.currentSrc
      const current = photoSources(image).find(candidate => new URL(candidate.src, document.baseURI).href === currentSrc)
      if (current && current.width >= next.width) return
      if (new URL(next.src, document.baseURI).href === currentSrc) return
    }
    let cancelled = false
    void decodePhoto(next.src).then(decoded => {
      // A new destination invalidates the decode before React commits it.
      // The selected image can become sharp while its animation is running.
      if (decoded && !cancelled && isRequested(requested)) setSource({ kind: 'fixed', src: next.src })
    })
    return () => { cancelled = true }
  }, [image, requested, isRequested])

  const attributes = source.kind === 'responsive' ? source.image : { src: source.src }
  const upgrading = requested !== null && source.kind === 'fixed'
    && (photoSources(image).find(candidate => candidate.src === source.src)?.width ?? 0) < settledSource(image, requested.viewport).width
  return (
    // eslint-disable-next-line @next/next/no-img-element -- Next's unoptimized Image discards the archive's responsive srcSet.
    <img
      ref={element}
      {...attributes}
      alt={image.alt}
      aria-hidden={!active}
      width={image.width}
      height={image.height}
      className={styles.photo}
      loading="eager"
      fetchPriority={active && (source.kind === 'responsive' || requested) ? 'high' : 'auto'}
      decoding="async"
      data-upgrading={upgrading}
      draggable={false}
    />
  )
})

function paintFrame(node: HTMLAnchorElement, frame: Frame, axis: GalleryAxis) {
  node.style.transform = filmstripTransform(frame, axis)
  node.style.zIndex = String(frame.layer)
}

function useFilmstrip(photos: GalleryPhoto[], initialIndex: number) {
  const count = photos.length
  const viewport = useRef<HTMLElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const strip = useRef<HTMLDivElement>(null)
  const nodes = useRef(new Map<number, HTMLAnchorElement>())
  const dimensions = useRef(emptyViewport)
  const axis = useRef<GalleryAxis>('horizontal')
  const [view, setView] = useState<FilmstripView>(() => ({
    frames: filmstripLayout(initialIndex, 0, count, 0),
    activeIndex: initialIndex,
    moving: false,
    settled: { slot: initialIndex, revision: 0, viewport: emptyViewport },
    requested: null,
  }))
  const published = useRef(view)
  const layout = useRef(view.frames)
  const idleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const motion = useRef<FilmstripMotion & { frame: number; lastTime: number }>({
    position: initialIndex, target: initialIndex, zoom: 0, zoomTarget: 0,
    focus: false, revision: 0, frame: 0, lastTime: 0,
  })

  const paint = useCallback(() => {
    const state = motion.current
    const reveal = smooth(state.zoom)
    const frames = filmstripLayout(state.position, reveal, count,
      axis.current === 'vertical' ? dimensions.current.height : dimensions.current.width)
    layout.current = frames
    const activeIndex = Math.round(state.position)
    const moving = state.position !== state.target || state.zoom !== state.zoomTarget
    const settled = settledPhoto(state, dimensions.current)
    const requested = requestedPhoto(state, dimensions.current)
    const previous = published.current
    if (previous.activeIndex !== activeIndex || previous.moving !== moving
      || !sameFrameWindow(previous.frames, frames) || !sameSettlement(previous.settled, settled)
      || !sameSettlement(previous.requested, requested)) {
      const next = { frames, activeIndex, moving, settled, requested }
      published.current = next
      // Commit only discrete boundaries, before painting the new geometry. New
      // visible nodes/thumbnails and data-moving must land in the same paint.
      flushSync(() => setView(next))
    }
    const photo = photos[activeIndex]
    if (!photo) return
    const weight = (1 - reveal) * 100
    // All layout reads happened in ResizeObserver; this batch only writes styles.
    if (viewport.current) {
      viewport.current.style.backgroundColor = `color-mix(in srgb, ${photo.backdrop} ${weight}%, #e5e1e4)`
      viewport.current.style.color = `color-mix(in srgb, ${photo.ink} ${weight}%, #ededed)`
    }
    if (panel.current) {
      panel.current.style.backgroundColor = photo.swatch
      panel.current.style.setProperty('--paint-reveal', String(reveal))
      panel.current.style.setProperty('--panel-side', `color-mix(in srgb, ${photo.swatch} ${weight}%, #b4a0ad)`)
    }
    for (const frame of frames) {
      const node = nodes.current.get(frame.slot)
      if (node) paintFrame(node, frame, axis.current)
    }
  }, [count, photos])

  const tick = useCallback(function tick(time: number) {
    const state = motion.current
    const elapsed = Math.min(time - state.lastTime, 40)
    state.lastTime = time
    const blend = 1 - Math.exp(-elapsed / 110)
    const approach = (value: number, destination: number) => Math.abs(destination - value) < 0.0001
      ? destination : value + (destination - value) * blend
    state.position = approach(state.position, state.target)
    if (state.focus && Math.abs(state.position - state.target) < 0.015) {
      state.position = state.target
      state.focus = false
      state.zoomTarget = 0
    }
    state.zoom = approach(state.zoom, state.zoomTarget)
    paint()
    state.frame = state.position !== state.target || state.zoom !== state.zoomTarget
      ? requestAnimationFrame(tick) : 0
  }, [paint])

  const schedule = useCallback(() => {
    const state = motion.current
    if (state.frame) return
    state.lastTime = performance.now()
    state.frame = requestAnimationFrame(tick)
  }, [tick])

  const moveTo = useCallback((target: number, zoomTarget = 0, focus = false) => {
    clearTimeout(idleTimer.current)
    const state = motion.current
    state.revision++
    state.target = Math.max(0, Math.min(count - 1, target))
    state.focus = focus
    state.zoomTarget = focus ? state.zoom : zoomTarget
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      cancelAnimationFrame(state.frame)
      state.frame = 0
      state.position = Math.round(state.target)
      state.target = state.position
      state.zoom = zoomTarget
      state.zoomTarget = zoomTarget
      state.focus = false
    }
    schedule()
  }, [count, schedule])

  useEffect(() => {
    const element = viewport.current
    const filmstrip = strip.current
    if (!element || !filmstrip) return
    const resizeObserver = new ResizeObserver(entries => {
      const bounds = entries[0]?.contentRect
      if (!bounds) return
      axis.current = window.matchMedia(MOBILE_QUERY).matches ? 'vertical' : 'horizontal'
      dimensions.current = {
        width: bounds.width,
        height: bounds.height,
        dpr: window.devicePixelRatio || 1,
        fit: getComputedStyle(filmstrip).getPropertyValue('--photo-fit').trim() === 'contain' ? 'contain' : 'cover',
      }
      schedule()
    })
    resizeObserver.observe(filmstrip)
    let reducedMotionUntil = 0
    const onWheel = (event: WheelEvent) => {
      if (element.dataset.reading === 'true') return
      if (count < 2 || event.ctrlKey || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return
      if (event.target instanceof Element && event.target.closest('select, dialog')) return
      event.preventDefault()
      const direction = Math.sign(event.deltaY)
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        if (performance.now() < reducedMotionUntil) return
        reducedMotionUntil = performance.now() + 240
        moveTo(motion.current.target + direction)
        return
      }
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? element.clientHeight : 1
      const distance = Math.min(Math.abs(event.deltaY * unit), 160)
      const state = motion.current
      // Spend the first part of the gesture revealing the strip, then browse it.
      const currentZoom = Math.max(state.zoom, state.zoomTarget)
      const zoomDistance = Math.min(distance, (1 - currentZoom) * 720)
      const zoomTarget = clamp(currentZoom + zoomDistance / 720)
      moveTo(state.target + direction * (distance - zoomDistance) / 520, zoomTarget)
      idleTimer.current = setTimeout(() => moveTo(Math.round(state.position), 0, true), 1300)
    }
    element.addEventListener('wheel', onWheel, { passive: false })
    const state = motion.current
    return () => {
      resizeObserver.disconnect()
      element.removeEventListener('wheel', onWheel)
      clearTimeout(idleTimer.current)
      cancelAnimationFrame(state.frame)
      state.frame = 0
    }
  }, [count, moveTo, schedule])

  const registerFrame = useCallback((slot: number, node: HTMLAnchorElement | null) => {
    if (!node) { nodes.current.delete(slot); return }
    nodes.current.set(slot, node)
    const frame = layout.current.find(frame => frame.slot === slot)
    if (frame) paintFrame(node, frame, axis.current)
  }, [])
  const isRequested = useCallback((target: SettledPhoto) => sameSettlement(target, requestedPhoto(motion.current, dimensions.current)), [])
  const select = useCallback((index: number) => moveTo(index, 0, true), [moveTo])
  const step = useCallback((direction: number) => moveTo(Math.round(motion.current.target) + direction, 0, true), [moveTo])
  return { viewport, panel, strip, axis, registerFrame, isRequested, ...view, select, step }
}

export default function Gallery({ albums, reading, children }: {
  albums: GalleryAlbum[]
  reading: boolean
  children: ReactNode
}) {
  const albumId = useSyncExternalStore(subscribeAlbum, currentAlbum, () => '')
  const album = albums.find((item) => item.id === albumId) ?? albums[0]
  if (!album || !album.photos.length) {
    return <main id="content" tabIndex={-1} className={styles.stage} data-reading={reading}>
      <div className={styles.panelShell} data-content-panel><div className={styles.panel}>
        <p className={styles.empty}>还没有图片作品</p>{children}
      </div></div>
    </main>
  }
  return <AlbumGallery key={album.id} album={album} reading={reading}>{children}</AlbumGallery>
}

function AlbumGallery({ album, reading, children }: {
  album: GalleryAlbum
  reading: boolean
  children: ReactNode
}) {
  const { photos } = album
  const initialIndex = Math.min(positions.get(album.id) ?? 0, photos.length - 1)
  const { viewport, panel, strip, axis, frames, activeIndex, moving, settled, requested, isRequested, registerFrame, select, step } = useFilmstrip(photos, initialIndex)
  const gesture = useRef<GallerySwipe | null>(null)
  const suppressClickUntil = useRef(0)
  const photo = photos[activeIndex]
  useEffect(() => {
    const cancelMultiTouch = (event: PointerEvent) => {
      if (gesture.current && event.pointerType === 'touch' && !event.isPrimary) {
        gesture.current = null
        suppressClickUntil.current = Infinity
      }
    }
    document.addEventListener('pointerdown', cancelMultiTouch, true)
    return () => document.removeEventListener('pointerdown', cancelMultiTouch, true)
  }, [])
  useEffect(() => {
    positions.set(album.id, activeIndex)
    rememberAlbum(album.id)
    rememberPhoto({ albumId: album.id, swatch: photo.swatch })
  }, [album.id, activeIndex, photo.swatch])
  // These establish the SSR colors only. Animation owns subsequent style writes.
  const [initialStyle] = useState(() => ({
    panel: { backgroundColor: photo.swatch, '--paint-reveal': 0, '--panel-side': photo.swatch } satisfies PanelStyle,
    stage: { backgroundColor: photo.backdrop, color: photo.ink } satisfies CSSProperties,
  }))

  return (
    <main id="content" tabIndex={-1} ref={viewport} className={styles.stage} style={initialStyle.stage} data-reading={reading} onKeyDown={event => {
      if (reading) return
      if (event.target instanceof Element && event.target.closest('select, dialog')) return
      const forward = event.key === 'ArrowRight' || (axis.current === 'vertical' && event.key === 'ArrowDown')
      const backward = event.key === 'ArrowLeft' || (axis.current === 'vertical' && event.key === 'ArrowUp')
      if (forward || backward) {
        event.preventDefault()
        step(forward ? 1 : -1)
      }
    }}>
      <div ref={panel} className={styles.panelShell} style={initialStyle.panel} data-content-panel>
        <div className={styles.panel}>
          <section className={styles.gallery} aria-label={album.title} aria-roledescription="图片轮播" inert={reading}>
            <div ref={strip} className={styles.filmstrip} data-moving={moving} data-settled={settled !== null}
              onPointerDown={event => {
                if (!event.isPrimary || event.button !== 0) return
                suppressClickUntil.current = 0
                if (event.pointerType === 'mouse') return
                gesture.current = {
                  pointerId: event.pointerId, x: event.clientX, y: event.clientY,
                  axis: window.matchMedia(MOBILE_QUERY).matches ? 'vertical' : 'horizontal',
                }
              }}
              onPointerCancel={() => {
                gesture.current = null
                suppressClickUntil.current = performance.now() + 350
              }}
              onPointerUp={event => {
                const start = gesture.current
                gesture.current = null
                if (!start) return
                if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 10) {
                  suppressClickUntil.current = performance.now() + 350
                }
                const direction = gallerySwipeDirection(start, {
                  pointerId: event.pointerId, x: event.clientX, y: event.clientY,
                  axis: window.matchMedia(MOBILE_QUERY).matches ? 'vertical' : 'horizontal',
                })
                if (direction) {
                  suppressClickUntil.current = performance.now() + 350
                  step(direction)
                }
              }}>
              {frames.map(frame => {
                const { slot } = frame
                const image = photos[slot]
                return (
                  <a
                    key={slot}
                    ref={node => registerFrame(slot, node)}
                    href={image.src}
                    className={styles.photoFrame}
                    data-active={slot === activeIndex}
                    data-visible={frame.visible}
                    aria-label={`放大第 ${slot + 1} 张图片`}
                    tabIndex={frame.visible ? 0 : -1}
                    onClick={event => {
                      event.preventDefault()
                      if (event.detail === 0 || performance.now() >= suppressClickUntil.current) select(slot)
                    }}
                    style={{ zIndex: frame.layer, transform: filmstripTransform(frame, axis.current) }}
                  >
                    {frame.visible && <Photograph image={image} active={slot === activeIndex}
                      hero={slot === initialIndex && settled?.revision === 0}
                      requested={requested?.slot === slot ? requested : null} isRequested={isRequested} />}
                  </a>
                )
              })}
            </div>
          </section>
          {children}
        </div>
      </div>
    </main>
  )
}
