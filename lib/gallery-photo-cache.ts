import type { GalleryPhoto } from './gallery-types'
import type { PhotoSource } from './gallery-performance'

export function createPhotoCache(createImage: () => HTMLImageElement = () => new window.Image()) {
  const decoded = new Map<string, { image: HTMLImageElement; promise: Promise<boolean> }>()
  // URL history is cheap; decoded pixels and in-flight downloads stay bounded.
  const sources = new Map<string, PhotoSource>()

  function remember(photo: GalleryPhoto, source: PhotoSource) {
    const previous = sources.get(photo.src)
    sources.delete(photo.src)
    sources.set(photo.src, previous && previous.width > source.width ? previous : source)
    while (sources.size > 64) {
      const oldest = sources.keys().next().value
      if (oldest === undefined) break
      sources.delete(oldest)
    }
  }

  function recalled(photo: GalleryPhoto): PhotoSource | undefined {
    const source = sources.get(photo.src)
    if (source) {
      remember(photo, source)
      const entry = decoded.get(source.src)
      if (entry) {
        decoded.delete(source.src)
        decoded.set(source.src, entry)
      }
    }
    return source
  }

  function decode(photo: GalleryPhoto, source: PhotoSource, priority: 'high' | 'low' = 'high'): Promise<boolean> {
    const cached = decoded.get(source.src)
    if (cached) {
      if (priority === 'high') cached.image.fetchPriority = 'high'
      decoded.delete(source.src)
      decoded.set(source.src, cached)
      return cached.promise
    }
    const image = createImage()
    image.decoding = 'async'
    image.fetchPriority = priority
    image.src = source.src
    const promise = image.decode().then(() => {
      if (decoded.get(source.src)?.image !== image) return false
      remember(photo, source)
      return true
    }, () => {
      if (decoded.get(source.src)?.image === image) decoded.delete(source.src)
      return false
    })
    decoded.set(source.src, { image, promise })
    while (decoded.size > 3) {
      const oldest = decoded.keys().next().value
      if (oldest === undefined) break
      const entry = decoded.get(oldest)
      decoded.delete(oldest)
      if (entry) entry.image.src = ''
    }
    return promise
  }

  return { remember, recalled, decode }
}

export const photoCache = createPhotoCache()

export function allowPhotoPrefetch(connection: unknown): boolean {
  if (typeof connection !== 'object' || connection === null) return true
  if ('saveData' in connection && connection.saveData === true) return false
  return !('effectiveType' in connection && (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g'))
}
