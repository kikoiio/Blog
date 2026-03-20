# Blog Project - Claude Code Context

## Overview
Hugo 个人博客，部署在 GitHub Pages (aries727.site)。基于 hugo-theme-stack 主题，包含大量自定义功能。

## Tech Stack
- Hugo 0.158.0 (extended) + hugo-theme-stack 主题 (Git submodule)
- TypeScript (Hugo Pipes 编译)
- SCSS
- D3.js v7 (首页图导航)
- GitHub Actions 部署

## Project Structure
```
config/_default/     # Hugo 配置 (hugo.toml, params.toml, markup.toml, menu.toml)
layouts/             # 自定义页面模板 (覆盖主题)
  home.html          # D3 力导向图首页
  single.html        # 文章页 (自定义 TOC 侧栏 + Zima Blue 泳池)
  list.html          # 重定向到首页
  _partials/         # 自定义 head/footer 等
assets/
  ts/graph.ts        # 首页交互式思维导图 (587 行)
  ts/zima.ts         # Zima Blue 泳池动画 - 右侧栏 (429 行)
  ts/cat.ts          # 像素猫群落动画 (494 行, 已弃用，未被模板引用)
  ts/custom.ts       # 主题切换 + 滚动动画 (212 行)
  scss/custom.scss   # 所有自定义样式 (~1080 行)
content/post/        # 文章内容，按目录层级组织
static/CNAME         # 自定义域名
.github/workflows/   # GitHub Actions 部署
```

## Key Custom Features
1. **D3 力导向图首页** - 文件路径 → 树结构 → 力导向图，支持展开/折叠/聚焦
2. **Zima Blue 泳池** - Canvas 动画，俯视泳池 + 机器人清洁器巡逻，点击召唤交互
3. **6 色主题系统** - mini-teal/rose/sage/lavender/sand/dark，glassmorphism 风格
4. **自定义 TOC 侧栏** - 左侧栏显示文章目录，移动端自适应

## Architecture Decisions
- 只有首页 + 文章页 (disableKinds 关闭了 taxonomy/RSS/sitemap 等)
- 前端 JS 构建文章树结构 (避免 Hugo section 对数字文件夹的限制)
- 图状态用 sessionStorage 持久化
- 主题状态用 localStorage 持久化
- 暗色模式始终启用 (scheme = "dark")

## Build & Deploy
```bash
hugo server -D          # 本地开发
hugo --gc --minify      # 生产构建
bash deploy.sh "msg"    # 快速提交推送 (默认消息 "更新笔记")
```
Push to master 自动触发 GitHub Actions 部署。

## Conventions
- 语言: zh-cn
- 永久链接格式: `/:sections/:filename/`
- 字体: Inter + Noto Sans SC + JetBrains Mono
- 文章 frontmatter: date, draft, title
- 自定义样式全部在 `assets/scss/custom.scss`，不修改主题源文件
- 自定义布局在 `layouts/` 覆盖主题模板
