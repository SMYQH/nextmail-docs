---
title: 快速部署
description: 用几分钟把 NextMail 部署到你的 Cloudflare 账号。
sidebar_position: 2
---

# 快速部署

本教程使用项目自带的脚本，把 NextMail 部署到你自己的 Cloudflare 账号。前提是
你已经拥有 Cloudflare 账号，并且有一个 DNS 托管在 Cloudflare 上的域名。

## 1. 获取代码

```bash
git clone https://github.com/SMYQH/nextmail.git
cd nextmail
npm ci
```

需要 Node.js 24 以上版本和 npm。

## 2. 创建部署配置

```bash
cp .env.deploy.example .env.deploy
```

`.env.deploy` 是唯一的运营方配置文件。它被 Git 忽略，也是项目唯一读取的环境
文件——永远不要创建 `.env`、`.env.local` 或 `.dev.vars`。

至少要填写：

| 变量 | 含义 |
| --- | --- |
| `CLOUDFLARE_ACCOUNT_ID` | 你的 Cloudflare 账号 ID |
| `CLOUDFLARE_API_TOKEN` | 具备下述权限的 API Token |
| `AUTH_SECRET` | 用于签名会话的随机密钥（`openssl rand -base64 32`） |
| `EMAIL_DOMAIN` | 收件域名，例如 `mail.example.com` |
| `NEXT_PUBLIC_BASE_URL` | 部署的公开地址，例如 `https://mail.example.com` |

可选的 OAuth 登录（GitHub 或 Google）在提供商的 ID 和 Secret 都填写后才生效，
否则按钮不会显示。

### API Token 权限

把 Token 限定到拥有你的 Zone 的账号。它需要：

- `D1: Edit`
- `Workers KV Storage: Edit`
- `Workers Scripts: Edit`
- `EMAIL_DOMAIN` 所属 Zone 的 `Zone: Read` 与 `Email Routing Rules: Edit`
- 使用自定义域名时，该 Zone 的 `Workers Routes: Edit`
- 使用自定义域名时，网站 Zone 的 `WAF: Edit` 与 `Bot Management: Read`
  ——标准 Bot Fight Mode 必须关闭

不需要 `DNS: Edit` 和 `API Tokens: Edit`。

## 3. 部署

```bash
npm run deploy
```

脚本按顺序执行：

1. **前置检查**——校验配置、验证 API Token 及其读取权限，并检查 WAF 与 Bot
   Management 设置。任何一项检查失败时，脚本都不会开始构建或改动远端资源。
2. **构建**——生成 Next.js 生产构建产物和 OpenNext Worker 包。
3. **资源发现**——查找或创建 `nextmail-d1` 数据库和 `nextmail-kv` 命名空间，
   然后把解析出的 ID 写入被忽略的 `wrangler.json`。
4. **数据库迁移**——把 Drizzle 迁移应用到远端数据库，并执行一次性的角色回填。
5. **Secrets 与设置**——把认证密钥安装为 Worker Secrets，并应用可选的站点设置
   （账号、Catch-all、发信配额）。
6. **Workers**——发布主 Worker、Email Worker 和 Cleanup Worker，并把 Zone 的
   Catch-all 规则指向 Email Worker。
7. **验证**——检查 `/api/config`、`/api/emails` 和前端是否出现意外的 Cloudflare
   挑战。

:::note
部署不是单一事务。后续步骤失败时，前面已完成的步骤依然生效——检查状态后重新
运行脚本即可，已存在的资源会被复用。
:::

## 4. 把域名指向它

使用自定义域名时，脚本会自动创建 Worker 路由和证书。否则部署可通过
`*.workers.dev` 访问。

接下来配置[邮件路由](/getting-started/email-domain)，让邮件真正进入 NextMail。

## 5. 创建第一个账号

打开部署地址，登录后进入个人中心页面。如果站点还没有皇帝，页面会显示
**初始化站点所有者**——确认后，第一个账号即成为拥有全部站点设置权限的皇帝。

## 也可以用 GitHub Actions 部署

在 `.env.deploy` 中设置 `REPOSITORY_URL` 和 `GITHUB_TOKEN`，脚本还会把部署配置
同步到你的仓库 Secrets。CI 只读取 Secrets，从不读取 `.env.deploy`。完整的操作
手册见[部署与运维](/developers/deployment)。
