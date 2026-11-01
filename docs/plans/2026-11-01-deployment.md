# 部署计划

状态：active。更新：2026-11-01。

Next.js 静态站点已经在本地完成迁移和构建验证。当前构建使用 `npm run build`，发布目录为 `out`；部署阶段只剩需要 GitHub、Cloudflare、DNS 或外部网络权限的事项。

## 已完成的部署准备

- `next.config.ts` 已启用 `output: 'export'`，生成可直接托管的静态目录。
- Cloudflare Pages 的构建命令确定为 `npm run build`，输出目录确定为 `out`。
- 已加入 `.github/workflows/deploy.yml`，生产分支 `master` 更新后自动构建并发布到 `blog` Pages 项目。
- 已加入 `wrangler.toml`，记录 Pages 项目名和 `out` 发布目录。
- 本地已验证 lint、TypeScript 和静态构建；构建生成首页、文章列表、7 个 `/post/` 旧入口、7 个 `/articles/` 入口及文章附件。
- 旧 Hugo 主题、子模块和 Hugo Actions 已从运行路径移除，不再需要验证 `hugo-theme-stack` 或迁移 Hugo 工作流。

## 图片存储与 CDN

当前图片仍随项目源文件保存，构建时复制到 `public/article-assets/`。部署前可将较大的摄影附件迁移到独立图片仓库，并通过 jsDelivr 引用：

```text
https://cdn.jsdelivr.net/gh/{owner}/{repo}@{tag-or-commit}/{path}
```

待完成事项：

1. 盘点照片使用场景，生成合适尺寸和 WebP 版本，并确认单文件体积。
2. 创建或确认独立图片仓库，上传优化后的资源。
3. 将文章中的资源地址切换到稳定的 tag 或 commit URL。
4. 从中国大陆和国际网络分别验证图片加载与缓存。

图片优化和上传涉及外部存储、网络和账号权限；在获得明确授权前保留当前仓库内资源方案。

## Cloudflare Pages 与域名

待完成事项：

1. 在 Cloudflare Pages 创建名为 `blog` 的项目，生产分支设为 `master`。
2. 在 GitHub 仓库添加 `CLOUDFLARE_API_TOKEN` 和 `CLOUDFLARE_ACCOUNT_ID` 两个 Actions Secret。
3. 推送 `master`，确认 Actions 完成构建并发布到 Pages 预览域名。
4. 将 `aries727.site` 接入 Pages，配置 DNS 和自定义域名证书。
5. 在真实域名上检查新旧文章路径、移动端布局、图片和跨网络访问。

这些操作会写入 GitHub、Cloudflare 或 DNS 账户，需要用户提供相应授权后才能执行。

## 可选回退

如果暂不使用 Cloudflare Pages，可以把同一个 `out/` 目录发布到 GitHub Pages 或其他静态托管服务。当前仓库没有保留 Hugo 专用部署配置；回退方案只需要适配目标平台的静态目录发布方式。
