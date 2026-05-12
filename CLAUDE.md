# Blog Project - Claude Context

此文件已瘦身为 Claude 入口摘要，完整维护文档见 `PROJECT_GUIDE.md`。

## Source of Truth

- 主文档：`PROJECT_GUIDE.md`
- Codex 入口：`AGENTS.md`

## Current Project

Hugo 个人博客，基于 `hugo-theme-stack`，部署到 GitHub Pages。项目核心自定义包括：

- 首页 D3 力导向图导航：`layouts/home.html` + `assets/ts/graph.ts`
- 文章页自定义 TOC 和 Zima Blue canvas：`layouts/single.html` + `assets/ts/zima.ts`
- 主题初始化和切换：`layouts/_partials/head/custom.html` + `assets/ts/custom.ts`
- 自定义样式：`assets/scss/custom.scss`

## Maintenance Notes

- `assets/ts/custom.ts` 会被 Stack 主题 footer script 自动加载，不要再标记为未使用。
- `assets/ts/cat.ts` 和 `layouts/_partials/section-tree.html` 是遗留项，是否删除需按 `PROJECT_GUIDE.md` 的路线确认。
- `IMPLEMENTATION.md` 已不再作为可信主文档；后续应归档或删除。
- 构建、文档整合、前端拆分、SEO 和部署脚本优化均以 `PROJECT_GUIDE.md` 的优先级为准。
