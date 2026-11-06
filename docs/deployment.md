# Folio：R2、Workers 与清单发布

更新日期：2026-11-06。

本文记录已授权、正在部署的方案。**用户已告知 R2 激活；Workers 配置与发布集成仍在进行，尚未确认生产发布成功。** 脚本及流水线由主 agent 实现，现有文件不代表端到端验证已经完成。

## 资料与访问边界

| 位置 / 服务 | 内容与权限 |
|---|---|
| 独立本地归档 | 完整 `blogs/`、`pictures/`，不为上传或 GitHub 而裁剪 |
| Folio 网站仓库 | 可公开的代码与工作流，不提交私有原件、缓存或凭证 |
| 私有 GitHub 仓库 `Aries-Archive` | 仅生成的 `release.json`、`README.md`、`.gitignore`；排除原始 `blogs/`、`pictures/` |
| 私有 R2 source bucket | 内容哈希原件、`releases/<revision>.json` 和 `latest.json`；不公开 |
| 独立 R2 media bucket | 网页衍生图片，由 Worker 提供访问 |
| `folio-media` Worker | 只绑定 `MEDIA` 桶；公开只读图片，允许 `GET`/`HEAD`，不允许写入或删除 |
| `folio-build` Worker | 绑定 source 与 media 两个桶；每个请求必须通过 `FOLIO_STORAGE_TOKEN` 验证；source 仅 `GET`/`HEAD`，media 仅 `GET`/`HEAD`/`PUT`，不允许 `DELETE` |
| Cloudflare Pages | 构建后的静态 Next.js 站点 |

当前账户没有自定义域名，公开图片使用 `folio-media` 的 HTTPS `workers.dev` 地址，不使用 `r2.dev`。公开媒体 Worker 无法访问 source 桶。

GitHub 保存清单记录，CI 的清单与文件来源是 R2。当前 `blogs/` 为空，网站 UI 仅有图片画廊，文章页面尚未实现。

## 首次配置

1. 保留网站目录外完整的 `blogs/` 和 `pictures/`。准备私有 `Aries-Archive` 仓库并排除这两个原始目录，仅记录清单、说明和忽略规则。
2. 在已激活的 R2 中准备独立的 source 与 media 桶。部署两个小型 Worker：`folio-media` 仅绑定 `MEDIA`，提供公开只读图片；`folio-build` 绑定两个桶，按上表限制方法。
3. 生成私密的 `FOLIO_STORAGE_TOKEN`，将相同值配置为 `folio-build` 的 Worker secret 与 Folio GitHub Actions Secret。每个构建 Worker 请求都须携带 `Authorization: Bearer <token>`，包括 `GET` 和 `HEAD`。不要把此 token 放入网页或清单。
4. 将 `folio-media` 的 `workers.dev` 地址设为 `FOLIO_MEDIA_BASE_URL`，将受保护构建 Worker 地址设为 `FOLIO_BUILD_URL`。配置目标 Pages 项目；仓库改名不会自动更改 Pages 项目，沿用 `blog` 项目时填写 `blog`。
5. 本地复用 Wrangler OAuth 登录，通过 Cloudflare REST 上传 source 原件和清单；本地 Git/GitHub 登录需能写入私有清单仓库，并由 `gh` 触发网站工作流。CI 的现有 `CLOUDFLARE_API_TOKEN` 仅用于 Pages 部署，不用于 R2。
6. 主 agent 完成集成后，运行首次 `npm run publish`，核对指定 revision 的工作流、公开图片与 Pages 结果，以及 source 私有和构建 Worker 鉴权，再确认发布完成。

计划配置如下；部署仍在进行，不表示当前模板已读取全部变量。

