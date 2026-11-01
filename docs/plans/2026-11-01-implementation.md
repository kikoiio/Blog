# 实施计划

状态：implemented。复核日期：2026-11-01。

本计划记录 Hugo 博客迁移到 Next.js 静态站点的实施结果。外部图片仓库、Cloudflare Pages 项目和 DNS 配置属于部署计划，见 [2026-11-01-deployment.md](2026-11-01-deployment.md)。

## 已完成

1. 创建 Next.js 16 App Router 项目，启用 TypeScript、ESLint 和静态导出。
2. 建立首页风景漫游、固定导航和关于页。
3. 迁移 27 张冰岛风景图与清单，完成随机切换、淡入缩放和响应式布局。
4. 集成 `bellowsjs`，完成 A–Z 键盘演奏和音量控制。
5. 递归迁移计算机文章和摄影页面包，共发现 7 篇可访问文章与 2 个摄影相册。
6. 新增 `/articles/<path>` 文章路径，并保留 `/post/<slug>` 旧路径入口。
7. 用标准 Markdown AST 替代不兼容的 MDX 解析，支持代码块、列表、引用和相对图片。
8. 构建前同步文章附件，确保 SVG、PNG 和照片在静态输出中可访问。
9. 完成摄影浏览器：上一张/下一张、方向键、点击缩放、Esc 还原。
10. 迁移轻量 Zima Blue Canvas 动画，支持点击池面召唤机器人。
11. 将页面样式改为项目自有 CSS，确保 Webpack 静态构建与开发环境一致。

## 关键实现

| 目标 | 证据 |
| --- | --- |
| 首页直接进入风景漫游 | `app/page.tsx`、`components/LandscapeContainer.tsx` |
| A–Z 触发不同音高 | `components/MusicPlayer.tsx` |
| 文章和相册可访问 | `lib/articles.ts`、`app/articles/[...slug]/page.tsx`、`app/post/[slug]/page.tsx` |
| 旧文章入口保留 | `app/post/[slug]/page.tsx`，构建生成 7 个 `/post/` 页面 |
| 页面包资源可访问 | `scripts/sync-article-assets.mjs`、`public/article-assets/`、`out/article-assets/` |
| 摄影交互保留 | `components/PhotoGallery.tsx`、`components/ZimaCanvas.tsx` |

## 验证结果

- `npm run lint`：通过。
- `npx tsc --noEmit`：通过。
- `npm run build`：通过，使用 Next.js 16.4.3 Webpack，生成 20 个静态页面。
- 生成的 `out/` 包含 7 个旧 `/post/` 页面、7 个 `/articles/` 页面和 39 个文章附件。

## 不再沿用的方案

- 旧 Hugo 主题、模板、SCSS、D3 图导航和 Hugo Pipes 已由 Next.js 页面替代。
- 初版计划中的 `getStaticProps`/`getStaticPaths` 不适用于 App Router；动态页面改用 `generateStaticParams`。
- 文章内容按标准 Markdown 解析，不把普通文本中的尖括号解释成 JSX。

## 后续交给部署计划

实现工作已经落地。仍需外部账户或 DNS 权限的工作包括：优化照片体积、创建或确认图片仓库、上传 CDN 资源、创建 Cloudflare Pages 项目、配置自定义域名，并在真实域名上做跨网络访问验证。
