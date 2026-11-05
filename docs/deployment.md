# 部署指南

更新日期：2026-11-05。本文档介绍博客的免费部署方案。

## 概述

博客是静态站点，可部署到多个免费托管平台。主要目标是 **Cloudflare Pages**，因其慷慨的免费额度和全球 CDN。

## 当前配置

- **构建命令**：`npm run build`
- **输出目录**：`out/`
- **框架**：Next.js 静态导出

## 免费部署选项

### 选项 1：Cloudflare Pages（推荐）

**优点：**
- 无限带宽和请求
- 免费 SSL 证书
- 全球 CDN
- Git 集成
- 国际访问良好

**缺点：**
- 中国大陆访问较慢
- 单文件大小限制 25MB

**设置步骤：**
1. 创建 Cloudflare 账户
2. 连接 GitHub 仓库
3. 配置构建设置：
   - 构建命令：`npm run build`
   - 输出目录：`out`
   - Node 版本：22
4. 部署

### 选项 2：GitHub Pages

**优点：**
- 公开仓库免费
- 设置简单
- 适合技术内容

**缺点：**
- 仓库大小限制 1GB
- 构建较慢
- 功能有限

**设置步骤：**
1. 添加 GitHub Actions 工作流部署到 GitHub Pages
2. 配置仓库设置

### 选项 3：Vercel

**优点：**
- 优秀的 Next.js 集成
- 有免费额度
- 性能好

**缺点：**
- 免费额度有限
- 自定义域名可能需要付费

## 图片优化

### 当前状态

图片存储在 `content/articles/` 中，构建时复制到 `public/article-assets/`。按原样提供，无优化。

### 免费图床选项

为提升性能并减少仓库大小，可考虑外部图床：

#### 七牛云
- **免费额度**：10GB 存储 + 10GB 流量/月
- **中国大陆访问**：快
- **适合**：中文用户

#### 腾讯云 COS
- **免费额度**：50GB 存储 + 10GB 流量（6 个月）
- **中国大陆访问**：快
- **适合**：大量照片

#### Cloudinary
- **免费额度**：25GB 存储 + 25GB 流量/月
- **全球 CDN**
- **适合**：国际用户

### 图片优化步骤

1. **本地压缩图片**：
   ```bash
   # 将 JPG 转换为 WebP
   find content/articles -name "*.jpg" -exec cwebp -q 85 {} {}.webp \;
   ```

2. **上传到图床**：
   - 使用服务商的 CLI 或 API
   - 更新 Markdown 文件中的图片 URL

3. **更新文章引用**：
   ```markdown
   # 之前
   ![photo](images/photo.jpg)
   
   # 之后
   ![photo](https://your-bucket.qiniucdn.com/images/photo.webp)
   ```

## 内容管理

### 当前工作流

1. 在 `content/articles/` 编辑 Markdown 文件
2. 提交更改到 Git
3. 推送触发部署

### 可选：可视化编辑器

为获得更好的编辑体验，可考虑：

- **Obsidian**：在 Obsidian 中写作，同步到 `content/articles/`
- **VS Code**：直接编辑，带 Markdown 预览
- **Headless CMS**：Outstatic、Tina CMS（需要配置）

## 部署检查清单

部署前：

- [ ] 运行 `npm run lint` 检查代码质量
- [ ] 运行 `npm run build` 验证构建
- [ ] 检查所有文章链接是否正常
- [ ] 验证图片是否正确加载
- [ ] 在移动设备上测试
- [ ] 检查页面加载速度

## 故障排除

### 构建失败

- 检查 Node.js 版本（需要 20+）
- 清除 `.next` 和 `out` 目录
- 运行 `npm ci` 重新安装依赖

### 图片问题

- 验证 Markdown 中的图片路径
- 检查 `public/article-assets/` 目录
- 确保图片不超过 25MB

### 部署问题

- 检查托管平台的构建日志
- 验证环境变量
- 检查域名 DNS 设置

## 未来改进

- 图片优化（WebP、懒加载）
- RSS 订阅生成
- SEO 增强（sitemap、meta 标签）
- 评论系统（Giscus、Utterances）
- 分析统计（Cloudflare Web Analytics）
