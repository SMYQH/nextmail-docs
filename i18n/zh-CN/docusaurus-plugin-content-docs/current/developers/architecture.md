---
title: 系统架构
description: 构成一次 NextMail 部署的 Workers、D1 与 KV。
sidebar_position: 1
---

# 系统架构

一次 NextMail 部署由三个 Worker 和两个 Cloudflare 资源组成。

```text
                          ┌──────────────────────────┐
   浏览器 ───────────────►│  nextmail（Next.js 应用） │──► D1（用户、邮箱、邮件）
                          └────────────┬─────────────┘
                                       │
                                       ▼
                                    KV（站点设置）

   发件人 ─► 邮件路由 ─► email-receiver-worker ─► D1 ─► webhook POST
                                        │
   定时任务 ────────────────────────► cleanup-worker ─► D1（过期邮箱/邮件）
```

## 组件

### `nextmail`——应用 Worker

Next.js 16（App Router）配合 React 19，通过
[OpenNext](https://opennext.js.org/cloudflare) 打包到 Workers。它提供 Web UI 和
`/api/*` 路由处理器。它从不参与 SMTP 协议，只负责读写数据库和 KV 命名空间。

运行时要求：

- 兼容性标志 `nodejs_compat`、`nodejs_compat_populate_process_env`
  和 `global_fetch_strictly_public`
- 兼容性日期 `2025-04-01` 或更新
- Node.js 运行时——**不要**在路由处理器中添加 `runtime = "edge"`

Worker 中的 `process.env` 依赖前两个标志。参见
[Cloudflare Node.js 兼容性文档](https://developers.cloudflare.com/workers/runtime-apis/nodejs/)。

### `email-receiver-worker`

绑定到 Cloudflare 邮件路由规则的小型 Worker。它用 `postal-mime` 解析来信，将其
存入 D1，然后触发 Webhook 投递。

如果解析或数据库写入失败，它会以永久 SMTP 失败（`setReject`）拒收该邮件——发件人
需要在服务恢复后重新发送。已经成功存储的邮件绝不会因为后续的 Webhook 失败而被
拒收。

### `cleanup-worker`

定时运行的 Worker，以有界的批次删除过期邮箱及其邮件，避免积压过大超出 D1 的查询
预算。它还负责维护让过期扫描和邮箱分页保持高效的索引。

### D1

SQLite，通过 [Drizzle ORM](https://orm.drizzle.team/) 访问。它保存用户、邮箱、
邮件、分享、API Key、Webhook 和角色分配。Schema 与迁移位于应用仓库的 `drizzle/`
目录下。

### KV

一个名为 `nextmail-kv` 的命名空间保存站点设置：收件域名、默认角色、上限、
Catch-all 配置、发信配置和 Turnstile 密钥。应用 Worker 与 Email Worker 绑定
同一个命名空间——Catch-all 邮箱身份正是通过它解析的。

## 请求流程

**创建邮箱**

1. UI 读取 `/api/config` 获取该账号可用的域名。
2. 客户端向 `/api/emails/generate` 提交前缀、域名和有效期。
3. 路由用 `EMAIL_DOMAINS` 校验域名，检查 `MAX_EMAILS` 上限，在 D1 中插入行并
   返回地址。

**接收邮件**

1. Cloudflare 邮件路由匹配 Catch-all 规则，把原始邮件交给
   `email-receiver-worker`。
2. Worker 解析目标邮箱：已有地址优先，否则使用该域名的 Catch-all 邮箱——前提是
   该域名启用了 Catch-all。
3. 邮件以单调递增的到达序号写入。
4. Worker 以 POST 触发 Webhook，最多重试三次。

**读取邮件**

`GET /api/emails/{id}` 支持两种模式：

- `?cursor=`——向后翻页浏览消息列表。
- `?since=`——用到达游标做增量轮询；响应会带上新的 `latestCursor`。

到达序号由数据库触发器分配，因此排序不依赖时间戳或随机 ID，序号也永不复用。

## 数据模型（节选）

| 表 | 内容 |
| --- | --- |
| `user` | 账号、密码哈希、OAuth 身份、角色 |
| `emails` | 邮箱：所有者、地址、域名、到期时间、Catch-all 标记 |
| `messages` | 邮件：邮箱、发件人、主题、正文、已读标记、到达序号 |
| `email_shares` / `message_shares` | 带有效期的分享链接 |
| `api_keys` | 每个用户的 API Key、启用状态、有效期 |
| `webhook` | 每个用户一个 Webhook：URL、密钥、启用状态 |
| `catch_all_mailboxes` | 域名到 Catch-all 邮箱的稳定映射 |
| `message_arrivals` | 每封邮件的到达序号 |

## 迁移

迁移是 `drizzle/` 下的纯 SQL 文件，用 Drizzle Kit 应用。部署脚本在发布新的 Worker
之前应用待执行的迁移。近期升级涉及的关键迁移：

| 迁移 | 用途 |
| --- | --- |
| `0020_user_email_domain_access.sql` | 按用户的域名限制 |
| `0021_message_read_tracking.sql` | 已读状态与统计索引 |
| `0022_stable_mail_delivery.sql` | 稳定的 Catch-all 映射与到达序号 |
| `0023_webhook_user_unique.sql` | 每个用户只有一个 Webhook |
| `0024_message_delivery_key.sql` | 入站投递去重键 |
| `0025_expiry_cleanup_indexes.sql` | 清理索引 |
| `0026_mailbox_created_at_index.sql` | 邮箱分页索引 |

手动升级时：先应用迁移，再发布 Email Worker，最后发布主应用。

## 安全说明

- 凭证保存在 Worker Secrets 中，绝不进入仓库或可下载的 Worker 包。
- API Key、Webhook 密钥和 Turnstile secret 永远不会被 API 返回；只暴露
  `hasSecret` 之类的标志位。
- HTML 邮件正文在沙箱化的 iframe 中渲染；邮件中的脚本永远不会执行。
- 敏感端点的响应使用 `Cache-Control: no-store` 发送。
