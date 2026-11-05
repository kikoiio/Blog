import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'

const contentRoot = path.join(process.cwd(), 'content/articles')

const imageExtensions = new Set(['.gif', '.jpeg', '.jpg', '.png', '.svg', '.webp'])

export type ArticleLayout = 'article' | 'photography'

export interface ArticlePhoto {
  alt: string
  filename: string
  src: string
}

export interface Article {
  assetDirectory: string
  category: string
  content: string
  date: string
  layout: ArticleLayout
  photos: ArticlePhoto[]
  routePath: string
  slug: string
  title: string
}

function getString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value : undefined
}

function formatDate(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.valueOf())) {
    return value.toISOString().slice(0, 10)
  }

  const stringValue = getString(value)
  if (stringValue) return stringValue

  if (typeof value === 'number') {
    const date = new Date(value)
    if (!Number.isNaN(date.valueOf())) return date.toISOString().slice(0, 10)
  }

  return ''
}

function getMarkdownFiles(directory: string, result: string[] = []): string[] {
  const entries = fs
    .readdirSync(directory, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name))

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      getMarkdownFiles(fullPath, result)
    } else if (entry.name.endsWith('.md')) {
      result.push(fullPath)
    }
  }

  return result
}

function toPosixPath(value: string): string {
  return value.split(path.sep).join('/')
}

function encodePath(value: string): string {
  return value
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/')
}

function buildArticleAssetUrl(assetDirectory: string, filename: string): string {
  const relativePath = [assetDirectory, filename].filter(Boolean).join('/')
  return `/article-assets/${encodePath(relativePath)}`
}

function getPhotos(articleDirectory: string, assetDirectory: string, title: string): ArticlePhoto[] {
  return fs
    .readdirSync(articleDirectory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && imageExtensions.has(path.extname(entry.name).toLowerCase()))
    .sort((left, right) => left.name.localeCompare(right.name, undefined, { numeric: true }))
    .map((entry, index) => ({
      alt: `${title} · ${index + 1}`,
      filename: entry.name,
      src: buildArticleAssetUrl(assetDirectory, entry.name),
    }))
}

function parseTomlFrontmatter(source: string): Record<string, string> {
  const data: Record<string, string> = {}

  for (const line of source.split('\n')) {
    const trimmed = line.trim()
    if (trimmed === '' || trimmed.startsWith('#')) continue

    const separator = trimmed.indexOf('=')
    if (separator === -1) continue

    const key = trimmed.slice(0, separator).trim()
    const rawValue = trimmed.slice(separator + 1).trim()
    const quoted = rawValue.length >= 2 && rawValue.startsWith('"') && rawValue.endsWith('"')
    data[key] = quoted ? rawValue.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\') : rawValue
  }

  return data
}

function buildArticle(filePath: string): Article {
  const fileContent = fs.readFileSync(filePath, 'utf8')
  // Hugo content uses +++ TOML. gray-matter 4 only splits --- unless delimiters and a TOML engine are set.
  const parsed = matter(fileContent, {
    delimiters: '+++',
    engines: { toml: parseTomlFrontmatter },
    language: 'toml',
  })
  const data: Record<string, unknown> = parsed.data
  const relativeFile = toPosixPath(path.relative(contentRoot, filePath))
  const isPageBundle = path.posix.basename(relativeFile) === 'index.md'
  const extensionlessPath = relativeFile.slice(0, -path.extname(relativeFile).length)
  const assetDirectory = path.posix.dirname(relativeFile) === '.' ? '' : path.posix.dirname(relativeFile)
  const routePath = isPageBundle ? path.posix.dirname(extensionlessPath) : extensionlessPath
  const slug = isPageBundle ? path.posix.basename(assetDirectory) : path.posix.basename(extensionlessPath)
  const title = getString(data.title) ?? slug
  const layout: ArticleLayout = data.layout === 'photography' ? 'photography' : 'article'
  const category = routePath.split('/')[0] || '未分类'
  const articleDirectory = path.dirname(filePath)

  return {
    assetDirectory,
    category,
    content: parsed.content,
    date: formatDate(data.date),
    layout,
    photos: getPhotos(articleDirectory, assetDirectory, title),
    routePath,
    slug,
    title,
  }
}

export function getAllArticles(): Article[] {
  return getMarkdownFiles(contentRoot)
    .map(buildArticle)
    .sort((left, right) => {
      const dateOrder = right.date.localeCompare(left.date)
      return dateOrder !== 0 ? dateOrder : left.title.localeCompare(right.title)
    })
}

export function getWritings(): Article[] {
  return getAllArticles().filter((article) => article.layout === 'article')
}

export function getPhotographyAlbums(): Article[] {
  return getAllArticles().filter((article) => article.layout === 'photography')
}

export function decodeRouteParam(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

export function getArticleByRoutePath(routePath: string): Article | undefined {
  return getAllArticles().find((article) => article.routePath === routePath)
}

export function getArticleBySlug(slug: string): Article | undefined {
  return getAllArticles().find((article) => article.slug === slug)
}

export function getRelatedArticles(article: Article, limit = 6): Article[] {
  const pool = getAllArticles().filter((item) => item.layout === article.layout && item.slug !== article.slug)
  const sameCategory = pool.filter((item) => item.category === article.category)
  const others = pool.filter((item) => item.category !== article.category)
  return [...sameCategory, ...others].slice(0, limit)
}

export function getArticleAssetUrl(article: Pick<Article, 'assetDirectory'>, filename: string): string {
  return buildArticleAssetUrl(article.assetDirectory, filename)
}
