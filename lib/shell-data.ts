import { getAllArticles, type ArticleLayout } from '@/lib/articles'

export interface ShellFile {
  category: string
  content: string
  date: string
  href: string
  layout: ArticleLayout
  photoCount: number
  routePath: string
  slug: string
  title: string
}

export function getShellFiles(): ShellFile[] {
  return getAllArticles().map((article) => ({
    category: article.category,
    content: article.content,
    date: article.date,
    href: `/post/${article.slug}`,
    layout: article.layout,
    photoCount: article.photos.length,
    routePath: article.routePath,
    slug: article.slug,
    title: article.title,
  }))
}
