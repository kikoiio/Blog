import { notFound } from 'next/navigation'
import ArticlePage from '@/components/ArticlePage'
import { decodeRouteParam, getAllArticles, getArticleBySlug, getRelatedArticles } from '@/lib/articles'

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
  const article = getArticleBySlug(decodeRouteParam(slug))
  if (!article) notFound()

  return (
    <ArticlePage
      article={article}
      related={getRelatedArticles(article).map((item) => ({
        href: `/post/${item.slug}`,
        title: item.title,
        virtualPath:
          item.layout === 'photography' ? `photography/${item.slug}.md` : `articles/${item.routePath}.md`,
      }))}
    />
  )
}
