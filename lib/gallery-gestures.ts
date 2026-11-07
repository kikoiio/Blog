import type { FilmstripMotion } from './gallery-performance'

export const MOBILE_QUERY = '(max-width: 760px)'

export type GalleryAxis = 'horizontal' | 'vertical'
export type GallerySwipe = { pointerId: number; x: number; y: number; axis: GalleryAxis }
export type GalleryDragOrigin = Pick<FilmstripMotion, 'position' | 'zoom'>

export function galleryDragTarget(origin: GalleryDragOrigin, distance: number, viewportLength: number, count: number) {
  const revealDistance = Math.max(48, Math.min(96, viewportLength * 0.15))
  const photoDistance = Math.max(160, Math.min(320, viewportLength * 0.4))
  return {
    target: Math.max(0, Math.min(count - 1, origin.position + distance / photoDistance)),
    zoomTarget: Math.max(origin.zoom, Math.min(1, Math.abs(distance) / revealDistance)),
  }
}

export function galleryDragDestination(selected: number, target: number, direction: -1 | 0 | 1, count: number): number {
  const anchor = Math.round(selected)
  const nearest = Math.round(target)
  const destination = direction === 0 ? anchor
    : direction > 0 ? Math.max(anchor + 1, nearest) : Math.min(anchor - 1, nearest)
  return Math.max(0, Math.min(count - 1, destination))
}

export function gallerySwipeDirection(start: GallerySwipe, end: GallerySwipe): -1 | 0 | 1 {
  if (start.pointerId !== end.pointerId || start.axis !== end.axis) return 0
  const dx = end.x - start.x
  const dy = end.y - start.y
  const distance = start.axis === 'vertical' ? dy : dx
  const crossDistance = start.axis === 'vertical' ? dx : dy
  if (Math.abs(distance) <= 44 || Math.abs(distance) <= Math.abs(crossDistance) * 1.2) return 0
  return distance < 0 ? 1 : -1
}
