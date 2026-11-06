# Folio 部署与发布

更新日期：2026-11-06。

## 首次配置

需要 Node.js 22+、已登录的 Wrangler OAuth、已执行 `gh auth login` 的 GitHub CLI，以及 Folio 网站仓库的 Actions 操作权限。Cloudflare 账户需启用 R2，并准备目标 Pages 项目。

1. 在网站目录外创建普通归档文件夹，整理完整 `blogs/`、`pictures/`。不需要初始化 Git、配置远程仓库或手工维护发布清单。
2. 在网站目录执行 `npm ci`，复制 `.env.example` 为 `.env.local` 并填写下表本机配置。`.env.local` 保持未跟踪。设置必填的 `FOLIO_SITE_URL`，在网站 Actions Secrets 配置账户 ID 和仅用于 Pages 部署的 API token。
3. 执行一次 `node scripts/setup-cloudflare.mjs`。脚本创建或复用两个桶，部署两个 Worker，生成存储 token，并写入 GitHub 构建变量和 secret；生成值保存在被忽略的 `.folio/`。两个桶均保持直接公开访问关闭。
4. 原始文件夹整理完成后，在网站目录执行 `npm run publish`，一次提交完整允许发布的文件集合；初次上传全部所选文件，以后按内容哈希增量上传。

| 配置 | 位置与用途 |
|---|---|
| `FOLIO_ARCHIVE_PATH` | `.env.local`：完整本地归档绝对路径；CI 为临时恢复目录 |
| `FOLIO_SITE_TITLE` | `.env.local` → Actions Variable：站点标题 |
| `FOLIO_WEBSITE_REPOSITORY` | `.env.local`：网站工作流仓库 `owner/site` |
| `FOLIO_SOURCE_BUCKET` / `FOLIO_MEDIA_BUCKET` | `.env.local` → Actions Variables：两个独立桶名 |
| `CLOUDFLARE_ACCOUNT_ID` | `.env.local` 及 Actions Secret：目标账户 ID |
| `CLOUDFLARE_PAGES_PROJECT` | `.env.local` → Actions Variable：Pages 项目名 |
| `FOLIO_SITE_URL` | 必填，`.env.local` → Actions Variable：完整 HTTPS 站点地址，用于生产验证 |
| `FOLIO_MEDIA_BASE_URL` / `FOLIO_BUILD_URL` | setup 自动设置的 Actions Variables：公开媒体与受保护构建 Worker 地址 |
| `FOLIO_STORAGE_TOKEN` | setup 生成的 Actions Secret，对应构建 Worker 的 `BUILD_TOKEN` secret |
| `CLOUDFLARE_API_TOKEN` | Actions Secret：Pages: Edit，仅在 CI 部署步骤使用 |
| `FOLIO_PUBLISH_ENABLED` | Actions Variable：必须为 `true` 才运行部署任务，`publish` 上传完成后自动启用 |

本地上传和首次资源配置使用 Wrangler OAuth。`gh` 需要设置网站仓库 Variables/Secrets 和运行 Actions 的权限；归档目录没有 Git 相关要求。将 CI 的 `FOLIO_BUILD_URL` 与存储 token 留在 CI 配置中，本地发布直接访问 Cloudflare REST。CI 只检出网站代码，不需要私有 GitHub 归档 checkout、读取 token 或 R2 API token。

## 日常更新

修改本地文件、保存完毕后，在 Folio 工作目录运行：

```bash
npm run publish
```

脚本扫描允许的文件并计算 SHA-256，上传缺失原件到私有 source 桶，写入 R2 的 `releases/<revision>.json` 与 `releases/latest.json`，然后直接触发网站工作流。最后自动启用发布门控，执行 `gh workflow run deploy.yml --repo <website-repository> -f revision=<hash>`。

CI 经 Bearer 构建网关读取指定版本清单，只恢复所列文件并校验 SHA-256。在云端生成最长边不超过 2400、640 像素的 WebP 及配色，上传衍生图片，静态构建并部署 Pages，然后执行在线与浏览器验证。

