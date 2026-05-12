# Blog 项目维护与优化指南

> 本文档是后续维护与优化的主入口。它整合项目现状、已知问题、优化优先级和验收标准，用于逐步替代分散且部分过期的 `AGENTS.md`、`CLAUDE.md` 和 `IMPLEMENTATION.md`。

## 1. 项目现状摘要

这是一个基于 Hugo 和 `hugo-theme-stack` 的个人博客，部署到 GitHub Pages，域名为 `aries727.site`。项目不是简单套用主题，而是在 Stack 主题之上重写了首页、文章页和多处交互体验。

核心技术栈：

- Hugo 0.158.0 extended
- `hugo-theme-stack` 主题，作为 Git submodule 使用
- TypeScript，通过 Hugo Pipes 编译
- SCSS，自定义样式集中在 `assets/scss/custom.scss`
- D3.js v7，用于首页力导向图导航
- Canvas，用于文章页 Zima Blue 泳池动画
- GitHub Actions，用于 GitHub Pages 部署

核心自定义功能：

- 首页图导航：Hugo 输出 `content/post/` 下文章的扁平路径数据，前端 `graph.ts` 构建目录树并用 D3 渲染力导向图。
- 文章页布局：`layouts/single.html` 覆盖主题默认文章页，提供左侧返回按钮、TOC 侧栏、右侧 Zima Blue 泳池动画。
- 主题系统：`head/custom.html` 在首屏渲染前读取 `BlogThemeState` 并设置 `data-theme`，`custom.ts` 会被 Stack 主题的 footer script 自动加载。
- Mermaid 增强：主题 partial 会加载 Mermaid，并由本项目的 `assets/ts/mermaid.ts` 提供图表渲染、全屏和缩放能力。
- Obsidian 图片兼容：`layouts/_default/_markup/render-image.html` 优先解析 page resources，兼容相对图片引用。

当前重要事实：

- `assets/ts/custom.ts` 实际会被主题自动加载，不是未使用文件。
- `assets/ts/cat.ts` 是遗留动画实现，当前文章页使用的是 `zima.ts`。
- `layouts/_partials/section-tree.html` 是早期递归 section 树方案遗留，当前首页改为前端从文件路径构建树。
- `IMPLEMENTATION.md` 存在明显编码损坏，不能继续作为可信主文档。

## 2. 当前主要问题

### 2.1 构建稳定性不足

本机执行 `hugo --gc --minify` 曾失败，错误发生在写入 `public/ts/custom...js` 时提示 `Access is denied`。同时 `public/ts/` 中存在大量历史 hash 构建产物。虽然 `public/` 已被 `.gitignore` 忽略，但构建产物长期残留在工作区，已经影响本地构建可信度。

风险：

- 本地构建结果不可复现。
- 产物文件被占用或权限异常时会阻塞开发。
- 难以判断 GitHub Actions 成功是否代表本地环境也健康。

### 2.2 文档事实失真

现有文档之间存在冲突或过期信息。例如 `AGENTS.md` 和 `CLAUDE.md` 记录 `custom.ts` 未被模板加载，但实际 Stack 主题会在 footer 中自动加载它。`IMPLEMENTATION.md` 还存在大量乱码，维护者容易被错误信息误导。

风险：

- 后续优化基于错误假设展开。
- 新维护者难以判断哪个文档可信。
- 遗留代码和活跃代码边界不清。

### 2.3 首页图导航耦合过重

`assets/ts/graph.ts` 同时承担数据解析、目录树构建、D3 渲染、动画、状态恢复、事件绑定和跳转逻辑，并大量使用 `any` 与 HTML 字符串拼接。

风险：

- 功能继续增加后难以定位 bug。
- 状态恢复、折叠动画、D3 simulation 容易互相影响。
- 节点内容直接拼接 HTML，不利于类型约束和安全审查。

### 2.4 SCSS 覆盖债偏重

`assets/scss/custom.scss` 承担所有自定义样式，包含主题变量、首页、文章页、Mermaid、移动端覆盖和大量与 Stack 主题对抗的选择器。局部存在较多 `!important`。

风险：

- Stack 主题升级后容易破坏布局。
- 移动端 fixed、backdrop-filter、sidebar 覆盖逻辑难以推理。
- 样式变更影响范围不透明。

### 2.5 CDN 与外部资源依赖分散

首页 D3、Mermaid、Panzoom、Google Fonts 等依赖通过 CDN 或远程字体加载。个人站可以接受，但依赖策略没有集中说明。

风险：

- 国内网络或离线预览不稳定。
- 关键交互受第三方资源可用性影响。
- 隐私、缓存、版本锁定和可复现性较弱。

当前依赖清单：

