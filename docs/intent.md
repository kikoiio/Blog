# Folio 项目目标

更新日期：2026-11-06。

Folio 是供任何人使用的个人网站项目，面向文章与图片作品。网站代码可以公开，完整资料保存在独立的本地归档中，与网站工作目录没有固定的位置关系。

## 使用方式

- 站长通过本地文件夹管理完整资料，不要求在线 CMS。
- 文章及配图放在 `blogs/`，保留相对目录结构。
- `pictures/` 只需维护文件夹和图片，不要求手写相册文章或配色资料。
- 每个包含图片的文件夹形成一个相册，父目录形成分类路径。
- 图片按文件名自然排序，文件夹名中的短横线和下划线作为空格显示。
- 图片统一使用当前的大图展示、窄边框和自动配色。
- 首次配置完成后，使用 `npm run publish` 一条命令上传增量原件、发布清单并触发云端构建和部署；发布集成与部署仍在进行。

## 已授权的发布架构

- 本地归档始终保留完整 `blogs/` 和 `pictures/`，不为适应 GitHub 而裁剪原件。
- 私有 GitHub 仓库 `Aries-Archive` 只保存生成的 `release.json`、`README.md` 和 `.gitignore`，不保存原始文章与图片目录。仓库地址通过配置指定，不写死在模板中。
- 本地发布仅扫描允许的文件，使用现有 Wrangler OAuth 凭证通过 Cloudflare REST 按内容哈希增量上传到私有 R2 source bucket；同时上传 `releases/<revision>.json` 和 `latest.json`，在 GitHub 记录 `release.json`，再通过 `gh workflow run deploy.yml -f revision=<hash>` 触发指定 `FOLIO_WEBSITE_REPOSITORY` 的工作流。
- `folio-media` 只绑定 `MEDIA` 桶，通过 `workers.dev` 公开只读图片；账户没有自定义域名，不使用 `r2.dev`。
- `folio-build` 绑定两个桶，每个请求均须携带生成的 `FOLIO_STORAGE_TOKEN`；source 仅允许 `GET`/`HEAD`，media 仅允许 `GET`/`HEAD`/`PUT`，不允许 `DELETE`。
- CI 使用 `FOLIO_BUILD_URL` 与 secret `FOLIO_STORAGE_TOKEN`，直接从 R2 读取指定版本清单并只下载其中列出的原件；无需检出私有 GitHub 归档或配置其读取 token。在云端生成有尺寸上限的 WebP 变体及配色，并经构建 Worker 上传衍生图片。
- 现有 `CLOUDFLARE_API_TOKEN` 仅用于 CI 的 Pages 部署，R2 访问通过受保护的 Worker。
- Next.js 静态站点构建后部署至 Cloudflare Pages，网页图片通过公开媒体地址访问。
- 内容哈希对应不可变对象，清单版本固定其引用；新版本不覆盖旧版本的原件。`latest.json` 只是可更新的最新指针，发布触发的构建固定 revision。正常发布不删除远程对象，本地删除只影响后续清单。

## 当前实现

- 可配置外部资料目录，开发时监听变动，构建前同步。
- 多相册切换、图片切换、图片主色分析、配色缓存和颜色过渡。
- 当前 `blogs/` 为空，文章阅读 UI 尚未实现；目前展示的是图片画廊。
- Next.js 静态导出，默认页面标题为 Folio，可通过环境变量设置站长名称。
- 现有本地同步仍按原文件复制图片。上述 R2 发布脚本、云端压缩和流水线由主 agent 实现，尚未确认生产发布成功。
- 用户已告知 R2 激活；Workers 与发布部署仍在进行，本文不表示端到端验证已完成。

## 边界

- 不绑定 Aries、不写死归档仓库位置或某个游戏相册。
- 不提供登录、在线上传、图片编辑器或私人相册访问控制。
- 原件桶保持私有，网页衍生图片经 `folio-media` 公开。后续清单移除图片不会自动撤销已有公开 URL。
- 不提供正常发布时的远程删除或自动垃圾回收；旧清单引用的不可变对象保留。
- 不承诺全流程永久免费，须考虑 R2、Workers、CI 与 Pages 的额度及计费条件。
- 重型构建和浏览器验证优先使用获得授权的云端 CI。
