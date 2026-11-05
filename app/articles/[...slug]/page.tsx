import { notFound } from 'next/navigation'
import ArticlePage from '@/components/ArticlePage'
import { decodeRouteParam, getAllArticles, getArticleByRoutePath, getRelatedArticles } from '@/lib/articles'

export function generateStaticParams() {
  const articles = getAllArticles()
  const params: { slug: string[] }[] = []
  for (const article of articles) {
    const raw = article.routePath.split('/')
    params.push({ slug: raw })
    const encoded = raw.map(encodeURIComponent)
    if (encoded.some((part, i) => part !== raw[i])) {
      params.push({ slug: encoded })
    }
  }
  return params
}

export const dynamicParams = false

export default async function ArticleRoute({
  params,
}: {
  params: Promise<{ slug: string[] }>
}) {
  const { slug } = await params
  const article = getArticleByRoutePath(slug.map(decodeRouteParam).join('/'))
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
