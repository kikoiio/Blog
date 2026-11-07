import { replaceFragment } from './site-navigation'
export { subscribeNavigation as subscribeAlbum } from './site-navigation'

let lastAlbum = ''
type PhotoSelection = { albumId: string; swatch: string }
let lastPhoto: PhotoSelection | null = null

export function subscribePhoto(callback: () => void) {
  window.addEventListener('folio:photochange', callback)
  return () => window.removeEventListener('folio:photochange', callback)
}

export function currentPhoto() {
  return lastPhoto
}

export function rememberPhoto(photo: PhotoSelection) {
  if (lastPhoto?.albumId === photo.albumId && lastPhoto.swatch === photo.swatch) return
  lastPhoto = photo
  window.dispatchEvent(new Event('folio:photochange'))
}

export function currentAlbum() {
  return new URLSearchParams(window.location.hash.slice(1)).get('album') || lastAlbum
}

export function rememberAlbum(id: string) {
  lastAlbum = id
}

export function changeAlbum(id: string) {
  rememberAlbum(id)
  const params = new URLSearchParams(window.location.hash.slice(1))
  params.set('album', id)
  replaceFragment(params)
}
