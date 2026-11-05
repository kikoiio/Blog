# 部署指南

更新日期：2026-11-05。本文档介绍博客的部署方案，全部基于 Cloudflare，无需自建服务器。

## 概述

博客可以部署到 Cloudflare 的两种形态：

- **静态站点**：Next.js 静态导出 → Cloudflare Pages（当前方案）
- **全栈应用**：Next.js → Cloudflare Workers + D1 + R2 + KV + Queue（可扩展方案）

Cloudflare 香港节点对中国大陆访问友好（约 50–150ms 延迟），免费额度对个人博客足够。

## Cloudflare 服务一览

| 服务 | 用途 | 免费额度 |
|------|------|----------|
| **Pages** | 静态站点托管 | 无限带宽、无限请求 |
| **Workers** | 运行后端代码 | 10 万请求/天、10ms CPU/请求 |
| **D1** | SQLite 数据库 | 5GB 存储 |
| **R2** | 对象存储（图片/文件） | 10GB 存储、出口流量免费 |
| **KV** | 键值缓存 | 100k 读/天、1k 写/天 |
| **Queue** | 异步任务队列 | 按量计费，免费额度够用 |
| **Images** | 图片缩放/压缩 | 有免费额度，按量计费 |

全部在 Cloudflare 控制台管理，无需任何服务器。

## 方案 A：静态部署（当前）

适合：只展示内容，不需要动态功能。

```bash
npm run build   # 生成 out/ 目录
```

- 构建命令：`npm run build`
- 输出目录：`out`
- Node 版本：22

优点：最简单、最快、零运维。
缺点：无评论、无用户系统、无动态内容。

## 方案 B：全栈部署（可扩展）

适合：需要评论、用户系统、动态内容等功能。

架构：

```
Next.js 应用 → Cloudflare Workers（运行时）
                ├── D1        文章/评论/用户数据
                ├── R2        图片和文件存储
                ├── KV        缓存和 session
                └── Queue     异步任务（通知、索引等）
```

可实现的功能：

- **评论系统**：读者评论存入 D1，支持审核
- **用户认证**：GitHub OAuth 或邮箱登录（参考 flare-stack-blog 的 Better Auth 方案）
- **图片托管**：上传到 R2，配合 Images 做缩放压缩
- **草稿/发布流程**：管理员后台管理文章状态
- **通知**：Queue 异步处理邮件/推送
- **搜索**：D1 全文检索或外部服务

部署方式：

- 使用 `@opennextjs/cloudflare` 或 `@cloudflare/next-on-pages` 将 Next.js 部署到 Workers
- 移除 `next.config.ts` 中的 `output: 'export'`
- 在 Cloudflare 控制台创建 D1、R2、KV、Queue 资源
- 用 `wrangler.toml` 声明绑定关系

参考项目：[du2333/flare-stack-blog](https://github.com/du2333/flare-stack-blog) 展示了完整的 Cloudflare 全家桶博客架构（Workers + D1 + R2 + KV + Queue + OAuth），但我们保留自己的 Next.js 代码和设计。

## 方案 C：混合部署

前端静态导出到 Pages，动态功能走 Workers API：

```
静态页面 → Cloudflare Pages（快速、缓存友好）
API/评论 → Cloudflare Workers + D1（动态功能）
图片     → R2 + CDN 域名
```

适合渐进式迁移：先保持静态，评论等功能后加。

## 图片方案

### 当前：图片随仓库

- 存储在 `content/articles/`，构建时复制到 `public/article-assets/`
- 仓库约 139MB（主要是摄影 JPG）

### 可选：R2 图床（推荐用于全栈方案）

```bash
# 上传图片到 R2
wrangler r2 object put blog-media/path/to/image.webp --file=image.webp
```

- 免费 10GB 存储，出口流量免费
- 可绑定自定义域名（如 `img.aries727.site`）
- 配合 Images 服务自动压缩/转 WebP
- 文章中直接引用 R2 URL

### 可选：国内图床（中国大陆加速）

若 R2 在国内速度不理想：

- **七牛云**：10GB 存储 + 10GB 流量/月免费
- **腾讯云 COS**：50GB 存储 + 10GB 流量（6 个月）免费

图片压缩为 WebP 后体积可降 30–50%。

## 域名与 DNS

- 域名需托管在 Cloudflare（免费 DNS）
- Pages/Workers 自动提供 SSL 证书
- 可绑定自定义域名和子域名

## 免费额度估算（个人博客）

| 资源 | 预计用量 | 免费额度 | 结论 |
|------|----------|----------|------|
| Workers 请求 | <1 万/天 | 10 万/天 | 够用 |
| D1 存储 | <100MB | 5GB | 够用 |
| R2 存储 | <1GB（压缩后） | 10GB | 够用 |
| KV | 少量 | 10 万读/天 | 够用 |
| Pages 带宽 | 无限 | 无限 | 够用 |

结论：个人博客全部功能都在免费额度内。

## 迁移路径建议

1. **现在**：保持静态部署，专注内容
2. **需要评论时**：添加 Workers API + D1（混合方案 C）
3. **需要用户系统时**：完整迁移到 Workers（方案 B）
4. **图片变大时**：迁移到 R2

每一步都向后兼容，不需要一次性重写。

## 部署检查清单

部署前：

- [ ] 运行 `npm run lint` 检查代码质量
- [ ] 运行 `npm run build` 验证构建
- [ ] 检查所有文章链接是否正常
- [ ] 验证图片是否正确加载
- [ ] 从中国大陆测试访问速度

## 故障排除

### 构建失败

- 检查 Node.js 版本（需要 20+）
- 清除 `.next` 和 `out` 目录
- 运行 `npm ci` 重新安装依赖

### Workers 部署问题

- 检查 `wrangler.toml` 绑定配置
- 确认 D1/R2/KV 资源已创建
- 查看 `wrangler tail` 实时日志

### 图片问题

- 验证图片路径
- 检查 R2 存储桶权限
- 确保图片不超过 25MB（Pages 限制）