`npm run dev` 用于本地监听和预览，刷新页面显示变化，不自动发布。网站目录改名或移动后重启服务即可；归档目录移动时更新 `FOLIO_ARCHIVE_PATH` 后重启。

## 原私有 GitHub 仓库的移除

发布脚本不再读取归档 Git、调用 Git 命令或访问私有 GitHub 仓库，`FOLIO_ARCHIVE_REPOSITORY` 已移除。确认所需资料在本地与 R2 后，可以删除旧的远程私有归档仓库；不要删除本地归档文件夹。旧的本地 `.git/` 和 `release.json` 不参与新流程，脚本不会修改或删除它们。

## 恢复已发布原件

`npm run restore-release` 读取导出的 shell 环境变量，不自动加载 `.env.local`。本机已有 Wrangler OAuth 登录时，指定恢复目录、桶和账户：

```bash
export FOLIO_ARCHIVE_PATH=/absolute/path/to/Restored-Archive
export FOLIO_SOURCE_BUCKET=your-source-bucket
export CLOUDFLARE_ACCOUNT_ID=your-account-id
npm run restore-release
```

默认恢复 `releases/latest.json`，指定 `FOLIO_RELEASE_REVISION=<hash>` 可恢复固定版本。也可配置 `FOLIO_BUILD_URL` 与 `FOLIO_STORAGE_TOKEN`，通过受保护网关读取。恢复仅覆盖清单所列文件并逐个校验，不包含从未发布的本地文件；完整本地归档仍需保留。

## 访问与版本边界

| 服务 | 权限 |
|---|---|
| 两个 R2 桶 | 均禁用直接公开访问；source 保存原件与清单，media 保存衍生图片与配色缓存 |
| `folio-media` | 仅绑定 `MEDIA`，只公开匹配路径的 WebP 图片 `GET`/`HEAD`；不公开原件、清单或配色缓存 |
| `folio-build` | 绑定两个桶，每次请求均验证 Bearer；source 仅 `GET`/`HEAD`，media 仅 `GET`/`HEAD`/`PUT`，均无 `DELETE` |

公开图片使用 `workers.dev`，不使用 `r2.dev`。WebP 不携带原始 EXIF，原图不进入公开站点。内容哈希原件与固定版本清单不可变；`releases/latest.json` 是可更新指针，发布触发的 CI 固定使用传入 revision。

正常发布不删除远程对象，本地删除或重命名只影响后续清单，不撤销已有公开 URL。迁出公开 Git 的原件不会从其历史自动消失。R2、Workers、Actions 与 Pages 均有额度和计费条件，不保证全流程免费。

## 实例与生产验证

2026-11-06 生产发布及端到端验证通过：

| 资源 | 实例 |
|---|---|
| 网站源码 | [kikoiio/Folio](https://github.com/kikoiio/Folio) |
| R2 桶 | `aries-originals` / `aries-media`，均关闭直接公开访问 |
| 公开媒体 | [folio-media.3145558167.workers.dev](https://folio-media.3145558167.workers.dev)，受限只读图片 |
| 构建网关 | [folio-build.3145558167.workers.dev](https://folio-build.3145558167.workers.dev)，Bearer 鉴权 |
| Pages 站点 | [blog-b99.pages.dev](https://blog-b99.pages.dev) |
| 成功工作流 | [Actions run 42264516725](https://github.com/kikoiio/Folio/actions/runs/42264516725) |

此次发布包含 2 个相册、20 张图片，原件共 151.7 MiB；`blogs/` 为空，文章 UI 未实现。CI 完成全部 20 个原件的校验恢复、lint、3 项测试、TypeScript 检查、完整 Next.js 构建、WebP 与配色生成、Pages 部署。

在线验证通过全部 20 张图片的 HEAD 请求、公开原件路径 404、无鉴权私有请求 401，以及鉴权后不存在对象 404。Playwright 等待图片实际解码、绘制完成后，桌面和手机检查通过前后切换、相册选择与页面无滚动溢出；截图保存在该工作流的 `folio-browser-check` artifact 中（保留 7 天）。
