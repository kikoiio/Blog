import fs from 'node:fs/promises'
import path from 'node:path'
import { required } from './cloudflare.mjs'

const source = await fs.readFile('.folio/gallery.ts', 'utf8')
const albums = JSON.parse(source.slice(source.indexOf(' = ') + 3))
const photos = albums.flatMap(album => album.photos)
const site = required('FOLIO_SITE_URL')
let html = ''
for (let attempt = 0; attempt < 12; attempt++) {
  const response = await fetch(`${site}/?release-check=${Date.now()}`, { signal: AbortSignal.timeout(30_000) })
  html = await response.text()
  if (response.ok && (photos.length === 0 || html.includes(photos[0].src))) break
  if (attempt === 11) throw new Error('Production page did not switch to this release')
  await new Promise(resolve => setTimeout(resolve, 2500))
}
for (const photo of photos) {
  const response = await fetch(photo.src, { method: 'HEAD', signal: AbortSignal.timeout(30_000) })
  if (!response.ok || !response.headers.get('content-type')?.startsWith('image/webp')) throw new Error(`Image failed: ${photo.src}`)
}
const manifest = JSON.parse(await fs.readFile(path.join(required('FOLIO_ARCHIVE_PATH'), 'release.json'), 'utf8'))
const first = manifest.files[0]
if (first) {
  const publicSource = await fetch(`${required('FOLIO_MEDIA_BASE_URL')}/${first.objectKey}`)
  if (publicSource.status !== 404) throw new Error('Public media endpoint must not expose source keys')
  const privateSource = await fetch(`${required('FOLIO_BUILD_URL')}/r2/buckets/${required('FOLIO_SOURCE_BUCKET')}/objects/${first.objectKey}`)
  if (privateSource.status !== 401) throw new Error('Private source endpoint must require authentication')
}
console.log(`Verified live site, ${albums.length} albums, ${photos.length} WebP images, and original-file privacy.`)
