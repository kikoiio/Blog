# 技术架构

更新日期：2026-11-05。本文档描述当前实现。

## 概述

这是一个 Next.js 16 静态站点，生成完全静态的 HTML/CSS/JS 输出。没有数据库、服务端 API 或在线 CMS。内容以 Markdown 文件形式存储在仓库中。

## 技术栈

- **框架**：Next.js 16（App Router）
- **语言**：TypeScript
- **样式**：Tailwind CSS 4
- **内容**：Markdown + TOML frontmatter
- **部署**：静态导出到 Cloudflare Pages

## 项目结构

```
├── app/                    # Next.js App Router 页面
│   ├── page.tsx           # 首页（笔记索引）
│   ├── articles/          # 文章列表和详情页
│   ├── photography/       # 摄影专辑列表
│   ├── post/              # 旧版文章路由
│   └── layout.tsx         # 根布局（含导航）
├── components/            # React 组件
│   ├── ArticlePage.tsx    # 文章渲染
│   ├── PhotoGallery.tsx   # 摄影展示
│   ├── Navbar.tsx         # 导航栏
│   └── ...
├── content/articles/      # 博客内容（Markdown + 资源）
│   ├── Computer Science/  # 技术文章
│   └── Photography/       # 照片专辑
├── lib/                   # 工具函数
│   └── articles.ts        # 文章加载和解析
├── scripts/               # 构建脚本
│   └── sync-article-assets.mjs  # 复制资源到 public/
└── public/                # 静态资源
    └── article-assets/    # 生成的文章图片（不提交）
```

## 内容模型

文章存储在 `content/articles/` 目录的 Markdown 文件中：

- **页面包**：`index.md` 文件代表完整页面（如摄影专辑）
- **单文件**：普通 `.md` 文件是单篇文章
- **Frontmatter**：TOML 格式（`+++` 分隔符），包含标题、日期、布局
- **资源**：图片和文件与文章存储在一起

文章类型：
- `layout: article` - 标准博客文章（默认）
- `layout: photography` - 照片专辑，带图库视图

## 构建流程

1. **预构建**：`scripts/sync-article-assets.mjs` 将 `content/articles/` 中的非 Markdown 文件复制到 `public/article-assets/`
2. **构建**：`next build --webpack` 在 `out/` 生成静态 HTML
3. **部署**：GitHub Actions 将 `out/` 部署到 Cloudflare Pages

## 核心功能

- **静态生成**：所有页面在构建时预渲染
- **Markdown 渲染**：自定义 AST 渲染器，支持标准 Markdown
- **响应式设计**：移动优先，支持所有设备
- **暗色主题**：统一的深色界面
- **图片优化**：资源从 `public/article-assets/` 提供

## URL 结构

- `/` - 首页，笔记索引
- `/articles` - 所有文章列表
- `/articles/<path>` - 文章详情（规范路径）
- `/post/<slug>` - 旧版文章路由（重定向）
- `/photography` - 摄影专辑列表
- `/photography/<album>` - 照片专辑详情

## 性能

- 静态导出消除服务端渲染开销
- 图片作为静态文件提供（当前未优化）
- 最小 JavaScript 包（仅必要的 React 组件）
- 通过 Cloudflare CDN 快速加载

## 限制

- 当前为全静态输出，无动态内容
- 无用户认证或账户
- 无评论或实时功能（架构上可通过 Cloudflare Workers + D1 扩展，见 deployment.md）
- Next.js 不优化图片（按原样提供）

## 可扩展路径

当前静态导出部署到 Cloudflare Pages。若未来需要动态功能，可迁移到 Cloudflare Workers 全栈架构：

- 移除 `output: 'export'`，通过 `@opennextjs/cloudflare` 部署到 Workers
- D1 数据库存储文章、评论、用户
- R2 存储图片，KV 做缓存，Queue 处理异步任务
- 保留现有 Next.js 代码和内容模型，无需重写
