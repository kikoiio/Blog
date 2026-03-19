# Blog 实现文档

> 基于 Hugo + hugo-theme-stack 主题的个人博客，首页使用 D3.js 力导向图作为导航。
> 站点地址：aries727.site

---

## 项目结构概览

```
Blog/
├── config/_default/          # Hugo 配置
│   ├── hugo.toml             # 主配置（disableKinds, permalinks）
│   ├── params.toml           # 站点参数（sidebar, article, widgets）
│   ├── markup.toml           # Markdown 渲染配置
│   ├── menu.toml             # 菜单配置
│   └── related.toml          # 相关文章配置
├── layouts/                  # 自定义模板（覆盖主题）
│   ├── home.html             # 首页 — D3 图形导航
│   ├── list.html             # 列表页 — 重定向到首页
│   ├── single.html           # 文章页 — TOC + 猫动画
│   ├── _default/
│   │   └── _markup/
│   │       └── render-image.html  # 图片渲染
│   └── _partials/
│       ├── head/custom.html       # 字体 + 主题初始化脚本
│       ├── footer/footer.html     # 全局页脚（仅显示 Aries's Blog）
│       ├── footer/custom.html     # 自定义页脚占位
│       ├── article/components/footer.html  # 文章页脚（仅标签，无 license）
│       └── section-tree.html      # [遗留] 递归 section 树 partial
├── assets/ts/                # TypeScript 源码（Hugo Pipes 编译）
│   ├── graph.ts              # 首页力导向图核心逻辑
│   ├── custom.ts             # 主题切换 + 滚动动画
│   └── cat.ts                # 文章页猫动画
├── content/post/             # 博客内容
│   ├── Computer Science/     # 分类文件夹（含子文件夹）
│   ├── Games/
│   └── Photography/
└── themes/hugo-theme-stack/  # 主题（不直接修改）
```

---

## 核心设计决策

### 1. 页面类型精简

只保留两种页面：**首页（图形导航）** 和 **文章页**。

- `hugo.toml` 中 `disableKinds = ["taxonomy", "term", "RSS", "sitemap", "robotsTXT", "404"]` 禁用了分类、标签、RSS 等页面生成
- `layouts/list.html` 将所有 section 列表页重定向到首页（不能直接 disable section kind，否则 Hugo 的 `.Site.GetPage "section"` 无法获取数据）
- 标签管理通过图形导航完成，不需要单独的标签页面

### 2. 内容动态发现

首页不硬编码文章列表，而是由 Hugo 模板自动扫描 `content/post/` 下所有文章：

```go
{{- range .Site.GetPage "section" "post" | .RegularPagesRecursive -}}
```

Hugo 输出每篇文章的**文件路径**（如 `Computer Science/大模型应用开发/2`），由前端 JavaScript 构建目录树。这样：
- 新增/删除文章会自动反映到图上
- 无需为每个子目录创建 `_index.md`（已有的保留即可）
- Windows 下反斜杠通过 `replaceRE "\\\\" "/"` 规范化

### 3. 目录树由前端构建

Hugo 模板输出扁平的页面列表（JSON），JavaScript 中的 `buildTree()` 将路径切分为树结构。

**原因**：Hugo 的 `.Sections` 只能发现有 `_index.md` 的目录。用户的文件结构中存在纯数字文件夹（如 `1/`, `2/`）作为子目录，这些不是 Hugo section。通过文件路径构建树可以完整反映实际目录层级。

**数据流**：
```
Hugo 模板 → JSON (hidden div#graph-data) → JS 解析 → buildTree() → D3 渲染
```

注意：数据放在 `<div style="display:none">` 而非 `<script type="application/json">`，因为 Hugo 在 `<script>` 标签内会对 `safeHTML` 的输出做额外转义。

---

## 首页图形导航 (graph.ts)

### 架构

```
graph.ts
├── 数据结构
│   ├── TreeNode        — 从文件路径构建的目录树
│   ├── GraphNode       — D3 力导向图节点
│   └── GraphLink       — D3 力导向图边
├── 核心函数
│   ├── buildTree()     — 扁平路径 → 树结构
│   ├── buildMainData() — 初始化根节点 + 顶层分类
│   ├── expandSilent()  — 静默展开节点（用于状态恢复）
│   ├── toggleSection() — 点击展开/折叠 + 焦点切换
│   ├── updateGraph()   — 重新渲染节点和边 + 启动力模拟
│   └── tickUpdate()    — 每帧更新节点和边的位置
├── 交互功能
│   ├── 缩放/平移       — d3.zoom()，滚轮缩放 0.3x~3x
│   ├── 节点拖拽        — d3.drag()
│   ├── 焦点/聚焦       — 展开节点居中放大，背景节点缩小淡化
│   └── 状态持久化      — sessionStorage 保存展开路径和焦点
└── 样式
    ├── 玻璃拟态节点    — CSS backdrop-filter + 半透明背景
    └── 入场动画        — scale(0)→scale(1) 弹性过渡
```

