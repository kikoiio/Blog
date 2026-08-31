# Blog Project - Codex Context

本文件只保留 Codex 需要的高密度入口信息。项目介绍、运行方式和维护说明见 `README.md`。

## Overview

Hugo 个人博客，部署在 GitHub Pages，域名为 `aries727.site`。项目基于 `hugo-theme-stack`，但已自定义首页、文章页、主题样式和多个前端交互。

## Tech Stack

- Hugo 0.158.0 extended
- `hugo-theme-stack` 主题，作为 Git submodule 使用
- TypeScript，由 Hugo Pipes 编译
- SCSS，自定义样式集中在 `assets/scss/custom.scss`
- D3.js v7，用于首页力导向图导航
- GitHub Actions，用于 GitHub Pages 部署

## Key Files

- `README.md`：项目介绍、运行、内容组织、发布和维护说明。
- `config/_default/`：Hugo 配置。
- `layouts/home.html`：首页图导航模板，加载 `assets/ts/graph.ts`。
- `layouts/single.html`：文章页模板，包含自定义 TOC 和 Zima Blue canvas，加载 `assets/ts/zima.ts`。
- `layouts/post/photography.html`：摄影相册页模板（`layout = "photography"` 的页面包使用），全屏图片浏览，加载 `assets/ts/photography.ts`。
- `layouts/_partials/head/custom.html`：字体加载和首屏主题初始化脚本。
- `layouts/_default/_markup/render-image.html`：Obsidian 图片路径兼容。
- `assets/ts/graph.ts`：首页 D3 力导向图逻辑。
- `assets/ts/graph/indexPanel.ts`：深层目录的名称排序笔记索引轨道。
- `assets/ts/zima.ts`：文章页 Zima Blue 泳池动画。
- `assets/ts/custom.ts`：主题切换和滚动动画；会被 Stack 主题 footer script 自动加载。

## Build & Deploy

```bash
hugo server -D
hugo --gc --minify --cleanDestinationDir
```

正式部署由推送到 `master` 后触发的 GitHub Actions 完成。

## Important Notes

- `custom.ts` 不是未使用文件；主题会通过 `themes/hugo-theme-stack/layouts/_partials/footer/components/script.html` 自动加载它。
- 当前 Codex 沙箱内运行 `hugo --gc --minify` 可能因工作区权限边界报 `public/ts/custom...js: Access is denied`；脱离沙箱的真实工作区构建可通过。
- `post` permalink 已从 `:filename` 迁移为 `:contentbasename`。
- 不直接修改主题源文件；自定义布局放在 `layouts/`，自定义样式放在 `assets/scss/custom.scss`。
