# Aries's Blog

这是我的 Hugo 个人博客源码，访问地址：[aries727.site](https://aries727.site)。

项目基于 `hugo-theme-stack`，但首页导航、文章布局、主题样式和部分交互均为自定义实现。内容主要通过 Obsidian 维护，由 GitHub Actions 构建并发布到 GitHub Pages。

## 主要特色

- **星图式目录导航：** 首页上层目录使用 D3 力导向图展示，可以展开、收起、拖动和缩放。
- **深层笔记索引：** 进入二级目录或一级叶子目录后，切换为按笔记名称稳定排序的列表，便于直接找到要读的内容。
- **阅读页增强：** 自定义文章布局、目录侧栏、主题切换和 Zima Blue Canvas 动画。
- **Mermaid 支持：** 文中图表支持渲染、全屏查看和缩放。
- **Obsidian 兼容：** 自定义图片渲染模板支持页面资源和相对图片路径。
- **响应式布局：** 桌面端以图和侧边索引并排显示，移动端则将索引放在图下方纵向浏览。

## 技术栈

- Hugo 0.158.0 extended
- `hugo-theme-stack` Git submodule
- TypeScript + Hugo Pipes
- SCSS
- D3.js v7
- GitHub Actions + GitHub Pages

## 本地运行

先安装 Hugo extended 0.158.0 或兼容版本，并初始化主题子模块：

```bash
git submodule update --init --recursive
hugo server -D
```

开发服务器启动后，按终端显示的本地地址访问博客。`-D` 会包含草稿文章。

生产构建：

```bash
hugo --gc --minify --cleanDestinationDir
```

构建结果位于 `public/`。`public/`、`resources/_gen/` 和 `.hugo_build.lock` 都是可再生文件，已被 Git 忽略，不应提交。

## 内容组织

文章位于 `content/post/`。目录结构会直接影响首页导航：**只要新建/移动文件夹和笔记即可调整分支，无需改任何代码**。

```text
content/post/
├── Computer Science/           一级分支（显示在力导向图中）
│   ├── Blogs/                  技术博客 / 学习笔记
│   │   └── AI agent/           分类子文件夹（按需随意再分）
│   │       ├── Agent是什么.md
│   │       └── sse-and-llm-streaming/   页面包：笔记 + 配图
│   │           ├── index.md
│   │           └── sse-llm-streaming-flow.svg
│   └── Projects/               项目记录（有笔记后自动出现在导航中）
└── Photography/                摄影相册
    └── 2025.7/
        ├── index.md            layout = "photography"
        └── DSC_0007.JPG
```

导航行为规则（由 `assets/ts/graph/tree.ts` 决定）：

- 目录节点在力导向图中逐层展开，层级可以一直向下展示；节点上的数字徽标显示其下笔记总数。
- 当一个目录**直接**包含 2 篇及以上笔记时，点击它改为打开按名称稳定排序的笔记索引（索引递归收录所有后代笔记）；直接笔记不足 2 篇的目录始终以节点形式展开。
- 同名笔记在索引中会额外显示相对目录路径用于区分。
- 空文件夹不出现在导航中，放入第一篇笔记后自动出现。

### 添加一篇笔记

1. 在对应分支里新建 `.md` 文件，例如 `content/post/Computer Science/Blogs/某分类/my-note.md`，中间的分类子文件夹随意建。
2. 文件开头写 front matter：

   ```toml
   +++
   date = 2026-09-01
   title = "笔记标题"
   +++
   ```

   - `title` 决定索引中显示的名字；不写则用文件名（连字符不会转成空格，建议显式写）。
   - `date` 必须是合法日期（9 月没有 31 日），写错会导致整站构建失败。
   - 不要写 `draft = true`，那是草稿标记，写了就不会发布。
3. 有配图时，把 `笔记.md` 改成同名文件夹 + `index.md`（页面包），图片放同目录，正文用相对路径引用（Obsidian 写法直接兼容）。
4. 提交并推送到 `master`，GitHub Actions 自动构建发布；导航节点、笔记索引、文章目录全部自动生成，无需其他操作。

### 添加或调整分支

- **加分支**：直接在 `content/post/` 下（一级分支）或某分支内（更深级）新建文件夹并放入笔记即可。
- **改名/移动/合并分支**：直接移动文件夹，导航和索引自动跟随，已发布文章的 URL 不受影响（见下面禁忌第 1 条）。

### 两条禁忌

1. **不要给内容文件夹添加 `_index.md`**。本项目 permalink 是 `/:sections/:contentbasename/`，没有 `_index.md` 时嵌套文件夹不算 section，文章 URL 永远是 `/post/文件名/`，与目录层级无关——这正是"随便移动目录不影响链接"的原因。一旦加了 `_index.md`，该目录变成 section，其下所有文章 URL 会变成 `/post/目录名/.../文件名/`，旧链接全部失效。
2. **不要改已发布文章的文件名或页面包文件夹名**。URL 由它决定（`:contentbasename`），改名等于换地址。标题可以随时改，文件名要慎重。

### 摄影相册

`content/post/Photography/` 下每个相册是一个页面包：`index.md` 设置 `layout = "photography"`，照片放在同一目录。相册页是全屏图片浏览器：桌面端在 Zima 泳池旁单图展示，支持箭头/方向键切换、点击与滚轮缩放、拖动平移；移动端为纵向多图滚动，点按缩放。模板位于 `layouts/post/photography.html`，交互位于 `assets/ts/photography.ts`，原图不发布，页面使用 Hugo 生成的 1920（浏览）与 3840（缩放）两档图片。

## 项目结构

```text
assets/
  scss/custom.scss          自定义主题、首页和文章页样式
  ts/graph.ts               首页图导航与索引状态协调
  ts/graph/                 目录树、状态、类型和索引组件
  ts/zima.ts                文章页 Zima Blue 动画
config/_default/            Hugo 与主题配置
content/post/               博客文章
layouts/home.html           首页模板
layouts/single.html         文章页模板
layouts/_partials/          自定义模板组件
static/                     静态资源
themes/hugo-theme-stack/    Stack 主题子模块
```

自定义代码放在项目根目录的 `layouts/` 和 `assets/` 中，不直接修改主题子模块。

## 发布

推送到 `master` 分支后，[GitHub Actions 工作流](.github/workflows/deploy.yml)会自动：

1. 安装 Hugo extended 0.158.0。
2. 拉取主题子模块。
3. 运行生产构建。
4. 将 `public/` 发布到 GitHub Pages。

也可以在 GitHub Actions 页面手动触发该工作流。

## 关键维护说明

- `assets/ts/custom.ts` 会由 Stack 主题的 footer 脚本按约定自动加载。
- 首页索引的 DOM 渲染位于 `assets/ts/graph/indexPanel.ts`；排序、后代笔记收集和触发规则位于 `assets/ts/graph/tree.ts`。
- 文章永久链接使用 `:contentbasename`，修改内容目录或文件名可能改变现有地址。
- D3、Mermaid、Panzoom 和 Google Fonts 依赖远程资源，离线或网络受限时相应功能可能不可用。
