import fs from 'node:fs/promises'
import path from 'node:path'
import { cloudflareClient, required } from './cloudflare.mjs'
import { hashFile } from './release.mjs'
import { encodePhotoVariants, photoDetails, photoRecipe, photoSizes, validatePhotoMetadata } from './photo-variants.mjs'

export function localPhotoPublisher(generatedRoot, mediaRoot, expectedMedia) {
  return async function publishPhoto(source, analyze, cached) {
    if (cached?.sources?.length && cached.src.startsWith(`/media/derivatives/${photoRecipe}/`)) {
      const directory = path.dirname(cached.src.slice('/media/'.length))
      let complete = true
      for (const size of photoSizes) {
        try { await fs.access(path.join(mediaRoot, directory, `${size}.webp`)) } catch (error) {
          if (error.code !== 'ENOENT') throw error
          complete = false
        }
      }
      if (complete) {
        for (const size of photoSizes) expectedMedia.add(`${directory}/${size}.webp`)
        return cached
      }
    }
    const hash = await hashFile(source)
    const relative = `derivatives/${photoRecipe}/${hash}`
    const directory = path.join(mediaRoot, relative)
    const metadataFile = path.join(generatedRoot, 'photo-metadata', photoRecipe, `${hash}.json`)
    let metadata
    try { metadata = validatePhotoMetadata(JSON.parse(await fs.readFile(metadataFile, 'utf8')), hash) } catch (error) {
      if (error.code !== 'ENOENT') throw error
    }
    let complete = Boolean(metadata)
    if (complete) for (const size of photoSizes) {
      try { await fs.access(path.join(directory, `${size}.webp`)) } catch (error) {
        if (error.code !== 'ENOENT') throw error
        complete = false
      }
    }
    if (!complete) {
      metadata = await encodePhotoVariants(source, directory, hash, analyze)
      await fs.mkdir(path.dirname(metadataFile), { recursive: true })
      await fs.writeFile(`${metadataFile}.tmp`, JSON.stringify(metadata))
      await fs.rename(`${metadataFile}.tmp`, metadataFile)
    }
    for (const size of photoSizes) expectedMedia.add(`${relative}/${size}.webp`)
    return photoDetails(metadata, size => `/media/${relative}/${size}.webp`)
  }
}

export function remotePhotoPublisher(generatedRoot, options = {}) {
  if (!process.env.CI) throw new Error('Remote image processing runs in cloud CI; use local preview without FOLIO_REMOTE_MEDIA')
  const client = options.client ?? cloudflareClient()
  const bucket = options.bucket ?? required('FOLIO_MEDIA_BUCKET')
  const base = new URL(options.base ?? required('FOLIO_MEDIA_BASE_URL'))
  if (base.protocol !== 'https:') throw new Error('FOLIO_MEDIA_BASE_URL must use HTTPS')
  const imageBase = base.href.replace(/\/?$/, '/')
  const output = path.join(generatedRoot, 'derivatives', photoRecipe)

  return async function publishPhoto(source, analyze) {
    const hash = await hashFile(source)
    const metadataKey = `metadata/${photoRecipe}/${hash}.json`
    const imageKey = size => `images/${photoRecipe}/${hash}/${size}.webp`
    let metadata = await client.getJSON(bucket, metadataKey, true)
    if (metadata) validatePhotoMetadata(metadata, hash)
    else {
      const directory = path.join(output, hash)
      try {
        metadata = await encodePhotoVariants(source, directory, hash, analyze)
        for (const size of photoSizes) await client.putFile(bucket, imageKey(size), path.join(directory, `${size}.webp`), 'image/webp')
        const metadataFile = path.join(directory, 'metadata.json')
        await fs.writeFile(metadataFile, JSON.stringify(metadata))
        // Metadata is committed only after every immutable variant has been uploaded.
        await client.putFile(bucket, metadataKey, metadataFile, 'application/json')
      } finally {
        await fs.rm(directory, { recursive: true, force: true })
      }
    }
    return photoDetails(metadata, size => new URL(imageKey(size), imageBase).href)
  }
}
