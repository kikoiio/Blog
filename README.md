# Aries's Blog

这是 Aries 的个人博客，首页提供冰岛风景漫游，文章区保留计算机笔记与摄影相册。站点使用 Next.js App Router 生成静态文件，可部署到 Cloudflare Pages、GitHub Pages 或其他静态托管服务。

## 本地运行

需要 Node.js 20 或更新版本。

```bash
npm install
npm run dev
```

打开终端显示的本地地址。首页会随机显示一张风景图；点击“下一站”切换风景，按 A–Z 键可以触发音乐。

生产构建：

```bash
npm run lint
npm run build
```

构建结果位于 `out/`。`prebuild` 会把文章页面包中的图片和附件同步到静态资源目录；`.next/`、`out/`、`public/article-assets/` 和 `node_modules/` 不应提交。

## 内容

文章位于 `content/articles/`。目录结构用于分类和资源归属，文章详情页同时提供新的 `/articles/...` 路径与旧站的 `/post/<slug>/` 路径。页面包使用 `index.md`，同目录的图片会作为文章附件或摄影相册资源发布。

当前文章包括：

- Computer Science：AI agent、LLM Gateway、MyCode、Possibility 等笔记。
- Photography：2025 年 7 月和 2025 年 9 月香港相册。

文章 Markdown 使用标准 Markdown 解析，页面包中的相对图片路径会在构建时映射到 `/article-assets/`。

## 项目结构

```text
app/                         Next.js 路由、布局和全局样式
components/                  导航、风景、音乐、文章、相册和 Zima Blue 组件
content/articles/            Markdown 文章及页面包附件
lib/articles.ts              文章发现、front matter 和资源元数据
lib/landscapes.json          27 张风景清单
public/landscapes/           首页风景图
scripts/sync-article-assets.mjs  构建前同步文章附件
docs/                        产品意图、架构、研究和执行计划
```

## 部署

项目使用 `output: 'export'`，Cloudflare Pages 发布目录为 `out`。`.github/workflows/deploy.yml` 会在 `master` 更新后安装依赖、运行 `npm run build`，再发布到名为 `blog` 的 Pages 项目。仓库需要配置 `CLOUDFLARE_API_TOKEN` 和 `CLOUDFLARE_ACCOUNT_ID` 两个 Actions Secret；自定义域名仍需在 Cloudflare Pages 中绑定。
