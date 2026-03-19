---
title: "博客搭建记录"
description: "使用 Hugo + GitHub Pages 搭建免费博客"
date: 2026-03-19
categories:
    - 计算机笔记
tags:
    - Hugo
    - 博客
    - GitHub Pages
---

## 为什么选择 Hugo + GitHub Pages？

- **完全免费**：GitHub Pages 提供免费托管
- **速度快**：Hugo 是最快的静态站点生成器
- **易于维护**：Markdown 写作，Git 管理
- **自定义域名**：支持绑定自己的域名

## 技术栈

| 组件 | 选择 |
|------|------|
| 静态生成器 | Hugo |
| 主题 | Stack |
| 托管 | GitHub Pages |
| 域名 | aries727.site |

## 写作流程

1. 在 `content/post/` 下新建 Markdown 文件
2. 编写内容
3. `hugo server` 本地预览
4. 推送到 GitHub，自动部署

```bash
# 新建文章
hugo new content post/cs-notes/my-new-post/index.md

# 本地预览
hugo server -D

# 构建
hugo
```

Happy blogging!
