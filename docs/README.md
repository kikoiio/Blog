# 文档索引

| 文档 | 说明 | 更新日期 |
|------|------|----------|
| [项目入口](../README.md) | 完整本地归档、图片画廊、目标发布流程与当前状态 | 2026-11-06 |
| [intent.md](intent.md) | R2 原件与公开衍生图片分离、清单版本安全及功能边界 | 2026-11-06 |
| [deployment.md](deployment.md) | 双 Worker 权限、OAuth 上传、CI 密钥、首次配置与单命令发布 | 2026-11-06 |

已授权方案：本地保留完整 `blogs/`、`pictures/`；私有 `Aries-Archive` 仅存 `release.json`、`README.md` 和 `.gitignore`；本地用 Wrangler OAuth REST 向私有 R2 上传原件及版本清单，并按 revision 触发网站工作流；CI 经鉴权的 `folio-build` 读取清单、处理并上传 WebP，通过只读 `folio-media` 的 `workers.dev` 地址公开图片，Pages 托管静态站点。CI 无需读取私有 GitHub 归档，现有 Cloudflare API token 仅用于 Pages 部署。

用户已告知 R2 激活；Workers 与发布部署仍在进行，尚未确认生产发布成功。当前 UI 为图片画廊，`blogs/` 为空且文章页面未实现。
