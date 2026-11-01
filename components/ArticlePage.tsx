import Link from 'next/link'
import { Fragment, jsx, jsxs } from 'react/jsx-runtime'
import { fromMarkdown } from 'mdast-util-from-markdown'
import { toHast } from 'mdast-util-to-hast'
import { toJsxRuntime } from 'hast-util-to-jsx-runtime'
import type { Article } from '@/lib/articles'
import { getArticleAssetUrl } from '@/lib/articles'
import PhotoGallery from '@/components/PhotoGallery'
import ZimaCanvas from '@/components/ZimaCanvas'

interface ArticlePageProps {
  article: Article
}

function rewriteMarkdownImages(content: string, assetDirectory: string): string {
  return content.replace(/(!\[[^\]]*\]\()([^\s)]+)(\))/g, (match, prefix: string, source: string, suffix: string) => {
    if (source.startsWith('/') || source.startsWith('http://') || source.startsWith('https://')) return match
    return `${prefix}${getArticleAssetUrl({ assetDirectory }, source)}${suffix}`
  })
}

function renderMarkdown(content: string, assetDirectory: string) {
  const markdown = rewriteMarkdownImages(content, assetDirectory)
  return toJsxRuntime(toHast(fromMarkdown(markdown)), {
    Fragment,
    elementAttributeNameCase: 'react',
    jsx,
    jsxs,
  })
}

export default function ArticlePage({ article }: ArticlePageProps) {
  const isPhotography = article.layout === 'photography'

  return (
    <main className={`article-page${isPhotography ? ' photography-page' : ''}`}>
      <div className="article-shell">
        <Link href="/articles" className="back-link">
          ← 返回文章
        </Link>

        <header className="article-header">
          <p className="eyebrow">{article.category}</p>
          <h1>{article.title}</h1>
          {article.date && <time dateTime={article.date}>{article.date}</time>}
        </header>

        {isPhotography ? (
          <div className="photography-layout">
            <PhotoGallery photos={article.photos} />
            <aside className="zima-panel">
              <ZimaCanvas />
              <p>点击池面，让清洁机器人驶向那里。</p>
            </aside>
          </div>
        ) : (
          <article className="article-content">{renderMarkdown(article.content, article.assetDirectory)}</article>
        )}
      </div>
    </main>
  )
}
