# 当前架构

更新：2026-11-01。本文描述仓库当前实现，产品目标见 [intent.md](intent.md)，执行状态见 [plans/2026-11-01-implementation.md](plans/2026-11-01-implementation.md)。

## 运行边界

这是一个 Next.js 16 App Router 静态导出站点：`next build --webpack` 运行服务端组件并生成 `out/`，浏览器只加载静态 HTML、CSS、JavaScript 和 `public/` 资源。项目没有数据库、服务端 API 或在线 CMS。

`next.config.ts` 开启 `output: 'export'`，图片使用 `unoptimized`，并把构建 worker 限制为一个，适应本机有限内存。生产构建使用 Webpack；本项目不依赖 Turbopack 的 CSS loader。

## 页面与数据流

```mermaid
flowchart TD
  Content[content/articles Markdown 页面包] --> Articles[lib/articles.ts]
  Articles --> Listing[app/articles/page.tsx]
  Articles --> Canonical[app/articles/[...slug]/page.tsx]
  Articles --> Legacy[app/post/[slug]/page.tsx]
  Listing --> ArticlePage[components/ArticlePage.tsx]
  Canonical --> ArticlePage
  Legacy --> ArticlePage
  ArticlePage --> Markdown[Markdown AST 渲染]
  ArticlePage --> Photos[PhotoGallery + ZimaCanvas]
  Assets[scripts/sync-article-assets.mjs] --> Public[public/article-assets]
  Public --> Markdown
  Public --> Photos
```

首页由 `app/page.tsx` 组合三个客户端交互：

- `LandscapeContainer` 从 `lib/landscapes.json` 随机选择 27 张风景，使用 Framer Motion 淡入、缩放并避免连续重复。
- `MusicPlayer` 延迟导入 `bellowsjs`，将 A–Z 映射到 MIDI 音高，音量由界面滑块控制。
- `Navbar` 提供风景、文章和关于三个入口。

## 文章模型

`lib/articles.ts` 从 `content/articles/` 递归发现 `.md` 文件。`index.md` 被视为页面包，目录名作为旧站 slug；普通 Markdown 文件使用文件名作为 slug。每篇文章包含分类、日期、布局、资源目录和照片清单。

文章列表链接到 `/post/<slug>`，保持旧站按 `contentbasename` 生成的入口。`/articles/<path>` 同时保留完整内容路径，便于分类浏览。摄影页面识别 `layout = "photography"`，加载同目录图片，并显示照片切换、缩放、键盘导航和 Zima Blue 池面动画。

文章正文使用 `mdast-util-from-markdown`、`mdast-util-to-hast` 和 `hast-util-to-jsx-runtime` 渲染标准 Markdown。构建前脚本把页面包附件复制到 `public/article-assets/`，所以相对图片在静态导出后仍可访问。

## 静态资源

- `public/landscapes/` 保存首页使用的 27 张风景图。
- `content/articles/` 保存文章附件的源文件。
- `public/article-assets/` 是构建生成目录，不提交到 Git。
- 当前附件包含原始 JPG 和 PNG，部署前仍可进一步转 WebP、缩小照片并上传到独立 CDN 仓库。

## 验证入口

```bash
npm run lint
npx tsc --noEmit
npm run build
```

构建结果应包含首页、关于页、文章列表、7 个旧 `/post/` 文章入口、7 个 `/articles/` 文章入口和文章附件。
