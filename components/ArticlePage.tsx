import { Fragment, jsx, jsxs } from 'react/jsx-runtime'
import { fromMarkdown } from 'mdast-util-from-markdown'
import { toHast } from 'mdast-util-to-hast'
import { toJsxRuntime } from 'hast-util-to-jsx-runtime'
import type { Article } from '@/lib/articles'
import { getArticleAssetUrl } from '@/lib/articles'
import PhotoGallery from '@/components/PhotoGallery'

export interface RelatedLink {
  href: string
  title: string
  virtualPath: string
}

interface ArticlePageProps {
  article: Article
  related: RelatedLink[]
}

function rewriteMarkdownImages(content: string, assetDirectory: string): string {
  return content.replace(
    /(!\[[^\]]*\]\()([^\s)]+)(\))/g,
    (match, prefix: string, source: string, suffix: string) => {
      if (source.startsWith('/') || source.startsWith('http://') || source.startsWith('https://')) {
        return match
      }
      return `${prefix}${getArticleAssetUrl({ assetDirectory }, source)}${suffix}`
    }
  )
}

function stripRedundantHeading(content: string, title: string): string {
  const trimmed = content.trimStart()
  const match = /^#\s+(.+)$/m.exec(trimmed)
  if (match && match.index < 40) {
    const headingText = match[1].trim()
    if (headingText === title.trim() || headingText.toLowerCase() === title.trim().toLowerCase()) {
      return trimmed.slice(0, match.index) + trimmed.slice(match.index + match[0].length).trimStart()
    }
  }
  return content
}

function renderMarkdown(content: string, assetDirectory: string, title: string) {
  const cleanContent = stripRedundantHeading(content, title)
  const markdown = rewriteMarkdownImages(cleanContent, assetDirectory)
  return toJsxRuntime(toHast(fromMarkdown(markdown)), {
    Fragment,
    elementAttributeNameCase: 'react',
    jsx,
    jsxs,
  })
}

function estimateReadingTime(content: string): string {
  if (!content) return '1 分钟阅读'
  const charCount = content.replace(/\s+/g, '').length
  const minutes = Math.max(1, Math.ceil(charCount / 380))
  return `${minutes} 分钟阅读`
}

export default function ArticlePage({ article, related }: ArticlePageProps) {
  const isPhotography = article.layout === 'photography'
  const readTime = isPhotography ? `${article.photos.length} 张照片` : estimateReadingTime(article.content)
  const virtualPath = isPhotography
    ? `~/photography/${article.slug}.md`
    : `~/articles/${article.routePath}.md`

  return (
    <div className="file-wrap">
      <header className="file-head">
        <span className="file-head-marker">==&gt; {virtualPath} &lt;==</span>
        <h1 className="file-title">{article.title}</h1>
        <div className="file-meta">
          {isPhotography ? '摄影相册' : article.category}
          {article.date && (
            <>
              <span className="sep">·</span>
              <time>{article.date}</time>
            </>
          )}
          <span className="sep">·</span>
          <span>{readTime}</span>
        </div>
      </header>

      {isPhotography ? (
        <PhotoGallery photos={article.photos} />
      ) : (
        <article className="article-content">
          {renderMarkdown(article.content, article.assetDirectory, article.title)}
        </article>
      )}

      {related.length > 0 && (
        <section className="file-related" aria-label="延伸阅读">
          <h3 className="file-related-title">── 延伸文件 ──</h3>
          {related.map((item) => (
            <div key={item.href} className="file-related-item t-line">
              <span className="t-accent">less ~/{item.virtualPath}</span>
              <span className="t-faint">  # {item.title}</span>
            </div>
          ))}
        </section>
      )}
    </div>
  )
}
