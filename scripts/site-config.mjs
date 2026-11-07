import fs from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import sharp from 'sharp'

export const defaultSite = {
  title: 'Folio',
  description: '用影像和文字，记录值得留下的日常。',
  contacts: [],
}

export function parseSiteConfig(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('site/config.json 必须是 JSON 对象')
  for (const key of Object.keys(value)) {
    if (!['title', 'description', 'contacts'].includes(key)) throw new Error(`未知的站点配置：${key}`)
  }
  function text(value, fallback, name, limit) {
    if (value === undefined) return fallback
    if (typeof value !== 'string' || !value.trim() || value.length > limit) throw new Error(`无效的站点配置：${name}`)
    return value.trim()
  }
  const title = text(value.title, defaultSite.title, 'title', 120)
  const description = text(value.description, defaultSite.description, 'description', 500)
  const contacts = value.contacts === undefined ? [] : value.contacts
  if (!Array.isArray(contacts) || contacts.length > 10) throw new Error('contacts 必须是最多 10 项的数组')
  return {
    title,
    description,
    contacts: contacts.map(contact => {
      if (!contact || typeof contact !== 'object' || Array.isArray(contact) || Object.keys(contact).some(key => !['label', 'url'].includes(key))) {
        throw new Error('每个联系方式必须包含 label 和 url')
      }
      const label = text(contact.label, '', 'contacts.label', 80)
      const url = text(contact.url, '', 'contacts.url', 2048)
      if (!label || !url) throw new Error('联系方式缺少 label 或 url')
      let parsed
      try { parsed = new URL(url) } catch { throw new Error(`无效的联系方式地址：${label}`) }
      if (!['https:', 'mailto:'].includes(parsed.protocol) || parsed.username || parsed.password || (!parsed.pathname && parsed.protocol === 'mailto:')) {
        throw new Error(`联系方式仅支持 HTTPS 或 mailto 地址：${label}`)
      }
      return { label, url }
    }),
  }
}

async function optionalFile(filename) {
  try {
    const stat = await fs.lstat(filename)
    if (!stat.isFile()) throw new Error(`站点配置必须是普通文件：${path.basename(filename)}`)
    return await fs.readFile(filename)
  } catch (error) {
    if (error.code === 'ENOENT') return null
    throw error
  }
}

export async function readSite(archiveRoot) {
  if (!archiveRoot) return { ...defaultSite, image: null }
  const directory = path.join(archiveRoot, 'site')
  try {
    const stat = await fs.lstat(directory)
    if (!stat.isDirectory()) throw new Error('site/ 必须是普通目录，不能是符号链接')
  } catch (error) {
    if (error.code === 'ENOENT') return { ...defaultSite, image: null }
    throw error
  }
  const config = await optionalFile(path.join(directory, 'config.json'))
  const site = config ? parseSiteConfig(JSON.parse(config)) : { ...defaultSite }
  const image = await optionalFile(path.join(directory, 'icon.png'))
  if (image) {
    const metadata = await sharp(image, { limitInputPixels: 16_777_216 }).metadata()
    if (metadata.format !== 'png' || !metadata.width || !metadata.height || metadata.width !== metadata.height) {
      throw new Error('site/icon.png 必须是正方形 PNG 图片')
    }
  }
  return { ...site, image }
}

export async function writeSite(site, projectRoot) {
  const directory = path.join(projectRoot, 'public/site')
  await fs.mkdir(directory, { recursive: true })
  const files = new Set()
  const icons = { icon: [], apple: [] }
  if (site.image) {
    const revision = createHash('sha256').update(site.image).digest('hex').slice(0, 16)
    for (const size of [16, 32, 48, 180, 192, 512]) {
      const name = `icon-${revision}-${size}.png`
      const url = `/site/${name}`
      const filename = path.join(directory, name)
      try { await fs.access(filename) } catch {
        await sharp(site.image, { limitInputPixels: 16_777_216 }).resize(size, size).png().toFile(`${filename}.tmp`)
        await fs.rename(`${filename}.tmp`, filename)
      }
      files.add(name)
      if ([16, 32, 48, 192, 512].includes(size)) icons.icon.push({ url, sizes: `${size}x${size}`, type: 'image/png' })
      if (size === 180) icons.apple.push({ url, sizes: '180x180', type: 'image/png' })
    }
  } else {
    icons.icon.push({ url: '/default-icon.svg', sizes: 'any', type: 'image/svg+xml' })
  }
  // A conventional URL also replaces a previously cached framework favicon.
  if (site.image) {
    const png = await sharp(site.image).resize(32, 32).png().toBuffer()
    const header = Buffer.alloc(22)
    header.writeUInt16LE(1, 2)
    header.writeUInt16LE(1, 4)
    header[6] = 32
    header[7] = 32
    header.writeUInt16LE(1, 10)
    header.writeUInt16LE(32, 12)
    header.writeUInt32LE(png.length, 14)
    header.writeUInt32LE(22, 18)
    await fs.writeFile(path.join(projectRoot, 'public/favicon.ico'), Buffer.concat([header, png]))
  } else {
    await fs.rm(path.join(projectRoot, 'public/favicon.ico'), { force: true })
  }
  const config = { ...site }
  delete config.image
  const source = `import type { SiteConfig } from '../lib/site-types'\n\nexport const site = ${JSON.stringify({ ...config, icons }, null, 2)} satisfies SiteConfig\n`
  const output = path.join(projectRoot, '.folio/site.ts')
  let previous
  try { previous = await fs.readFile(output, 'utf8') } catch (error) { if (error.code !== 'ENOENT') throw error }
  if (previous !== source) {
    await fs.mkdir(path.dirname(output), { recursive: true })
    await fs.writeFile(`${output}.tmp`, source)
    await fs.rename(`${output}.tmp`, output)
  }
  for (const filename of await fs.readdir(directory)) {
    if (/^icon-[a-f0-9]{16}-\d+\.png(?:\.tmp)?$/.test(filename) && !files.has(filename)) await fs.unlink(path.join(directory, filename))
  }
}
