---
title: 部署与运维
description: 部署、升级、验证与移除 NextMail 部署的完整操作手册。
sidebar_position: 5
---

# 部署与运维

本页是运营方的操作手册。[快速部署](/getting-started/quick-deploy)是精简版本；
本页说明每个步骤做了什么、需要什么，以及出问题时如何恢复。

## 运行时要求

NextMail 通过 OpenNext 运行在 Cloudflare Workers 上。主 Worker 需要兼容性标志
`nodejs_compat`、`nodejs_compat_populate_process_env` 和
`global_fetch_strictly_public`，兼容性日期为 `2025-04-01` 或更新。Worker 中的
`process.env` 依赖前两个标志。**不要**在路由处理器中添加 `runtime = "edge"`
——OpenNext 使用 Node.js 兼容运行时。参见
[Cloudflare Node.js 兼容性文档](https://developers.cloudflare.com/workers/runtime-apis/nodejs/)。

:::warning
请使用**付费的 Workers 套餐**。注册、密码登录和密码升级都使用 bcrypt 哈希，
一次异步 bcrypt 调用可能超出免费版每请求 10 毫秒的 CPU 预算。绝不要为了让免费
版跑得下而降低 bcrypt 的计算强度。如果你只用 OAuth 登录，或者站点仅供个人使用，
可以忽略这一点。

本项目不会检查 Cloudflare 的 CPU 限制——这需要你自己负责。
:::

## 在 Linux 上构建

在 Linux（包括 GitHub Actions）或 WSL 中用 Node.js 24 和全新的 `npm ci` 构建
OpenNext Worker。不要复用 Windows 的 `node_modules` 目录。OpenNext 会警告 Windows
构建未获完整支持；`npm run build:worker` 仍会产出 Worker 并校验
`.open-next/worker.js`、静态资源目录、D1/KV 绑定和运行时标志。

Next.js 的开发、lint 和单元测试在 Windows 上仍然可用。

当前版本：Next.js `16.4.3` 与 OpenNext `1.20.6`，处于
[适配器支持范围](https://opennext.js.org/cloudflare#supported-nextjs-versions)之内。
Next.js 14 已不再受支持，版本问题不通过降级到 14 或跳过支持检查来解决。

`npm run build` 成功**不能**替代 Worker 构建和运行时验证。

## 部署脚本

### 1. 准备配置文件

把 `.env.deploy.example` 复制为仓库根目录的 `.env.deploy`，并填写
[环境变量](#环境变量)。该文件被 Git 忽略。开发、构建、本地预览和部署都只读取
这一个文件加上进程环境——永远不要创建 `.env`、`.env.local` 或 `.dev.vars`。
把旧配置先合并到 `.env.deploy`，核对冲突后再删除旧文件。

示例文件中必填项在前，可选项在后。未填写的可选项会保留已存储的值。

Worker 绑定来自仓库跟踪的模板 `wrangler.example.json`、
`wrangler.email.example.json` 和 `wrangler.cleanup.example.json`。生成的文件
`wrangler.json`、`wrangler.email.json` 和 `wrangler.cleanup.json` 被忽略，并由
部署、构建和迁移命令自动重新生成。不要提交它们。

### 2. 限定 API Token 的作用域

`.env.deploy` 中的 Token 需要具备[最小部署权限](#cloudflare-api-token-权限)。设置
`CUSTOM_DOMAIN` 时，还需要单独准备 `OPENAPI_WAF_VERIFY_SECRET`。

`npm run deploy` 会在构建或改动任何远端资源**之前**校验 Token、它的读取权限，
以及 WAF 与 Bot Management 设置。检查失败时部署直接停止，不会产生副作用。

### 3. 可选的 GitHub Actions 同步

在 `.env.deploy` 中设置 `REPOSITORY_URL` 和 `GITHUB_TOKEN`，把配置同步到仓库的
Actions Secrets。任意一项留空则跳过同步。见
[GitHub Actions 部署](#github-actions-部署)。

### 4. 执行部署

```bash
npm run deploy
```

脚本按顺序执行：

1. **前置检查**——校验显式配置、验证 Cloudflare Token 及其读取权限，并检查 WAF
   与 Bot Management。设置 `CUSTOM_DOMAIN` 时还会检查目标 Zone 的 Worker Routes、
   WAF Rulesets 和 Bot Management。
2. **构建**——生成 Next.js 生产构建产物和 OpenNext Worker 包。
3. **资源发现**——查找或创建 `nextmail-d1` 数据库和 `nextmail-kv` 命名空间，
   然后把解析出的 ID 写入被忽略的 `wrangler.json`。
4. **数据库迁移**——把待执行的 Drizzle 迁移应用到远端数据库，并执行一次性的角色
   回填。
5. **Secrets 与设置**——把认证密钥安装为 Worker Secrets，并应用可选的站点设置。
6. **Workers**——发布主 Worker、Email Worker 和 Cleanup Worker，并把 Zone 的
   Catch-all 规则指向 Email Worker。
7. **验证**——检查 `/api/config`、`/api/emails` 和前端是否出现意外的 Cloudflare
   挑战。

:::note
部署不是单一事务。后续步骤失败时，前面已完成的步骤依然生效。检查状态后重新运行
脚本即可——已存在的资源会被复用。
:::

### Token 校验与权限检查

前置检查同时支持用户令牌和账户令牌：先调用用户验证接口，若该接口拒绝令牌，再
调用目标账户的 [Token 验证接口](https://developers.cloudflare.com/api/resources/accounts/subresources/tokens/methods/verify/)。
两种令牌都必须处于有效期内且状态为 `active`。

Cloudflare 的 Token 验证接口只返回 Token 状态，不会返回分配给它的权限策略。因此
部署前的资源权限检查使用只读 API 请求，确认相应账户和 Zone 范围可访问；它绝不
会创建临时资源来试写权限。后续写操作仍需要下表列出的 `Edit` 权限——若 Cloudflare
拒绝写操作，部署可能在已完成的远端步骤之后中止。

### WAF 验证

标准 Bot Fight Mode 无法通过自定义规则绕过，部署检测到标准模式启用时会失败。Zone
IP Access Rules、Cloudflare Access 以及先于 Zone 规则执行的账户级动作，既不由本
配置修改，也不由本配置绕过。

真实的 HTTP 验证覆盖当前部署执行者到 `/api/config`、`/api/emails` 和 `/en` 的
请求路径，不保证其他来源或策略下的所有请求都可访问；检查遇到挑战、重定向或非
预期响应时会失败。如果只使用 `workers.dev`，该主机不属于你管理的 Zone——项目
无法自动安装 Zone WAF 规则，也无法执行这项 HTTP 验证。

对于自定义域名部署，生成一个只用于部署和自动化前端验证的随机值，例如
`openssl rand -hex 32`，并把它保存为 `.env.deploy` 中的
`OPENAPI_WAF_VERIFY_SECRET` 或 GitHub Actions Secret。同名的 Cloudflare Skip 规则
会在本项目主机上匹配验证请求头；自动化浏览器测试可以发送 `x-nextmail-waf-verify`
请求头。该变量绝不会进入 Worker、OpenNext 应用环境、构建产物或子进程环境。拥有
目标 Zone WAF 读取权限的人可以查看规则表达式并因此取得这个值，所以它不能替代
应用身份认证。请使用与 `AUTH_SECRET` 不同的值。

部署完成后可以再次验证：

```bash
npm run verify:waf
```

## Cloudflare API Token 权限

把令牌的账户资源限定到运行 NextMail 的 Cloudflare 账号。邮件路由权限限定到
`EMAIL_DOMAIN` 所属的 Zone；设置 `CUSTOM_DOMAIN` 时，网站路由权限限定到拥有该
主机的 Zone。两者可能不同。

| 范围 | 权限 |
| --- | --- |
| 账户 | `D1: Edit`、`Workers KV Storage: Edit`、`Workers Scripts: Edit` |
| `EMAIL_DOMAIN` 所属 Zone | `Zone: Read`、`Email Routing Rules: Edit` |
| `CUSTOM_DOMAIN` 所属 Zone（设置时） | `Zone: Read`、`Workers Routes: Edit`、`WAF: Edit`、`Bot Management: Read` |

本项目**不需要** `Cloudflare Pages: Edit`、`Zone Settings: Read/Edit`、
`DNS: Edit`、`API Tokens: Edit` 或 `Email Routing Addresses: Edit`。

WAF 与 Bot Management 的只读前置检查会在构建前确认对应 Zone 的可访问性。由于
Cloudflare 的 Token 验证接口不返回权限策略，`WAF: Edit` 无法单独证明——部署会
在构建完成、检查数据库与 Webhook 之后、数据库迁移之前，在需要时创建或更新项目
规则来确认该写权限。如果项目规则已经匹配，部署会保持规则不变。

:::tip
如果通过 API 创建账户部署令牌，请使用单独具备 `Account API Tokens: Edit` 权限的
引导令牌，按上述权限创建部署令牌后，把新令牌保存到被忽略的 `.env.deploy`。部署
令牌本身不需要令牌管理权限。API 权限组名称中的 `Write` 对应控制台的 `Edit`——
请从目标账户的权限组接口获取 ID，不要凭名称猜测或复用其他权限组 ID。
:::

## GitHub Actions 部署

同一个部署命令可以在 GitHub Actions 中运行。工作流的触发方式：

1. **自动触发**——推送新的 tag 会启动部署流程。
2. **手动触发**——在 Actions 标签页手动运行。

### 步骤

1. 通过上面的自动同步，或手动在 GitHub Actions 仓库级 Secrets 中配置认证、
   Cloudflare 凭据与部署参数。工作流只从 Secrets 读取这些值；CI 不需要也不会
   读取 `.env.deploy`。它执行检查后运行 `npm run deploy`。

2. 选择触发方式：

   **推送 tag**

   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

   **手动触发**——打开仓库的 Actions 标签页，选择 *Deploy* 工作流，点击
   *Run workflow*。

3. 在 Actions 标签页查看进度。

### 注意事项

- CI 不需要 `.env.deploy`。首次触发前，请确认仓库 Secrets 已配置，至少包括
  `CLOUDFLARE_ACCOUNT_ID`、`CLOUDFLARE_API_TOKEN`、`AUTH_SECRET`、
  `EMAIL_DOMAIN` 和 `NEXT_PUBLIC_BASE_URL`。
- `DATABASE_ID`、`KV_NAMESPACE_ID`、`CUSTOM_DOMAIN`、
  `OPENAPI_WAF_VERIFY_SECRET`、`EMAIL_DOMAIN`、`WEBHOOK_ALLOWED_HOSTS` 和
  `NEXT_PUBLIC_BASE_URL` 同样从 Actions Secrets 读取。此前只配置在 Actions
  *Variables* 中的值需要迁移。
- 下文列出的可选站点设置和 `ADMIN_USERS` 也以同名 Actions Secrets 传入。只更新
  本地文件不会改变尚未同步的 CI 配置。
- tag 触发要求 tag 以 `v` 开头，例如 `v1.0.0`。

## 环境变量

### 认证相关

| 变量 | 用途 |
| --- | --- |
| `AUTH_SECRET` | 加密 session 的 NextAuth 密钥——请使用随机字符串 |
| `AUTH_GITHUB_ID` | GitHub OAuth App ID |
| `AUTH_GITHUB_SECRET` | GitHub OAuth App Secret |
| `AUTH_GOOGLE_ID` | Google OAuth App ID |
| `AUTH_GOOGLE_SECRET` | Google OAuth App Secret |

GitHub 和 Google 登录都是可选的。只有当某个提供商的 ID **和** Secret 都存在且
非空时才会启用，否则按钮不会显示。

`NEXT_PUBLIC_BASE_URL` 是必填项，即应用的公开基础地址——请设置为实际的 Worker
地址或 `CUSTOM_DOMAIN`，以便生成正确的 canonical 和 `hreflang` 链接。该值在构建
时写入应用，缺失时部署脚本会在构建前终止。OAuth 回调地址由请求地址推导，不使用
这个变量。

### Cloudflare 相关

| 变量 | 用途 |
| --- | --- |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare 账号 ID |
| `CLOUDFLARE_API_TOKEN` | 具备[最小权限](#cloudflare-api-token-权限)的 Cloudflare API Token |
| `EMAIL_DOMAIN` | 收件域名，例如 `example.com` |
| `DATABASE_ID` | 可选，指定 `nextmail-d1` 数据库的 ID；留空时按名称查找 |
| `KV_NAMESPACE_ID` | 可选，指定 `nextmail-kv` 命名空间的 ID；留空时按名称查找 |
| `CUSTOM_DOMAIN` | 可选，公开主机名，例如 `app.example.com` |
| `OPENAPI_WAF_VERIFY_SECRET` | 设置 `CUSTOM_DOMAIN` 时必填 |

D1 数据库名为 `nextmail-d1`，KV 命名空间名为 `nextmail-kv`。显式设置
`DATABASE_ID` 或 `KV_NAMESPACE_ID` 时，脚本会校验该 ID 确实指向同名资源，不符
则在写入 Wrangler 配置之前停止。

`EMAIL_DOMAIN` 必须与账号中的某个 Zone 名称完全一致。部署脚本会配置该 Zone 的
Catch-all；当它只匹配到父 Zone 时，脚本会在修改数据库和发布之前停止，避免改动
父域的 Catch-all。使用子域名收信时，请先完成
[邮件路由子域名配置](https://developers.cloudflare.com/email-service/configuration/subdomains/)，
并确认该子域名能匹配到独立的同名 Zone。

`CUSTOM_DOMAIN` 必须属于本 Cloudflare 账号管理的 Zone。部署使用 Worker 自定义
域名，由 Cloudflare 配置 DNS 记录和证书——你不必事先创建已代理的 DNS 记录。留空
则启用 `workers.dev` 地址。该主机名应专供本应用使用；`pages.dev` 不属于你的
Zone，不能用于此项。

从旧版普通 Worker Route 升级时，请在自定义域名绑定成功后，到 Cloudflare 中移除
同一主机名、指向 `nextmail` 的旧 `HOST/*` 路由。Wrangler 发布自定义域名后可能
仍保留旧路由；其他主机或其他 Worker 的路由应保留。

### GitHub 同步

| 变量 | 用途 |
| --- | --- |
| `REPOSITORY_URL` | 目标 GitHub 仓库 URL——必须与 `GITHUB_TOKEN` 同时填写 |
| `GITHUB_TOKEN` | 对目标仓库具备 `Secrets: Read and write` 权限的 GitHub 令牌 |

### 配置文件如何被处理

只有配置入口读取 `.env.deploy`，并把其中的值放入进程环境。它绝不生成应用
`.env` 或 `.dev.vars`。构建拒绝旧的应用环境文件，并且只公开允许的 `NEXT_PUBLIC_`
配置。认证和 OAuth 值作为 Worker Secrets 单独安装。Cloudflare 部署令牌、账号
初始化 JSON、Resend Key 和 Turnstile Secret 都不应进入可下载的 Worker 包。

构建既不发布也不应用远端配置。

## 部署时初始化站点设置

以下变量都位于 `.env.deploy.example` 的可选项部分。本地完整部署读取
`.env.deploy`；GitHub Actions 使用同名 Secrets。未设置或为空字符串会保留已存储
的值；填写的值会在每次完整部署时应用——需要保留浏览器后续的修改时，请清空
对应的部署覆盖项。仅执行构建或单独发布某个 Worker 都不会应用这些配置。

| 变量 | 用途 / 格式 |
| --- | --- |
| `DEFAULT_ROLE` | 新账号的默认角色：`civilian`、`knight` 或 `duke`——不能设为皇帝 |
| `EMAIL_DOMAINS` | 收件域名，逗号分隔；首次未填写时从必填的 `EMAIL_DOMAIN` 初始化 |
| `ADMIN_CONTACT` | 展示给用户的联系方式 |
| `MAX_EMAILS` | 非皇帝账号的活跃邮箱上限——正安全整数 |
| `TURNSTILE_ENABLED` | `true` 或 `false`；启用时需要下面两个 Key |
| `TURNSTILE_SITE_KEY`、`TURNSTILE_SECRET_KEY` | 公开 Key 与服务端 Secret；空值保留已存的 Key |
| `RESEND_CONFIG` | JSON：按接收域名配置 `{ "enabled": true, "apiKey": "..." }`——启用必须提供 Key |
| `EMAIL_ROLE_LIMITS` | JSON：`{"duke":5,"knight":2}`——`-1` 禁止、`0` 不限、正整数限制每日封数 |
| `CATCHALL_EMAIL` | JSON：按接收域名配置 `{ "address": "catch@example.com", "enabled": true, "showAlways": true }`；需包含全部域名，`{}` 清空配置 |
| `CATCHALL_OWNER_USERNAME` | 可选的 Catch-all 所有者用户名——所有者必须是站点唯一的皇帝 |
| `ADMIN_USERS` | 可选，用于创建或更新账号的 JSON 数组 |

Catch-all 需要已存在的皇帝账号，或在同一次部署中由 `ADMIN_USERS` 创建皇帝。
重新部署、改名以及 KV 写入失败后重试，都会保留邮箱身份和它的邮件；与其他邮箱
地址冲突时会停止。

站点设置、账号写入、KV、迁移和发布不是同一个整体事务。执行到一半失败时，应先
检查哪些阶段已经完成。

### 可选的账号初始化

示例仅说明格式——请替换所有密码和 Key，且绝不要提交真实值：

```dotenv
ADMIN_USERS='[{"username":"admin","password":"replace-with-a-strong-password","name":"Administrator","role":"emperor"},{"username":"automation","password":"replace-with-another-password","role":"duke","allowedDomains":["example.com"],"apiKeys":[{"name":"automation","key":"replace-with-a-long-random-key","enabled":true}],"webhook":{"url":"https://hooks.example.org/mail","secret":"replace-with-signing-secret","enabled":false}}]'
```

- 最多配置 100 个账号和合计 500 个 API Key。新账号必须有符合注册规则的用户名和
  至少 8 位密码；密码使用应用同一算法保存。未指定角色时新账号为平民。
- 用户名定位已有的密码账号。只更新明确提供的字段，省略或空字符串保留原值，
  未列出的账号或 Key 不会被删除。配置仍保留密码或角色时，后续部署会继续应用
  这些覆盖值。
- `role` 可以是 `emperor`、`duke`、`knight` 或 `civilian`。站点仍然只能有一个
  皇帝，且不会降级已有皇帝——需要创建皇帝时请明确指定。
- `allowedDomains` 省略保留原值，`null` 表示无单独限制，`[]` 禁止全部域名。非空
  数组只能使用站点的接收域名，且不能限制皇帝。
- `apiKeys` 按当前用户的名称更新。新增必须提供 `key`，且只有具备 API Key 管理
  权限的角色可以配置。`expiresAt` 是 ISO 时间，省略则保留已有有效期。新 Key 默认
  有效一年，不能填 `null`。完整 Key 可以在该账号的个人中心以明文查看，用户已
  接受此行为。
- `webhook` 支持 `url`、`secret`、`enabled`。启用或设置目标时必须满足
  `WEBHOOK_ALLOWED_HOSTS` 和角色权限。部署不会发送测试 Webhook 或邮件。

除上述覆盖设置外，分享链接、收发邮件等用户业务数据仍由应用管理，部署不会伪造
历史记录。

## Webhook 白名单

`WEBHOOK_ALLOWED_HOSTS` 是启用 Webhook 投递的必要条件。它是一个逗号分隔的
精确受信主机名列表，由运营方批准，不含协议、路径、端口或通配符：

```dotenv
WEBHOOK_ALLOWED_HOSTS="hooks.example.com,notifications.example.com"
```

在仓库根目录的 `.env.deploy` 中设置它，或作为同名 GitHub Actions Secret 设置。
`npm run deploy` 会把白名单分别安装到主应用 Worker 和 Email Worker。本地开发和
预览同样使用 `.env.deploy`，因此不需要 `.dev.vars`。单独运行某个组件的发布命令
不会执行完整部署的设置同步——请先用完整部署安装 Secrets 和站点设置。

升级前请复核已启用的 Webhook 目标，只批准受信运营方控制的主机。部署会在迁移或
发布前检查这些目标，如果任何目标会被阻止就停止。它永远不会自动批准已保存的
用户 URL。如果一个 Webhook 都没启用，允许为空——个人中心页面会说明需要站点
管理员先完成设置，然后才能启用 Webhook；在设置未完成时仍然可以禁用已有 Webhook。

部署完成后，在已批准的主机上保存一个 HTTPS Webhook URL，并在个人中心页面使用
**测试**。未批准的主机、重定向、非 HTTPS URL、凭据、片段和非标准端口都会被
拒绝。`GET /api/webhook` 只报告是否配置了签名密钥，绝不返回密钥本身——请自行
保管。验证 `X-Webhook-Signature` 是 `sha256=` 后接
`X-Webhook-Timestamp + "." + 原始请求体` 的十六进制 HMAC-SHA256 值，并拒绝过期
的时间戳以防止重放攻击。详见 [Webhook](/guides/webhooks)。

## OAuth 应用

### GitHub

1. 登录 [GitHub Developer 设置](https://github.com/settings/developers)，创建一个
   新的 OAuth App。
2. 生成新的 `Client ID` 和 `Client Secret`。
3. 配置：
   - **Application name**：`<your-app-name>`
   - **Homepage URL**：`https://<your-app-host>`
   - **Authorization callback URL**：
     `https://<your-app-host>/api/auth/callback/github`

### Google

1. 打开 [Google Cloud Console](https://console.cloud.google.com/) 并创建项目。
2. 配置 OAuth 同意屏幕。
3. 创建 OAuth 客户端 ID：
   - 应用类型：*Web 应用*
   - 已获授权的 JavaScript 来源：`https://<your-app-host>`
   - 已获授权的重定向 URI：`https://<your-app-host>/api/auth/callback/google`
4. 把客户端 ID 和 Secret 保存为 `AUTH_GOOGLE_ID` 和 `AUTH_GOOGLE_SECRET`。

## 多域名 Catch-all

主应用和 Email Worker 必须绑定**同一个** `SITE_CONFIG` KV 命名空间。完整部署
脚本会同步两个生成文件中的绑定；手动部署前先运行 `npm run config:wrangler`，
再同时检查 `./wrangler.json` 和 `./wrangler.email.json`。

每个收件域名都需要自己的 Cloudflare 邮件路由规则，把邮件交给 Email Worker。完整
部署只自动配置 `EMAIL_DOMAIN` 对应的 Zone，其余域名需要单独配置。

网站域名不是收件域名，不能作为默认域名使用。

## 升级

升级前先备份 D1。相关迁移如下：

| 迁移 | 用途 |
| --- | --- |
| `0020_user_email_domain_access.sql` | 按用户的域名限制 |
| `0021_message_read_tracking.sql` | 已读状态与统计索引 |
| `0022_stable_mail_delivery.sql` | 稳定的 Catch-all 映射与到达序号 |
| `0023_webhook_user_unique.sql` | 每个用户只有一个 Webhook |
| `0024_message_delivery_key.sql` | 入站投递去重键 |
| `0025_expiry_cleanup_indexes.sql` | 清理索引 |
| `0026_mailbox_created_at_index.sql` | 邮箱分页索引 |

迁移 `0022` 会为已有邮件回填到达序号，并用触发器记录之后的每次插入，因此它的
耗时取决于你已有的邮件数量。它不删除邮件，也不修改邮件时间戳。旧版时间戳游标
在新版接口上会重放一次元数据，客户端按 ID 去重。

升级前请检查实际待执行的 SQL。Node 测试通过不能代替远端 D1 迁移或真实的 SMTP
验证。

:::warning
手动升级请按此顺序：先应用迁移，再发布 Email Worker，最后发布主应用。完整部署
脚本会先发布主应用、再发布 Email Worker——使用完整脚本时，必须等两个 Worker
都更新成功后才能修改 Catch-all 前缀。
:::

## 移除部署

确认要删除 NextMail 的 Cloudflare 资源和 D1 数据后，在仓库根目录运行：

```bash
npm run delete
```

命令从 `.env.deploy` 和进程环境读取 `CLOUDFLARE_ACCOUNT_ID`、
`CLOUDFLARE_API_TOKEN` 和 `EMAIL_DOMAIN`；如果曾部署过自定义域名路由，请保留
对应的 `CUSTOM_DOMAIN` 或生成的 `wrangler.json` 中的路由配置。脚本会先验证
Token，并在删除任何东西之前列出将处理的资源。仍然存在的 D1/KV 显式 ID 必须
分别指向名为 `nextmail-d1` 和 `nextmail-kv` 的项目资源，否则命令会停止；已不
存在的 ID 会按已清理资源跳过。

清理范围仅限 `nextmail`、`email-receiver-worker`、`cleanup-worker` 三个 Worker，
项目配置中指向 `nextmail` 的精确路由，名为 `nextmail-kv` 的 KV 命名空间，名为
`nextmail-d1` 的 D1 数据库，以及仍把邮件转发给 `email-receiver-worker` 的
`EMAIL_DOMAIN` Catch-all。

删除 D1 数据库会移除其中的应用数据——执行前请先备份。部署覆盖 Catch-all 之前
会在项目 KV 中按 Zone 保存原规则，也会记录"原先不存在规则"这一状态；后续部署
保留首次记录，不把 NextMail 自身的收件规则当作原规则。清理时，只有当前 Catch-all
仍指向 NextMail Worker 才会恢复同一 Zone 的原规则；原先不存在规则、升级前未
备份，或备份无法确认所属 Zone 时，会把当前规则禁用。旧版不含 Zone 信息的备份
不会跨 Zone 恢复，已覆盖且未保存的旧配置无法找回。

脚本不会删除 Cloudflare Zone，也绝不直接调用 DNS API。它不会修改 GitHub 仓库、
Actions Secrets、OAuth 应用、本地 `.env.deploy` 或 Wrangler 配置。Worker 自定义
域名的 DNS 和证书由 Cloudflare 托管；再次部署会按 `CUSTOM_DOMAIN` 重建关联。

清理后，被忽略的 `wrangler.json` 仍保留上次部署的资源 ID 和路由；仓库中只保留
不含资源 ID 的 `wrangler.example.json` 模板。再次部署时，如果显式设置的
`DATABASE_ID` 或 `KV_NAMESPACE_ID` 仍指向已删除的资源，请先清除或更新它们。
这个流程不是原子的——如果 Cloudflare API 在部分删除后失败，可以再次运行，已不
存在的 Worker、路由或资源会被跳过。

## 部署之后

1. 确认前端能正常加载，没有出现 Cloudflare 挑战。
2. 确认该域名的 Catch-all 规则指向 `email-receiver-worker`，然后给一个从未创建
   过的地址发一封测试邮件，检查 Catch-all 邮箱。
3. 创建第一个账号，在个人中心页面认领皇帝角色——见
   [角色与权限](/getting-started/roles)。
4. 在站点设置中配置收件域名，并按需配置 Catch-all 邮箱。
5. 在任何人启用 Webhook 之前，先在 `WEBHOOK_ALLOWED_HOSTS` 中批准主机。
