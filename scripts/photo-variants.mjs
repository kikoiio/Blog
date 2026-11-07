import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

export const photoRecipe = 'v2'
export const photoSizes = [640, 1600, 2400]
const quality = new Map([[640, 80], [1600, 84], [2400, 88]])

export function validatePhotoMetadata(value, hash) {
  if (!value || value.recipe !== photoRecipe || value.sourceHash !== hash ||
    ['swatch', 'backdrop', 'ink'].some(key => typeof value[key] !== 'string') ||
    !Array.isArray(value.variants) || value.variants.length !== photoSizes.length ||
    value.variants.some((variant, index) => !variant || variant.size !== photoSizes[index] ||
      !Number.isSafeInteger(variant.width) || !Number.isSafeInteger(variant.height) ||
      variant.width < 1 || variant.height < 1 || Math.max(variant.width, variant.height) > variant.size)) {
    throw new Error('Invalid stored picture metadata')
  }
  return value
}

export async function encodePhotoVariants(source, directory, hash, analyze) {
  await fs.mkdir(directory, { recursive: true })
  const theme = await analyze()
  const variants = []
  for (const size of photoSizes) {
    const file = path.join(directory, `${size}.webp`)
    const temporary = `${file}.tmp`
    try {
      const info = await sharp(source).rotate()
        .resize({ width: size, height: size, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: quality.get(size), effort: 4 }).toFile(temporary)
      await fs.rename(temporary, file)
      variants.push({ size, width: info.width, height: info.height })
    } finally {
      await fs.rm(temporary, { force: true })
    }
  }
  return { recipe: photoRecipe, sourceHash: hash, swatch: theme.swatch, backdrop: theme.backdrop, ink: theme.ink, variants }
}

export function photoDetails(metadata, urlFor) {
  const main = metadata.variants.at(-1)
  const widths = new Set()
  return {
    width: main.width,
    height: main.height,
    swatch: metadata.swatch,
    backdrop: metadata.backdrop,
    ink: metadata.ink,
    src: urlFor(2400),
    thumbnailSrc: urlFor(640),
    sources: metadata.variants.filter(variant => {
      if (widths.has(variant.width)) return false
      widths.add(variant.width)
      return true
    }).map(({ size, width, height }) => ({ src: urlFor(size), width, height })),
  }
}
