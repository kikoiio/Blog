import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import sharp from 'sharp'
import { remotePhotoPublisher } from './media.mjs'

const require = createRequire(import.meta.url)
const { loadEnvConfig } = require('@next/env')
export const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
loadEnvConfig(projectRoot, process.env.NODE_ENV !== 'production')

export const archiveRoot = process.env.FOLIO_ARCHIVE_PATH
  ? path.resolve(projectRoot, process.env.FOLIO_ARCHIVE_PATH)
  : null

const generatedRoot = path.join(projectRoot, '.folio')
const mediaRoot = path.join(projectRoot, 'public/media')
const imageExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp', '.avif'])
const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' })
sharp.concurrency(1)
sharp.cache({ memory: 16, files: 0, items: 32 })

async function walk(root, relative = '') {
  const entries = await fs.readdir(path.join(root, relative), { withFileTypes: true })
  const files = []
  for (const entry of entries.sort((a, b) => collator.compare(a.name, b.name))) {
    if (entry.name.startsWith('.')) continue
    const name = path.join(relative, entry.name)
    if (entry.isDirectory()) files.push(...await walk(root, name))
    else if (entry.isFile()) files.push(name)
  }
  return files
}

async function writeIfChanged(file, value) {
  let previous = null
  try { previous = await fs.readFile(file, 'utf8') } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
  if (previous === value) return
  await fs.mkdir(path.dirname(file), { recursive: true })
  await fs.writeFile(`${file}.tmp`, value)
  await fs.rename(`${file}.tmp`, file)
}

function themeFromPixels(data, channels) {
  const bins = Array.from({ length: 12 }, () => ({ weight: 0, hue: 0 }))
  for (let i = 0; i < data.length; i += channels) {
    const [r, g, b] = [data[i] / 255, data[i + 1] / 255, data[i + 2] / 255]
    const max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min
    const lightness = (max + min) / 2
    if (lightness < 0.12 || lightness > 0.85 || delta < 0.04) continue
    let hue = max === r ? ((g - b) / delta) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4
    hue = (hue * 60 + 360) % 360
    const bin = bins[Math.floor(hue / 30)]
    const weight = delta * (0.4 + lightness)
    bin.weight += weight
    bin.hue += hue * weight
  }
  const dominant = bins.reduce((a, b) => b.weight > a.weight ? b : a)
  const hue = dominant.weight ? dominant.hue / dominant.weight : 220
  return {
    swatch: `hsl(${Math.round(hue)} 22% 33%)`,
    backdrop: `hsl(${Math.round(hue)} 25% 14%)`,
    ink: `hsl(${Math.round(hue)} 16% 90%)`,
  }
}

async function readPhoto(source) {
  const metadata = await sharp(source).metadata()
  if (!metadata.width || !metadata.height) throw new Error(`无法读取图片尺寸：${source}`)
  const { data, info } = await sharp(source).rotate().resize(64, 40, { fit: 'inside' }).flatten({ background: '#20232b' }).removeAlpha().toColourspace('srgb').raw().toBuffer({ resolveWithObject: true })
  const rotated = [5, 6, 7, 8].includes(metadata.orientation)
  return {
    width: rotated ? metadata.height : metadata.width,
    height: rotated ? metadata.width : metadata.height,
    ...themeFromPixels(data, info.channels),
  }
}

export async function syncArchive() {
  const remotePhoto = process.env.FOLIO_REMOTE_MEDIA === '1' ? remotePhotoPublisher(generatedRoot) : null
  if (archiveRoot) {
    if (archiveRoot === projectRoot || archiveRoot.startsWith(`${projectRoot}${path.sep}`)) {
      throw new Error('FOLIO_ARCHIVE_PATH 必须指向网站仓库外的独立目录。')
    }
    for (const directory of ['blogs', 'pictures']) {
      const info = await fs.stat(path.join(archiveRoot, directory))
      if (!info.isDirectory()) throw new Error(`资料目录缺少 ${directory}/`)
    }
  }

  let previousCache = {}
  try { previousCache = JSON.parse(await fs.readFile(path.join(generatedRoot, 'cache.json'), 'utf8')) } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
  const nextCache = {}
  const albums = new Map()
  const expectedMedia = new Set()

  async function copy(source, relative) {
    const destination = path.join(mediaRoot, relative)
    await fs.mkdir(path.dirname(destination), { recursive: true })
    const sourceStat = await fs.stat(source)
    let destinationStat
    try { destinationStat = await fs.stat(destination) } catch (error) {
      if (error.code !== 'ENOENT') throw error
    }
    if (!destinationStat || destinationStat.size !== sourceStat.size || destinationStat.mtimeMs !== sourceStat.mtimeMs) {
      await fs.copyFile(source, destination)
      await fs.utimes(destination, sourceStat.atime, sourceStat.mtime)
    }
    expectedMedia.add(relative)
  }

  if (archiveRoot) {
    const picturesRoot = path.join(archiveRoot, 'pictures')
    for (const relative of await walk(picturesRoot)) {
      if (!imageExtensions.has(path.extname(relative).toLowerCase())) continue
      const source = path.join(picturesRoot, relative)
      const stat = await fs.stat(source)
      const fingerprint = `${source}:${stat.size}:${stat.mtimeMs}`
      const cached = previousCache[relative]
      const details = remotePhoto
        ? await remotePhoto(source, () => readPhoto(source))
        : cached?.fingerprint === fingerprint ? cached.details : await readPhoto(source)
      nextCache[relative] = { fingerprint, details }
      const albumId = path.dirname(relative).split(path.sep).join('/')
      if (!albums.has(albumId)) {
        albums.set(albumId, {
          id: albumId,
          title: albumId === '.' ? 'Pictures' : albumId.split('/').map(part => part.replaceAll(/[_-]/g, ' ')).join(' / '),
          photos: [],
        })
      }
      const id = relative.split(path.sep).join('/')
      albums.get(albumId).photos.push({
        id,
        src: details.src ?? `/media/pictures/${id.split('/').map(encodeURIComponent).join('/')}`,
        alt: `${albums.get(albumId).title} — ${path.parse(relative).name}`,
        ...details,
      })
      if (!remotePhoto) await copy(source, path.join('pictures', relative))
    }

    const blogsRoot = path.join(archiveRoot, 'blogs')
    for (const relative of await walk(blogsRoot)) {
      if (/\.(md|mdx)$/i.test(relative)) continue
      await copy(path.join(blogsRoot, relative), path.join('blogs', relative))
    }
  }

  await writeIfChanged(path.join(generatedRoot, 'gallery.ts'), `import type { GalleryAlbum } from '../lib/gallery-types'\n\nexport const albums: GalleryAlbum[] = ${JSON.stringify([...albums.values()], null, 2)}\n`)
  await writeIfChanged(path.join(generatedRoot, 'cache.json'), `${JSON.stringify(nextCache)}\n`)
  // Prune only generated media, after the archive has been read successfully.
  const existing = await fs.stat(mediaRoot).catch(error => {
    if (error.code !== 'ENOENT') throw error
    return null
  })
  if (existing) for (const relative of await walk(mediaRoot)) {
    if (!expectedMedia.has(relative)) await fs.unlink(path.join(mediaRoot, relative))
  }
  return { albums: albums.size, photos: Object.keys(nextCache).length }
}
