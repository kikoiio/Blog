export type Article = {
  directory?: string
  slug: string
  title: string
  description: string
  date: string | null
  category: string | null
  cover: string | null
  album: string | null
  html: string
  toc: { id: string; title: string; level: number }[]
}

export type ArticleMetadata = Omit<Article, 'html' | 'toc'>

export type ArticleIndexEntry = ArticleMetadata & { bodySrc: string }

export type ArticleIndex = ArticleIndexEntry[]
