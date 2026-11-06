import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { cloudflareClient, required } from './cloudflare.mjs'
import { hashFile } from './release.mjs'

export function remotePhotoPublisher(generatedRoot) {
  if (!process.env.CI) throw new Error('Remote image processing runs in cloud CI; use local preview without FOLIO_REMOTE_MEDIA')
  const client = cloudflareClient()
  const bucket = required('FOLIO_MEDIA_BUCKET')
  const base = new URL(required('FOLIO_MEDIA_BASE_URL'))
  if (base.protocol !== 'https:') throw new Error('FOLIO_MEDIA_BASE_URL must use HTTPS')
  const output = path.join(generatedRoot, 'derivatives')

  return async function publishPhoto(source, analyze) {
    const hash = await hashFile(source)
    const metadataKey = `metadata/v1/${hash}.json`
    const mainKey = `images/v1/${hash}/2400.webp`
    const thumbnailKey = `images/v1/${hash}/640.webp`
    let details = await client.getJSON(bucket, metadataKey, true)
    if (details) {
      if (details.sourceHash !== hash || !Number.isSafeInteger(details.width) || !Number.isSafeInteger(details.height) ||
        details.width < 1 || details.height < 1 || ['swatch', 'backdrop', 'ink'].some(key => typeof details[key] !== 'string')) {
        throw new Error('Invalid stored picture metadata')
      }
    } else {
      await fs.mkdir(output, { recursive: true })
      const mainFile = path.join(output, `${hash}-2400.webp`)
      const thumbnailFile = path.join(output, `${hash}-640.webp`)
      const theme = await analyze()
      const main = await sharp(source).rotate().resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true }).webp({ quality: 88, effort: 4 }).toFile(mainFile)
      await sharp(source).rotate().resize({ width: 640, height: 640, fit: 'inside', withoutEnlargement: true }).webp({ quality: 80, effort: 4 }).toFile(thumbnailFile)
      await client.putFile(bucket, mainKey, mainFile, 'image/webp')
      await client.putFile(bucket, thumbnailKey, thumbnailFile, 'image/webp')
      details = { sourceHash: hash, width: main.width, height: main.height, swatch: theme.swatch, backdrop: theme.backdrop, ink: theme.ink }
      const metadataFile = path.join(output, `${hash}.json`)
      await fs.writeFile(metadataFile, JSON.stringify(details))
      await client.putFile(bucket, metadataKey, metadataFile, 'application/json')
      await fs.unlink(mainFile)
      await fs.unlink(thumbnailFile)
      await fs.unlink(metadataFile)
    }
    return { width: details.width, height: details.height, swatch: details.swatch, backdrop: details.backdrop, ink: details.ink, src: new URL(mainKey, base.href.replace(/\/?$/, '/')).href }
  }
}
