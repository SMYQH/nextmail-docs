---
title: 本地开发
description: 用本地 D1 数据库和本地 KV 命名空间运行 NextMail。
sidebar_position: 4
---

# 本地开发

## 环境要求

- Node.js 24 以上
- npm
- 一个 Cloudflare 账号（仅用于远端资源；离线开发不需要有效的部署令牌）

## 准备

```bash
git clone https://github.com/SMYQH/nextmail.git
cd nextmail
npm ci
```

### 绑定模板

仓库跟踪三个模板：`wrangler.example.json`、`wrangler.email.example.json` 和
`wrangler.cleanup.example.json`。它们描述 Worker、D1 和 KV 的绑定，不包含资源
ID。

生成的文件 `wrangler.json`、`wrangler.email.json` 和 `wrangler.cleanup.json`
被 Git 忽略，并由 `npm run config:wrangler` 以及所有需要它们的命令（`dev`、
`build:worker`、迁移命令和部署命令）自动重新生成。不要提交它们，也不要往里面
粘贴凭证——运营方设置都在 `.env.deploy` 中。

### 环境变量

```bash
cp .env.deploy.example .env.deploy
```

开发、构建、预览和部署都读取这一个文件，加上进程环境。永远不要创建 `.env`、
`.env.local` 或 `.dev.vars`。

本地开发请设置随机的 `AUTH_SECRET`，并把 `NEXT_PUBLIC_BASE_URL` 指向本地地址；
留空时开发服务器按请求推导规范链接。离线本地开发不需要有效的 Cloudflare 部署
令牌。完整的变量列表见[部署与运维](/developers/deployment)。

### 本地数据库

```bash
npm run db:migrate-local
```

它把迁移应用到本地 SQLite 数据库，并使用自己的本地状态，与任何远端 D1 实例
无关。

## 运行

```bash
npm run dev
```

## 检查

```bash
npm run lint            # 对 app 目录执行 ESLint，不允许任何警告
npx tsc --noEmit        # TypeScript
npm test                # Node 单元与路由测试，不需要外部服务
npm run build           # Next.js 生产构建
npm run build:worker    # OpenNext Worker 打包与校验
npm run preview:worker  # 在本地预览构建好的 Worker
```

请顺序执行。`npm run build` 的 `prebuild` 步骤会先删除旧的 `.next` 产物和
`tsconfig.tsbuildinfo`，并重新生成路由类型，因此陈旧的增量缓存不可能被复用。
生产构建前请停止开发服务器，绝不要同时运行两个构建——它们共享 `.next` 目录。

`npm run build` 成功**不能**替代 Worker 构建和运行时验证。

## 浏览器测试

```bash
npm run test:browser
```

测试套件使用自带的 Playwright Chromium，覆盖英文和中文、浅色和深色主题、桌面端
以及 390 × 640 的移动视口：登录、邮箱管理、API Key 和分享分页。它会启动或复用
本地开发服务器。

全新克隆之后——或者执行 `git clean -fdx` 之后——运行：

```bash
npm run bootstrap
```

它会恢复依赖、那唯一的 `.env.deploy`、本地数据库和测试配置，并安装 Chromium。
不要替换成 Edge 或系统浏览器。

报告写入 `.test/playwright/`，结果与截图写入 `.test/results/`；整个 `.test/`
目录被 Git 忽略。

完整的本地循环门禁是 `npm run agent:gate`。浏览器测试**不能**证明生产环境的
Cloudflare 行为——入站投递、Resend 和 Webhook 投递必须在已部署的环境中验证。

## 调试

- 应用代码运行在 workerd 中（通过 OpenNext 的 `getPlatformProxy`），因此 Node
  调试器无法在 `app/**` 或 `proxy.ts` 中设置断点。浏览器代码用 Chrome 配置
  检查，Worker 代码通过 `http://127.0.0.1:9229/json/list` 的 workerd 检查器
  查看。
- 编辑器与启动配置位于 `.vscode/`。

## 项目结构

| 路径 | 内容 |
| --- | --- |
| `app/[locale]/` | 本地化页面（首页、登录、邮箱、个人中心、分享邮件） |
| `app/api/` | 路由处理器 |
| `app/lib/` | 认证、权限、数据库访问、校验与共享逻辑 |
| `app/components/`、`app/hooks/` | 功能组件与共享 UI 原语 |
| `app/i18n/` | 语言环境设置与 `en` / `zh-CN` 消息目录 |
| `workers/email-receiver.ts`、`workers/cleanup.ts` | 收信与定时清理 |
| `drizzle/` | SQL 迁移 |
| `scripts/` | 迁移、部署、fixture、Webhook 与图标工具 |
| `tests/` | Node 单元与路由测试，以及浏览器套件 |

## 测试约定

- 断言可观察的行为与副作用：响应、持久化的数据以及外部调用的次数。只检查状态码
  无法证明没有别的事情发生。
- 每个测试之后重置数据库和配置、恢复 mock 并关闭数据库连接。
- SQLite/D1 适配器不模拟多实例并发、Cloudflare 的 CPU 预算或真实的服务投递。
  这些需要已部署的环境来验证。
