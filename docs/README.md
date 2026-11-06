# 文档索引

| 文档 | 说明 | 更新日期 |
|---|---|---|
| [项目入口](../README.md) | 通用框架、归档结构、首次配置、日常更新与命令 | 2026-11-06 |
| [intent.md](intent.md) | 使用约定、发布架构和功能边界 | 2026-11-06 |
| [deployment.md](deployment.md) | 配置与权限、发布和恢复、实例资源与生产验证记录 | 2026-11-06 |

完整本地归档保留 `blogs/` 和 `pictures/`；归档无需 Git，R2 保存原件与发布清单。首次运行 `node scripts/setup-cloudflare.mjs` 配置资源，日常运行 `npm run publish`；CI 经鉴权 Worker 恢复所列原件，在云端生成 WebP 与配色并部署 Pages。

当前 UI 为图片画廊，`blogs/` 为空，文章页面未实现。2026-11-06 的生产发布及桌面、手机验证记录见部署文档。
