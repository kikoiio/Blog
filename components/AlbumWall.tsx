import type { Article } from '@/lib/articles'

// `ls -l ~/photography` — albums listed as plain terminal output.
// They are opened with `open photography/<slug>.md`, not by clicking.

export default function AlbumWall({ albums }: { albums: Article[] }) {
  return (
    <div className="file-wrap">
      <header className="file-head">
        <span className="file-head-marker">==&gt; ~/photography &lt;==</span>
        <h1 className="file-title">摄影相册</h1>
        <div className="file-meta">{albums.length} 本相册 · 输入 open photography/&lt;名称&gt; 打开</div>
      </header>

      {albums.length === 0 ? (
        <div className="t-line t-faint">ls: 暂无相册。</div>
      ) : (
        <div className="ls-table">
          {albums.map((album) => (
            <div key={album.slug} className="ls-row t-line">
              <span className="ls-perm">-rw-r--r--</span>
              <span className="ls-date">{album.date || '-'}</span>
              <span className="ls-size">{album.photos.length} photos</span>
              <span className="ls-name">photography/{album.slug}.md</span>
              <span className="ls-comment"># {album.title}</span>
            </div>
          ))}
        </div>
      )}

      <div className="file-related">
        <h3 className="file-related-title">── 操作提示 ──</h3>
        <div className="file-related-item t-line">
          <span className="t-accent">open photography/&lt;名称&gt;.md</span>
          <span className="t-faint">  # 打开相册(照片要在浏览器视图里看)</span>
        </div>
        <div className="file-related-item t-line">
          <span className="t-accent">cd ~</span>
          <span className="t-faint">  # 回到家目录</span>
        </div>
      </div>
    </div>
  )
}
