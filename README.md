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

文章位于 `content/post/`。目录结构会直接影响首页导航：

```text
content/post/
└── 一级目录/
    ├── 文章.md
    └── 二级目录/
        ├── 文章.md
        └── 页面包/
            ├── index.md
            └── image.svg
```

- 有子目录的一级目录继续显示在力导向图中。
- 二级及更深目录打开名称索引，不再把文章作为力模拟节点。
- 没有子目录的一级目录直接打开名称索引。
- 同名笔记会额外显示相对目录路径用于区分。

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