| 配置 | 用途与配置位置 |
|---|---|
| `FOLIO_ARCHIVE_PATH` | 本机完整归档绝对路径；CI 使用临时恢复目录 |
| `FOLIO_SITE_TITLE` | 站点标题；本机环境 / Actions Variable |
| `FOLIO_ARCHIVE_REPOSITORY` | 私有清单记录仓库 `owner/Aries-Archive`；仅本地发布使用 |
| `FOLIO_WEBSITE_REPOSITORY` | 工作流目标 `owner/Folio`；本地 `gh workflow run` 使用 |
| `FOLIO_SOURCE_BUCKET` | 私有原件与清单桶名；本机环境 / Actions Variable，匹配 Worker 绑定 |
| `FOLIO_MEDIA_BUCKET` | 衍生图片桶名；Actions Variable，匹配两个 Worker 的媒体绑定 |
| `FOLIO_MEDIA_BASE_URL` | `folio-media` 的 HTTPS `workers.dev` 公开地址；Actions Variable |
| `FOLIO_BUILD_URL` | 受保护的 `folio-build` HTTPS 地址；Actions Variable |
| `FOLIO_STORAGE_TOKEN` | 生成的存储访问密钥；构建 Worker secret 与 Actions Secret，CI 每次存储请求使用 |
| `CLOUDFLARE_ACCOUNT_ID` | 目标账户 ID；本机环境 / Actions 配置 |
| `CLOUDFLARE_API_TOKEN` | 现有 Pages 部署 token（Pages: Edit）；Actions Secret，仅部署步骤使用 |
| `CLOUDFLARE_PAGES_PROJECT` | 目标 Pages 项目名；Actions Variable |

本地发布走 Wrangler OAuth REST 上传；`FOLIO_BUILD_URL` 和 `FOLIO_STORAGE_TOKEN` 用于 CI 存储访问。CI 不需要私有 GitHub 归档 checkout、归档读取 token 或 R2 API token；只检出网站代码。Workers 通过桶绑定访问 R2。

## 日常发布

在本地修改 `blogs/`、`pictures/` 后，从 Folio 工作目录运行：

```bash
npm run publish
```

发布依次执行：扫描允许发布的文件并计算内容哈希；使用 Wrangler OAuth REST 增量上传缺失的不可变原件；在私有 source 桶上传 `releases/<revision>.json` 和更新 `latest.json`；在 `Aries-Archive` 记录 `release.json`；触发网站工作流。等价的触发命令为：

```bash
gh workflow run deploy.yml --repo "$FOLIO_WEBSITE_REPOSITORY" -f "revision=<hash>"
```

其中 `<hash>` 是本次发布的 revision。CI 经 `FOLIO_BUILD_URL` 并在每次请求携带存储 token，直接从 R2 读取 `releases/<revision>.json`，只下载清单列出的原件。在云端生成有尺寸上限的 WebP 变体和配色，经构建 Worker 上传媒体，再构建静态站点并用现有 Pages token 部署。

本地发布不执行生产图片压缩、配色分析或完整构建。`npm run dev` 是本地同步、监听和预览，`npm run sync` 是本地单次同步；两者不自动发布。现有本地同步仍复制原图，不能据此判断云端 WebP 流程已验证。

## 版本与公开范围

原件内容改变后生成新的哈希与对象引用；`releases/<revision>.json` 固定该版本，`latest.json` 是可更新的便利指针。发布触发的 CI 使用传入 revision，不跟随可能被另一次发布更新的 latest，从而避免混用版本。

正常发布不删除远程原件或衍生图片，两个 Worker 均不提供 `DELETE`。本地删除、重命名只影响后续清单，旧版本引用的不可变对象保留。

原件私有，网页衍生图片经 `folio-media` 公开；从新清单移除图片不会撤销已有公开 URL。不要把完整归档、原件或凭证放入公开构建产物。曾进入公开 Git 历史的原件不会因迁移自动消失。

不保证全流程免费；R2、Workers、GitHub Actions 与 Pages 均受各自额度及计费条件约束。重型处理、构建和验证在已获授权的云端 CI 执行；本文不表示部署成功或检查已通过。
