import { getWritings } from '@/lib/articles'

// `ls -l ~/articles` — a static deep-link fallback for the writings
// index. The real browsing happens in the home terminal (`ls` / `cat`).

export default function ArticlesPage() {
  const writings = getWritings()
  const byCategory = new Map<string, typeof writings>()
  for (const article of writings) {
    const list = byCategory.get(article.category) ?? []
    list.push(article)
    byCategory.set(article.category, list)
  }

  return (
    <div className="file-wrap">
      <header className="file-head">
        <span className="file-head-marker">==&gt; ~/articles &lt;==</span>
        <h1 className="file-title">技术笔记</h1>
        <div className="file-meta">{writings.length} 篇文章 · 在首页终端里用 cat 直接阅读</div>
      </header>

      <div className="ls-table">
        {[...byCategory.entries()].map(([category, articles]) => (
          <div key={category}>
            <div className="ls-row t-line">
              <span className="ls-name">{category}/</span>
            </div>
            {articles.map((article) => (
              <div key={article.slug} className="ls-row t-line">
                <span className="ls-perm" style={{ paddingLeft: '2ch' }}>
                  -rw-r--r--
                </span>
                <span className="ls-date">{article.date || '-'}</span>
                <span className="ls-size">
                  {Math.max(1, Math.ceil(article.content.length / 1024)).toFixed(0)}K
                </span>
                <span className="ls-name">{article.routePath}.md</span>
                <span className="ls-comment"># {article.title}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="file-related">
        <h3 className="file-related-title">── 操作提示 ──</h3>
        <div className="file-related-item t-line">
          <span className="t-accent">cat ~/articles/&lt;路径&gt;.md</span>
          <span className="t-faint">  # 在终端里直接读</span>
        </div>
        <div className="file-related-item t-line">
          <span className="t-accent">less ~/articles/&lt;路径&gt;.md</span>
          <span className="t-faint">  # 用带图视图打开</span>
        </div>
      </div>
    </div>
  )
}
