import { notFound } from 'next/navigation'
import ArticlePage from '@/components/ArticlePage'
import { getAllArticles, getArticleByRoutePath } from '@/lib/articles'

export function generateStaticParams() {
  return getAllArticles().map((article) => ({
    slug: article.routePath.split('/'),
  }))
}

export const dynamicParams = false

export default async function ArticleRoute({
  params,
}: {
  params: Promise<{ slug: string[] }>
}) {
  const { slug } = await params
  const article = getArticleByRoutePath(slug.join('/'))
  if (!article) notFound()

  return <ArticlePage article={article} />
}
