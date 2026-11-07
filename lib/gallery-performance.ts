import type { GalleryPhoto } from './gallery-types'

export const MOBILE_LANDSCAPE_QUERY = '(max-width: 1100px) and (max-height: 600px) and (orientation: landscape)'

export type PhotoSource = NonNullable<GalleryPhoto['sources']>[number]
export type GalleryViewport = { width: number; height: number; dpr: number; fit: 'cover' | 'contain' }
export type SettledPhoto = { slot: number; revision: number; viewport: GalleryViewport }
export type FilmstripMotion = {
  position: number
  target: number
  zoom: number
  zoomTarget: number
  focus: boolean
  revision: number
}

export function photoSources(photo: GalleryPhoto): PhotoSource[] {
  const sources = photo.sources?.length ? photo.sources : [photo]
  // Width descriptors must be unique, including when a small original was not enlarged.
  return [...new Map(sources.map(source => [source.width, source])).values()]
    .sort((left, right) => left.width - right.width)
}

export function thumbnailSource(photo: GalleryPhoto): string {
  return photo.thumbnailSrc
    ?? photoSources(photo).find(source => Math.max(source.width, source.height) <= 640)?.src
    ?? photo.src
}

export function settledSource(photo: GalleryPhoto, viewport: GalleryViewport): PhotoSource {
  const sources = photoSources(photo)
  const fullSize = sources.filter(source => Math.max(source.width, source.height) > 640)
  const candidates = viewport.fit === 'contain' || !fullSize.length ? sources : fullSize
  const widthAtHeight = viewport.height * photo.width / photo.height
  // Contain stops at the first edge; cover needs enough pixels to fill both.
  const requiredWidth = (viewport.fit === 'contain'
    ? Math.min(viewport.width, widthAtHeight)
    : Math.max(viewport.width, widthAtHeight)) * viewport.dpr
  return candidates.find(source => source.width >= requiredWidth)
    ?? candidates.at(-1)
    ?? photo
}

export function heroImage(photo: GalleryPhoto) {
  const sources = photoSources(photo)
  const inset = 'clamp(10px, 1.2vw, 18px)'
  const width = `calc(100vw - 2 * clamp(12px, 1.8vw, 36px) - 2 * ${inset})`
  const height = `calc(97.4vh - max(9dvh, calc(82px + env(safe-area-inset-bottom, 0px))) - 2 * ${inset})`
  const portraitWidth = `min(${width}, calc((${height} - 36px) * ${photo.width / photo.height}))`
  // Landscape uses the full dynamic viewport, safe-area padding, and two 6px gallery insets.
  const landscapeWidth = 'calc(100vw - max(12px, env(safe-area-inset-left, 0px)) - max(12px, env(safe-area-inset-right, 0px)) - 12px)'
  const landscapeHeight = 'calc(100dvh - max(8px, env(safe-area-inset-top, 0px)) - max(28px, calc(12px + env(safe-area-inset-bottom, 0px))) - 12px)'
  const landscapeImageWidth = `min(${landscapeWidth}, calc(${landscapeHeight} * ${photo.width / photo.height}))`
  return {
    src: photo.src,
    srcSet: sources.length > 1 ? sources.map(source => `${source.src} ${source.width}w`).join(', ') : undefined,
    // Match mobile containment before hydration; desktop keeps cover sizing.
    sizes: `(max-width: 760px) and (orientation: portrait) ${portraitWidth}, ${MOBILE_LANDSCAPE_QUERY} ${landscapeImageWidth}, max(${width}, calc(${height} * ${photo.width / photo.height}))`,
  }
}

export function settledPhoto(motion: FilmstripMotion, viewport: GalleryViewport): SettledPhoto | null {
  if (motion.focus || motion.position !== motion.target || !Number.isInteger(motion.position)
    || motion.zoom !== 0 || motion.zoomTarget !== 0) return null
  return { slot: motion.position, revision: motion.revision, viewport }
}

// Start the full-size request as soon as an integer destination is selected,
// while the filmstrip is still moving toward it.
export function requestedPhoto(motion: FilmstripMotion, viewport: GalleryViewport): SettledPhoto | null {
  if (!Number.isInteger(motion.target) || (!motion.focus && motion.zoomTarget !== 0)
    || viewport.width <= 0 || viewport.height <= 0) return null
  return { slot: motion.target, revision: motion.revision, viewport }
}

export function sameSettlement(left: SettledPhoto | null, right: SettledPhoto | null): boolean {
  return left === right || (left !== null && right !== null
    && left.slot === right.slot && left.revision === right.revision
    && left.viewport.width === right.viewport.width && left.viewport.height === right.viewport.height
    && left.viewport.dpr === right.viewport.dpr && left.viewport.fit === right.viewport.fit)
}

export function sameFrameWindow(
  left: readonly { slot: number; visible: boolean }[],
  right: readonly { slot: number; visible: boolean }[],
): boolean {
  return left.length === right.length
    && left.every((frame, index) => frame.slot === right[index].slot && frame.visible === right[index].visible)
}
