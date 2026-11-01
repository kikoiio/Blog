import Link from 'next/link'
import Navbar from '@/components/Navbar'
import { getAllArticles } from '@/lib/articles'

export default function ArticlesPage() {
  const articles = getAllArticles()

  return (
    <>
      <Navbar />
      <div className="listing-page">
        <div className="listing-shell">
          <h1>文章</h1>
          <div className="article-list">
            {articles.map((article) => (
              <Link
                key={article.slug}
                href={`/post/${article.slug}`}
                className="article-card"
              >
                <h2>{article.title}</h2>
                <p className="article-card-type">
                  {article.layout === 'photography' ? '摄影相册' : '技术文章'}
                </p>
                <div className="article-card-meta">
                  {article.category} · {article.date}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
