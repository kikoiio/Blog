# Folio 项目目标

更新日期：2026-11-06。

Folio 是可复用的个人网站框架。网站代码可公开，完整文章与图片保存在独立本地归档；发布通过私有 R2、清单和云端 CI 完成。

## 使用约定

- 本地保留完整 `blogs/`、`pictures/`，与网站目录没有固定的位置关系。
- 文章与相对附件放在 `blogs/`；图片按文件夹组织，不要求手写相册或配色数据。
- 每个包含图片的文件夹形成相册，父目录形成分类，文件名自然排序。
- 首次执行 `node scripts/setup-cloudflare.mjs` 配置资源；整理好完整归档后执行 `npm run publish`，以后同一命令增量发布。
- `.env.local` 与生成缓存不进入 Git；私有归档 Git 仅保存生成的 `release.json`、`README.md` 和 `.gitignore`，忽略原始目录。

## 发布架构

- 本地使用 Wrangler OAuth REST 上传内容哈希原件及 `releases/<revision>.json`，更新 `releases/latest.json`，记录私有 Git 清单后按 revision 触发网站工作流。
- 两个 R2 桶均关闭直接公开访问。`folio-media` 只绑定媒体桶，通过 `workers.dev` 公开受限的只读 WebP 图片。
- `folio-build` 绑定两个桶，每个请求验证 Bearer token；source 仅允许 `GET`/`HEAD`，media 仅允许 `GET`/`HEAD`/`PUT`，不提供 `DELETE`。
- CI 使用 `FOLIO_BUILD_URL` 与 secret `FOLIO_STORAGE_TOKEN`，从 R2 读取清单，仅恢复所列文件并验证校验和；无需检出私有 GitHub 归档或持有其 token。
- 云端生成配色和最长边不超过 2400、640 像素的 WebP，不放大、不发布原图或原始 EXIF；随后构建静态 Next.js 站点并部署 Pages。
- CI 的 `CLOUDFLARE_API_TOKEN` 仅用于 Pages 部署。工作流以 `FOLIO_PUBLISH_ENABLED=true` 为门控，由发布命令自动启用；`FOLIO_SITE_URL` 为必填配置。

## 功能与边界

- 当前 UI 为大图画廊，支持相册选择、前后切换、计数和自动配色过渡。`blogs/` 为空，文章阅读 UI 未实现。
- 本地预览监听文件变化，刷新页面查看结果；目录改名或移动后重启服务，归档移动时同时更新绝对路径。
- 内容哈希与版本清单固定发布引用，正常发布不删除远程对象；本地移除只影响后续清单，不撤销已有公开图片 URL。
- 不提供登录、在线 CMS、图片编辑器或私人相册访问控制，不绑定特定站长或仓库地址。
- 不承诺全流程永久免费；重型图片处理、构建和浏览器验证使用获得授权的云端 CI。

实例资源与生产验证记录见 [deployment.md](deployment.md)。
