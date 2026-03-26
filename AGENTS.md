# Blog Project - Codex Context

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
config/_default/     # Hugo 配置 (hugo.toml, params.toml, markup.toml, menu.toml, related.toml)
layouts/             # 自定义页面模板 (覆盖主题)
  home.html          # D3 力导向图首页 (加载 graph.ts)
  single.html        # 文章页 (自定义 TOC 侧栏 + Zima Blue 泳池, 加载 zima.ts)
  list.html          # 重定向到首页
  _partials/         # 自定义 head/footer/article 组件
    head/custom.html       # 字体加载 + 主题初始化脚本 (localStorage)
    footer/footer.html     # 简约页脚
    footer/custom.html     # 空占位
    article/components/footer.html  # 文章页脚 (仅标签)
    section-tree.html      # 递归 section 树构建器 (未活跃使用)
  _default/_markup/render-image.html  # 图片渲染 (Obsidian 路径兼容)
assets/
  ts/graph.ts        # 首页交互式思维导图 (~601 行, 含移动端适配)
  ts/zima.ts         # Zima Blue 泳池动画 - 文章页 (429 行)
  ts/custom.ts       # 主题切换 + 滚动动画 (212 行, 未被任何模板加载)
  ts/cat.ts          # 像素猫群落动画 (494 行, 已弃用，未被模板引用)
  scss/custom.scss   # 所有自定义样式 (~1200 行, 含移动端响应式)
content/post/        # 文章内容，按目录层级组织
static/CNAME         # 自定义域名
.github/workflows/   # GitHub Actions 部署
```

## Key Custom Features
1. **D3 力导向图首页** - 文件路径 → 树结构 → 力导向图，支持展开/折叠/聚焦
2. **Zima Blue 泳池** - Canvas 动画，俯视泳池 + 机器人清洁器巡逻，点击召唤交互；桌面端竖向右侧栏，移动端横向底部
3. **6 色主题系统** - mini-teal/rose/sage/lavender/sand/dark，glassmorphism 风格
4. **自定义 TOC 侧栏** - 桌面端左侧栏显示目录，移动端为固定顶栏 + 下拉面板

## Architecture Decisions
- 只有首页 + 文章页 (disableKinds 关闭了 taxonomy/RSS/sitemap 等)
- 前端 JS 构建文章树结构 (避免 Hugo section 对数字文件夹的限制)
- 图状态用 sessionStorage 持久化
- 主题状态用 localStorage 持久化 (初始化在 head/custom.html 内联脚本)
- 暗色模式始终启用 (scheme = "dark")
- 移动端 (≤768px): 左侧栏变固定顶栏，TOC 变下拉面板，泳池移至文章底部横向显示

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

## Mobile Notes
- `backdrop-filter` 会为 fixed 子元素创建包含块，移动端侧栏不可使用
- 主题 grid.scss 中 `.right-sidebar` 默认隐藏 (仅 lg 断点显示)，自定义 CSS 需用足够高优先级的选择器覆盖
- TOC 下拉面板通过 inline JS (single.html) 切换 `.mobile-open` class
