# Folio

一个展示照片和文字的个人网站，基于 Next.js、React 和 TypeScript。公开仓库是可复用的网站框架，个人资料、图标和内容保存在仓库外。

## 开始使用

需要 Node.js 22.18 或更新版本。

```bash
npm ci
cp .env.example .env.local
npm run dev
```

打开 [localhost:3000](http://localhost:3000)。不配置内容目录也能预览默认空站点。

## 个人配置与内容

将 `.env.local` 中的 `FOLIO_ARCHIVE_PATH` 指向项目外的独立目录：

```text
My-Content/
├── site/                  # 可选：个人品牌与联系方式
│   ├── config.json
│   └── icon.png
├── blogs/
│   └── hello.md
└── pictures/
    └── trip/
        └── 01.jpg
```

将 [examples/site/config.json](examples/site/config.json) 复制到自己的 `site/config.json`，修改站点名称、简介和联系方式：

```json
{
  "title": "My Journal",
  "description": "记录影像、文字与日常。",
  "contacts": [
    { "label": "GitHub", "url": "https://github.com/your-name" },
    { "label": "Email", "url": "mailto:hello@example.com" }
  ]
}
```

联系方式支持 HTTPS 和 mailto；`contacts` 留空时隐藏联系入口。配置字段可省略，默认使用 Folio 名称、通用简介和空联系方式。站点名称以 `site/config.json` 为准，不再使用 `FOLIO_SITE_TITLE` 环境变量。

`site/icon.png` 使用正方形 PNG，建议至少 512 × 512，支持透明圆角。网站自动生成浏览器和手机图标，并在图片变化时更新资源地址。省略图标时使用通用默认图标。

文章使用 Markdown，一级标题作为默认标题；每个包含图片的文件夹成为相册。保留 `blogs/` 和 `pictures/` 两个目录，其下可自由组织，不用的目录留空。

开发模式会同步内容和 `site/` 的变化。修改 `.env.local` 后重启服务。归档是普通文件夹，不要求 Git。

公开代码只保存配置示例和默认素材。个人配置、图标及内容放在独立归档中；部署凭证放 `.env.local` 或 GitHub Secrets。站点配置是展示资料，不应填写密钥。

## 发布

使用 Cloudflare Pages、私有 R2 和 GitHub Actions。

1. 将网站代码推送到自己的 GitHub 仓库，启用 Actions；在 Cloudflare 启用 R2、`workers.dev` 并创建 Pages 项目。
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

发布会把 `site/config.json`、`site/icon.png` 和允许的文章、照片、附件一起保存为不可变版本，上传至私有 R2，再触发云端构建与部署。`site/` 下其他文件不进入发布清单；个人原文件不必上传到公开 GitHub 仓库。

在 GitHub Actions 查看部署结果。R2 桶保持私有，网站展示的资料、图标、图片、文章和附件会公开。
