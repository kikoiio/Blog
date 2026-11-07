# Folio

一个展示照片和文字的个人网站，基于 Next.js、React 和 TypeScript。

## 开始使用

需要 Node.js 22.18 或更新版本。

```bash
npm ci
cp .env.example .env.local
npm run dev
```

打开 [localhost:3000](http://localhost:3000)。在 `.env.local` 中设置 `FOLIO_SITE_TITLE` 可修改站点名称。

## 添加内容

将 `.env.local` 中的 `FOLIO_ARCHIVE_PATH` 指向项目外的内容目录：

```text
My-Content/
├── blogs/
│   └── hello.md
└── pictures/
    └── trip/
        └── 01.jpg
```

文章使用 Markdown，一级标题作为默认标题；每个包含图片的文件夹成为相册。保留 `blogs/` 和 `pictures/` 两个目录，其下可自由组织，不用的目录留空。

修改内容后刷新页面，修改配置后重启服务。`FOLIO_ARCHIVE_PATH` 留空时预览空站点。

## 发布

使用 Cloudflare Pages、R2 和 GitHub Actions。

1. 将网站代码推送到 GitHub，启用 Actions；在 Cloudflare 启用 R2、`workers.dev` 并创建 Pages 项目。
2. 安装并登录 Wrangler 和 GitHub CLI，按 [.env.example](.env.example) 填写发布配置。
3. 在 GitHub 仓库的 Actions Secrets 中设置 `CLOUDFLARE_ACCOUNT_ID` 和拥有 `Pages: Edit` 权限的 `CLOUDFLARE_API_TOKEN`。

首次配置资源：

```bash
node scripts/setup-cloudflare.mjs
```

发布内容，以后更新也运行同一命令：

```bash
npm run publish
```

在 GitHub Actions 查看部署结果。R2 桶保持私有，网站上的图片、文章和附件会公开。