- D3 v7：`layouts/home.html` 通过 `https://d3js.org/d3.v7.min.js` 加载，服务首页图导航。
- Mermaid：主题 partial 通过 `https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js` 加载，服务文中图表。
- Panzoom 9.4.3：`assets/ts/mermaid.ts` 通过 `https://cdn.jsdelivr.net/npm/panzoom@9.4.3/+esm` 动态导入，用于 Mermaid 全屏缩放。
- Google Fonts：`layouts/_partials/head/custom.html` 直接加载 `Inter`、`Noto Sans SC`、`JetBrains Mono`。
- KaTeX / PhotoSwipe：由主题 `data/external.toml` 管理，按页面能力按需加载。

### 2.6 SEO 与站点基础能力被过度关闭

`hugo.toml` 禁用了 `taxonomy`、`term`、`RSS`、`sitemap`、`robotsTXT`、`404` 等页面类型。若博客只作为私人入口，这可以接受；若希望文章被搜索和订阅，这是明显损失。

风险：

- 搜索引擎发现文章能力下降。
- 没有 RSS，不利于长期订阅。
- 没有 404 页面，访问坏链接时体验较差。

### 2.7 本地部署脚本过于粗暴

`deploy.sh` 使用 `git add .`、`git commit`、`git push` 的直通流程；在当前 Windows 维护环境里，也缺少一个可直接执行的 PowerShell 入口。

风险：

- 容易误提交临时文件、错误产物或未检查内容。
- 提交前没有构建校验。
- 无法作为可靠发布流程。

## 3. 优化优先级路线图

### P0：恢复可信构建

要改什么：

- 清理 `public/` 和 `resources/_gen/` 中的历史构建产物。
- 重新运行 `hugo --gc --minify`，定位并解决 `Access is denied`。
- 将 `:filename` permalink token 迁移为 `:contentbasename`，消除 Hugo deprecated warning。

为什么：

- 构建可信是所有后续优化的前提。
- 如果本地构建不稳定，任何前端和模板改动都无法可靠验收。

验收标准：

- Windows 本机执行 `hugo --gc --minify` 成功。
- GitHub Actions Pages 构建成功。
- 构建前后不产生需要提交的 `public/` 或 `resources/_gen/` 文件。
- Hugo deprecated warning 被清除，或存在明确剩余待办。

### P0：修正文档事实错误

要改什么：

- 以本文档作为新的主维护文档。
- 修正 `custom.ts` 的加载状态：它会被 Stack 主题 footer script 自动加载。
- 标记 `section-tree.html`、`cat.ts`、旧实现说明为遗留项。
- 后续重写或归档乱码严重的 `IMPLEMENTATION.md`。

为什么：

- 文档必须先可信，后续执行者才不会重复踩坑。
- 当前文档的错误事实会直接影响工程判断。

验收标准：

- 后续维护只以 `PROJECT_GUIDE.md` 为主入口。
- 旧文档不再传播“`custom.ts` 未加载”等错误结论。
- 每个遗留文件都有明确状态：保留、删除、归档或等待确认。

### P1：拆分首页图导航

要改什么：

- 将 `graph.ts` 拆成更清晰的职责：
  - 数据类型与路径树构建
  - 图状态持久化与恢复
  - D3 simulation 与渲染
  - 节点事件与页面跳转
- 减少 `any`，给 D3 数据对象和事件回调补充局部类型。
- 将节点 HTML 生成逻辑收敛到小函数，避免散落在 D3 render 链中。
- 给空内容、深层目录、返回后状态恢复、折叠动画等场景补手工或自动验证。

为什么：

- 当前 `graph.ts` 是项目里最有表现力、也最容易失控的模块。
- 拆分后才能安全添加标签节点、搜索、筛选或更复杂的导航行为。

验收标准：

- 首页初始加载、展开、折叠、点击文章、返回恢复状态均正常。
- 移动端缩放和节点点击不退化。
- D3 相关 `any` 明显减少，关键数据流可读。
- 节点 HTML 拼接集中管理。

### P1：收敛 SCSS 覆盖债

要改什么：

- 将 `custom.scss` 重新整理为明确区域：
  - 主题变量
  - 全局基础覆盖
  - 首页图导航
  - 文章页布局
  - Zima canvas
  - Mermaid
  - 移动端覆盖
- 减少不必要的 `!important`。
- 对必须覆盖 Stack 主题的选择器增加简短注释，说明原因。

为什么：

- 当前样式有效，但维护成本偏高。
- 移动端 fixed 元素、sidebar、backdrop-filter 的关系需要更清晰。

验收标准：

- 首页、文章页、Mermaid、移动端样式不回退。
- `!important` 数量减少，剩余项有原因。
- Stack 主题升级冲突点集中可见。

### P2：改善 SEO 与站点基础能力

要改什么：

- 恢复 `sitemap`、`robotsTXT`、`404`。
- 恢复 RSS；当前站点已有持续内容产出，保留订阅能力更符合博客定位，但使用摘要和条数限制控制 feed 体积。
- taxonomy 页面可以继续禁用，但若标签节点不展示，首页 JSON 中的 tag 数据也应评估是否保留。

为什么：

- 博客内容天然适合被搜索、索引和订阅。
- 当前关闭过多基础能力，牺牲了长期可发现性。

验收标准：