### 节点类型

| 类型 | 说明 | 样式 | 点击行为 |
|------|------|------|----------|
| `center` | 中心节点 "Aries" | 160×90, 含社交链接 | 无 |
| `category` | 文件夹节点 | 180×56, 含 +/− 指示器 | 展开/折叠子节点 |
| `post` | 文章节点 | 170×48 | 跳转到文章页 |
| `tag` | 标签节点（当前未使用） | — | — |

### 焦点系统

当用户展开某个文件夹节点时：
1. 该节点成为 `focusedNodeId`
2. 焦点节点及其子节点保持 `scale(1.0)` + `opacity(1)`
3. 背景节点缩小到 `scale(0.6)` + `opacity(0.4)`
4. 力模拟中焦点节点有更强的居中力 (`strength: 0.3`)，背景节点力减弱 (`strength: 0.02`)

折叠时焦点回到父节点。折叠到根级别时清除焦点。

### 缩放/平移

- 使用 `d3.zoom()` 实现
- 所有图形内容包裹在 `<g class="graph-zoom-group">` 中
- 缩放范围：0.3x ~ 3x
- 初始缩放：1.2x 居中
- 双击缩放已禁用（避免与节点点击冲突）

### 状态持久化

用户点击文章节点跳转前，当前展开状态保存到 `sessionStorage`：
- `graph-expanded-paths`: 所有展开的文件夹路径数组
- `graph-focus-path`: 当前焦点节点的路径

返回首页时 `restoreState()` 恢复展开状态，按深度排序确保父节点先展开。

---

## 文章页 (single.html)

### 布局

- **左侧边栏**：返回首页箭头 + 目录（TOC）
- **主内容区**：文章正文
- **右侧边栏**：猫动画 canvas
- **页脚**：仅显示文章标签（无 license、无时间戳）

### 返回导航

左侧栏的返回箭头链接到首页。配合 graph.ts 的 sessionStorage 状态持久化，用户返回后能看到之前展开的图形状态。

---

## 主题系统 (custom.ts)

支持 6 种颜色主题：teal, rose, sage, lavender, sand, dark。

主题状态保存在 `localStorage`（key: `BlogThemeState`）。`head/custom.html` 中的内联脚本在页面渲染前读取并应用主题，避免闪烁。

---

## URL 结构

```toml
[permalinks]
    post = "/:sections/:filename/"
    page = "/:slug/"
```

文章 URL 格式：`/post/computer-science/后端开发/11/`（反映 section 层级 + 文件名）。

注意：`:filename` 是旧版 Hugo token（已 deprecated 但仍可用）。Hugo 0.158+ 不识别 `:contentBaseName`。

---

## 常见维护场景

### 添加新文章
直接在 `content/post/` 对应目录下创建 `.md` 文件即可。Hugo 自动发现，首页图形自动更新。

### 添加新分类文件夹
在 `content/post/` 下创建新目录。如果希望 Hugo 生成该 section 的列表页（会被重定向到首页），可添加 `_index.md`。不添加也没关系，graph.ts 通过文件路径构建树，不依赖 Hugo section。

### 修改中心节点信息
编辑 `layouts/home.html` 中的 `$graphData` 字典：

```go
{{- $graphData := dict "center" (dict "name" "Aries" "github" "https://github.com/kikoiio" "bilibili" "") ... -}}
```

### 调整图形样式
节点样式在 SCSS 中定义（主题的自定义 CSS）。力导向图参数在 `graph.ts` 的 `updateGraph()` 函数中：
- `forceManyBody().strength()` — 节点间斥力
- `forceLink().distance()` — 边的理想长度
- `forceCollide().radius()` — 碰撞检测半径
- `forceX/Y().strength()` — 居中力强度

### 调整缩放范围
修改 `graph.ts` 中的 `scaleExtent([0.3, 3])`。第一个值为最小缩放，第二个值为最大缩放。初始缩放在 `initialScale` 变量中设置。

---

## 已知限制

1. **section-tree.html 已废弃**：该 partial 是早期方案的遗留，现在由 `home.html` 直接输出扁平路径 + JS 构建树。可以安全删除。
2. **tag 节点类型未使用**：GraphNode 接口中定义了 `tag` 类型，但当前图形不显示标签节点。标签数据仍然从 Hugo 输出，可按需启用。
3. **Hugo 版本依赖**：使用了 `:filename` permalink token（deprecated），以及 `replaceRE` 处理 Windows 路径。升级 Hugo 时需注意兼容性。
