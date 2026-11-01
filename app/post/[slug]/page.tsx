import { notFound } from 'next/navigation'
import ArticlePage from '@/components/ArticlePage'
import { getAllArticles, getArticleBySlug } from '@/lib/articles'

export function generateStaticParams() {
  return getAllArticles().map((article) => ({ slug: article.slug }))
}

export const dynamicParams = false

export default async function LegacyArticleRoute({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const article = getArticleBySlug(slug)
  if (!article) notFound()

  return <ArticlePage article={article} />
}