- 生产构建生成 sitemap、robots 和 404。
- 站点坏链接有合理 404 页面。
- RSS 已恢复，并通过摘要输出和 `services.rss.limit` 避免生成过大的全文 feed。
- 首页输出的数据只包含实际使用字段，或明确保留原因。

### P2：依赖治理

要改什么：

- 集中列出 D3、Mermaid、Panzoom、Google Fonts、KaTeX、PhotoSwipe 等外部依赖。
- 评估关键运行依赖是否本地化或 npm 化。
- 若继续使用 CDN，记录版本、用途和失败影响。

为什么：

- 交互功能依赖外部资源时，需要知道哪些失败会导致核心体验不可用。
- 版本和来源集中管理后，未来升级更安全。

验收标准：

- 文档中有外部依赖清单。
- D3、Mermaid、Panzoom 的加载策略有明确结论。
- 离线或 CDN 失败时的影响范围被记录。

### P3：部署脚本安全化

要改什么：

- 替换 `deploy.sh` 的 `git add .` 直通流程，并补充 Windows 可直接执行的 `deploy.ps1`。
- 推荐流程：
  - 先运行生产构建。
  - 显示 `git status`。
  - 只提交明确范围。
  - 再 push 触发 GitHub Actions。
- 保留 GitHub Actions 为正式部署路径，本地脚本只做辅助。

为什么：

- 发布脚本应该降低误操作概率，而不是扩大误提交范围。

验收标准：

- 本地脚本不会在未构建成功时提交。
- 本地脚本不会默认 `git add .`。
- GitHub Actions 仍是最终部署来源。

## 4. 后续执行建议

建议按以下顺序继续推进：

1. 处理 P0 构建问题，确保本地和 CI 都能稳定构建。
2. 拆分 `graph.ts`，优先保证行为不变。
3. 整理 `custom.scss`，控制主题覆盖风险。
4. 决定 SEO、RSS 和 CDN 依赖策略。
5. 改造 `deploy.sh`，避免粗暴提交。

## 5. 验收总清单

文档层面：

- `PROJECT_GUIDE.md` 能独立说明项目现状、主要问题、优化顺序和验收标准。
- 文档没有继续传播 `custom.ts` 未加载等错误事实。
- 后续执行者无需重新判断优先级即可从 P0/P1 的剩余项继续。

当前完成状态：

- P0 构建可信：真实工作区生产构建已通过，`public/` 和 `resources/_gen/` 已保持为忽略产物，`:filename` 已迁移为 `:contentbasename`。
- P0 文档修正：`AGENTS.md`、`CLAUDE.md` 已瘦身，`IMPLEMENTATION.md` 已归档，`PROJECT_GUIDE.md` 成为主入口。
- P1 首页图导航：已完成第一轮轻拆分，类型、路径树、状态和节点 HTML 渲染已移入 `assets/ts/graph/`；D3 simulation 和事件交互仍留在 `graph.ts`，可后续继续拆。
- P2 站点基础能力：`sitemap`、`robots.txt`、`404`、RSS 已恢复；RSS 使用摘要和数量限制。
- P3 部署脚本：`deploy.sh` 和 `deploy.ps1` 已改为先构建、只提交已暂存改动，并使用 `--cleanDestinationDir` 避免本地旧产物残留。

工程层面：

- `hugo --gc --minify` 本机通过。
- GitHub Actions Pages 构建通过。
- 首页图导航、文章页 TOC、Zima canvas、Mermaid 图表在桌面和移动端正常。
- `AGENTS.md` 保留必要 Codex 上下文，并指向 `PROJECT_GUIDE.md`。

## 6. 已知风险

- 主题升级冲突：自定义布局和 SCSS 深度覆盖 Stack 主题，升级前必须先跑页面验收。
- 中文路径和编码：内容目录包含中文和空格，文档曾出现乱码，后续编辑必须统一 UTF-8。
- 本地构建权限：`hugo --gc --minify` 在当前 Codex 沙箱内会因写入 `public/ts/custom.*.js` 报 `Access is denied`，但在脱离沙箱的真实工作区可成功构建；这更像环境权限边界，而非项目模板错误。
- CDN 可用性：D3、Mermaid、Panzoom 和字体依赖外部网络，国内访问和离线预览可能不稳定。
- 移动端 fixed 布局：`backdrop-filter`、fixed sidebar 和 TOC dropdown 的组合容易受浏览器实现影响。

## 7. 文档整合策略

本文档已作为主事实源存在，旧文档已完成第一轮瘦身清理。

- `AGENTS.md`：已压缩为 Codex 上下文入口，只保留项目摘要、常用命令和指向 `PROJECT_GUIDE.md` 的链接。
- `CLAUDE.md`：已压缩为 Claude 入口摘要，避免继续复制完整实现说明。
- `IMPLEMENTATION.md`：已改为归档提示，不再作为可信实现文档。

原则：

- 一个主文档讲完整上下文。
- 工具专用文档只保留入口级摘要。
- 遗留文档先瘦身或归档；确认不再需要后，再删除文件本身。
