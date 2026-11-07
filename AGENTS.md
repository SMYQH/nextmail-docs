# AGENTS.md

本文件约束在 NextMail 文档仓库中工作的 AI 代理与协作者。

## 交流语言

- **始终使用中文**与用户沟通，包括用户用中文提问时。
- 面向读者的文档内容同样以中文为默认写作语言，但英文是站点的默认语种（`/en/`）。

## 仓库定位

本仓库只承载 **NextMail 文档站**。应用代码位于
[SMYQH/nextmail](https://github.com/SMYQH/nextmail)，不要在本仓库中修改应用
源码，也不要在应用仓库中新增面向用户的文档。

## 技术栈

- **Docusaurus 3.10.2**（`@docusaurus/core` + `@docusaurus/preset-classic`）
- React 19 + TypeScript
- **Fluent 2**：`@fluentui/react-theme` 提供设计令牌，`@fluentui/react-icons`
  提供图标
- `@easyops-cn/docusaurus-search-local` 提供本地搜索
- Cloudflare Workers 静态资源承载部署

## 目录约定

| 路径 | 用途 |
| --- | --- |
| `docs/` | 英文文档（站点的默认语种） |
| `docs/getting-started/` | 面向小白用户 |
| `docs/guides/` | 面向普通用户的操作指南 |
| `docs/developers/` | 面向开发者与 AI 代理的技术文档 |
| `i18n/zh-CN/docusaurus-plugin-content-docs/current/` | 简体中文翻译，与 `docs/` 目录结构一一对应 |
| `i18n/zh-CN/code.json` | 主题文案翻译 |
| `i18n/zh-CN/docusaurus-theme-classic/` | 导航栏与页脚文案翻译 |
| `i18n/zh-CN/docusaurus-plugin-content-docs/current.json` | 侧边栏分类标签翻译 |
| `src/components/Home/` | 首页 React 组件 |
| `src/css/custom.css` | Fluent 主题样式 |
| `src/css/fluent-tokens.css` | **自动生成**，不要手工编辑 |
| `scripts/generate-fluent-tokens.mjs` | 从官方 Fluent 库生成令牌 |
| `static/img/` | 静态图片（含 `static/img/docs/` 下的截图） |
| `versioned_docs/`、`versioned_sidebars/`、`versions.json` | 版本化文档预留位 |
| `wrangler.jsonc` | Cloudflare 静态资源配置 |

## 语言约定

- **英文是默认语种**，位于 `/en/`；简体中文位于 `/zh-CN/`。
- 站点根路径 `/` 不属于任何语言，由 `src/worker/index.ts` 处理：按
  `Accept-Language` 返回 302 跳转到 `/en/` 或 `/zh-CN/`（`?lang=` 可覆盖），
  `/languages` 提供手动选择页。修改跳转逻辑后要同步更新 Worker。
- 修改英文文档时，必须同步更新 `i18n/zh-CN/docusaurus-plugin-content-docs/current/`
  下的对应文件。**不允许**只改一种语言。

## Fluent 设计约定

- **绝不手写 Fluent 色值。** 所有颜色、圆角、时长、缓动都来自
  `src/css/fluent-tokens.css`，该文件由 `npm run tokens:generate` 从
  `@fluentui/react-theme` 的 `webLightTheme` / `webDarkTheme` 生成。
- 新增令牌时，在 `scripts/generate-fluent-tokens.mjs` 的映射表中添加官方令牌名，
  然后重新生成——不要在 `custom.css` 里写十六进制色值。
- 图标一律使用 `@fluentui/react-icons` 的官方图标（注意：图标名不带尺寸后缀，
  如 `RocketRegular` 而非 `RocketRegular16`）。
- 组件层文案放在 `src/i18n/labels.ts` 的 `homeLabels` 字典中，按语言区分；不要把
  中文硬编码在组件里。
- 新增图片后确认它是 GIF 时无需额外标记，`custom.css` 已对 `img[src$='.gif']`
  做了 Fluent 卡片样式处理。

## 写作约定

- 面向小白用户的文档：解释"是什么、怎么做"，避免术语，先给结论再给细节。
- 面向开发者与 AI 代理的文档：给出精确的接口、字段、状态码和可复制的命令，
  避免歧义。
- 文档中的链接使用绝对路径（如 `/getting-started/overview`），Docusaurus 会自动
  加上语言前缀。
- 侧边栏的 doc id 必须与目录名一致（使用连字符），否则构建会报
  "These sidebar document ids do not exist"。
- 图片使用绝对路径 `/img/docs/xxx.jpg`，两种语言下都可访问。

## 构建与校验

```bash
npm ci --ignore-scripts     # 安装依赖
npm run tokens:generate     # 生成 Fluent 令牌
npm run typecheck           # TypeScript
npx docusaurus build        # 构建（CI 使用完整压缩）
```

本地环境限制：

- 若 Terser 压缩因沙箱权限失败（`spawn EPERM`），改用
  `npx docusaurus build --no-minify`。
- 不要引入 `@docusaurus/faster` 或 `@swc/core`：本机原生绑定无法加载。

CI 使用 `onBrokenLinks: 'throw'` 与 `markdown.hooks.onBrokenMarkdownLinks:
'throw'`，**任何断链都会让构建失败**——提交前请确认所有链接有效。

## 版本化文档

`versions.json` 目前为空数组。发布新版本：

```bash
npm run docusaurus docs:version 1.0.0
```

`versioned_docs/` 下的内容是自动生成的快照，不要手工编辑。

## 提交约定

- 提交信息使用中文并遵循 Conventional Commits，例如
  `docs: 补充 Webhook 签名校验说明`。
- 提交前运行 `git diff --check` 并检查 `git status --short`。
- 不要提交 `build/`、`.docusaurus/`、`node_modules/` 或任何凭证。

## 敏感信息

- 绝不把 API Token、账号 ID 之类的凭证写入仓库、日志或文档。
- 仓库 Secrets 仅在 GitHub Actions 中使用。
