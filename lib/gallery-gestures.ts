export const MOBILE_PORTRAIT_QUERY = '(max-width: 760px) and (orientation: portrait)'

export type GalleryAxis = 'horizontal' | 'vertical'
export type GallerySwipe = { pointerId: number; x: number; y: number; axis: GalleryAxis }

export function gallerySwipeDirection(start: GallerySwipe, end: GallerySwipe): -1 | 0 | 1 {
  if (start.pointerId !== end.pointerId || start.axis !== end.axis) return 0
  const dx = end.x - start.x
  const dy = end.y - start.y
  const distance = start.axis === 'vertical' ? dy : dx
  const crossDistance = start.axis === 'vertical' ? dx : dy
  if (Math.abs(distance) <= 44 || Math.abs(distance) <= Math.abs(crossDistance) * 1.2) return 0
  return distance < 0 ? 1 : -1
}
