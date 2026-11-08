# NextMail 文档

NextMail 的官方文档站，基于 [Docusaurus 3](https://docusaurus.io/) 构建。

文档站与应用仓库分离：[SMYQH/nextmail-docs](https://github.com/SMYQH/nextmail-docs)
是本仓库，[SMYQH/nextmail](https://github.com/SMYQH/nextmail) 是应用本体。

## 文档结构

站点提供多条阅读路径，面向不同读者：

| 目录 | 读者 | 内容 |
| --- | --- | --- |
| `docs/getting-started/` | 小白用户 | 项目概览、快速部署、邮箱域名、邮箱使用、角色权限、站点设置 |
| `docs/guides/` | 普通用户 | Webhook、常见问题 |
| `docs/developers/` | 开发者与 AI 代理 | 系统架构、OpenAPI 参考、AI 代理接入、本地开发、部署与运维 |

英文原文位于 `docs/`，简体中文翻译位于
`i18n/zh-CN/docusaurus-plugin-content-docs/current/`，两者目录结构一一对应。

## 界面设计

界面参照 WinUI 3 的 Fluent Design：

- **设计令牌**直接取自官方库 `@fluentui/react-theme`，通过
  `npm run tokens:generate` 生成为 `src/css/fluent-tokens.css`。仓库中不手写任何
  Fluent 色值——升级依赖即升级主题。
- **图标**使用官方 `@fluentui/react-icons`。
- **形状、动效与排版**遵循 Fluent 2 规范：2/4/6/8px 圆角、
  `cubic-bezier(0.33, 0, 0.67, 1)` 缓动、150/200/250ms 时长。
- 支持浅色/深色主题、键盘可达的焦点样式、`prefers-reduced-motion` 与
  `prefers-contrast`。
- **GIF 支持**：`.gif` 图片自动套用 Fluent 卡片边框与阴影，屏幕录制保持原始尺寸。

## 本地开发

```bash
npm ci
npm start
```

开发服务器默认监听 `http://localhost:3000`，同时提供 `/en/` 与 `/zh-CN/`。

常用命令：

| 命令 | 说明 |
| --- | --- |
| `npm start` | 启动开发服务器 |
| `npm run build` | 构建生产站点到 `build/` |
| `npm run serve` | 本地预览构建产物 |
| `npm run clear` | 清理 Docusaurus 缓存 |
| `npm run typecheck` | TypeScript 类型检查 |
| `npm run tokens:generate` | 从官方 Fluent 库重新生成设计令牌 |
| `npm run write-translations` | 生成缺失的翻译文件骨架 |
| `npm run deploy:cloudflare` | 发布到 Cloudflare Workers 静态资源 |

> `npm start` 与 `npm run build` 会自动先执行 `tokens:generate`。

## 部署

文档站主体是纯静态产物，由 Cloudflare Workers 的静态资源能力分发。站点根路径
`/` 属于站点本身而不属于任何语言（英文在 `/en/`，中文在 `/zh-CN/`），因此由
`src/worker/index.ts` 负责：

- `/` 按 `Accept-Language` 返回 302 跳转到 `/en/` 或 `/zh-CN/`（`?lang=` 可覆盖）；
- `/languages` 展示手动选择语言的页面；
- 其余路径直接交给静态资源，不产生额外开销。

```bash
npm run build
npm run deploy:cloudflare
```

GitHub Actions 会在推送到 `main` 或 `v*` 标签时自动构建并发布，配置见
`.github/workflows/`：

| 工作流 | 触发条件 | 作用 |
| --- | --- | --- |
| `ci.yml` | 推送到 `main`、PR | 类型检查 + 构建校验 + 令牌一致性校验 |
| `deploy.yml` | 推送到 `main`/`v*`、手动触发 | 构建并发布到 Cloudflare |

### 所需的仓库 Secrets / Variables

| 名称 | 类型 | 说明 |
| --- | --- | --- |
| `CLOUDFLARE_API_TOKEN` | Secret | 具备 Workers Scripts 写权限的 API Token |
| `CLOUDFLARE_ACCOUNT_ID` | Secret | Cloudflare 账号 ID |
| `DOCS_SITE_URL` | Variable | 站点公开地址，例如 `https://docs.nextmail.app` |

### 自定义域名

在 Cloudflare 控制台为 `nextmail-docs` Worker 绑定自定义域名，或在
`wrangler.jsonc` 中增加 `routes` 配置。

## 许可证

本仓库与 NextMail 应用同源，采用 [GNU AGPL-3.0](LICENSE) 授权。
