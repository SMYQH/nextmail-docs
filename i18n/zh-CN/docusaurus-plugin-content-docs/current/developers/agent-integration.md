---
title: AI 代理接入
description: AI 代理或脚本如何通过 NextMail 接收邮件。
sidebar_position: 3
---

# AI 代理接入

NextMail 从设计上就是为程序驱动的。本页给出从"我有一个代理"到"我的代理收到邮件"
的最短路径，以及你在此基础上构建工具时真正需要知道的细节。

## 五分钟上手

1. **创建 API Key**——用公爵或皇帝角色登录，打开个人中心页面并创建 API Key。
2. **读取域名**——`GET /api/config` 返回 `emailDomains`，已认证的调用方还会得到
   `availableEmailDomains`。
3. **创建邮箱**——`POST /api/emails/generate`，`domain` 取自第 2 步，`expiryTime`
   随意选择。
4. **轮询消息**——`GET /api/emails/{emailId}?since=<cursor>`，并保存返回的
   `latestCursor`。
5. **响应**——通常 Webhook 比轮询更好；见下文。

```bash
# 1. 创建一个存活一天的邮箱
curl -s -X POST https://app.example.com/api/emails/generate \
  -H "X-API-Key: $NEXTMAIL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name":"agent","expiryTime":86400000,"domain":"example.com"}'
```

```json
{
  "id": "b7f1…",
  "address": "agent@example.com",
  "expiryTime": 86400000
}
```

## 正确地轮询

`since` 游标是*到达序号*，不是时间戳。这让它非常稳定：迟到的邮件仍会被返回，
序号也永不复用。

```javascript
const headers = { 'X-API-Key': process.env.NEXTMAIL_API_KEY };
let cursor;

export async function fetchNewMessages(emailId) {
  const url = new URL(`https://app.example.com/api/emails/${emailId}`);
  if (cursor) url.searchParams.set('since', cursor);

  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`NextMail responded ${response.status}`);

  const data = await response.json();
  cursor = data.latestCursor;
  return data.messages;
}
```

几条能省下调试时间的规则：

- **只在第一次成功调用之后才发送 `since`。** 没有游标时接口返回最新的一页。
- **持久化游标**——如果你的代理可能被中断，否则会重复读到同一页。
- **按 `messageId` 去重。** Webhook 投递可能重复，旧版时间戳游标也会重放一次。
- **绝不伪造游标。** 格式错误的游标会以 `400` 被拒绝，而不是静默地重新开始轮询。

## 尽可能用 Webhook

对于事件驱动的代理，Webhook 比轮询更省也更快的：邮件 Worker 会把每一封新邮件推
送到你的端点，并带重试。

```json
{
  "emailId": "b7f1…",
  "messageId": "m-42",
  "fromAddress": "sender@example.com",
  "subject": "Your verification code",
  "content": "Code: 123456",
  "html": "<p>Code: 123456</p>",
  "receivedAt": "2024-01-01T12:00:00.000Z",
  "toAddress": "agent@example.com"
}
```

信任载荷之前请验证 `X-Webhook-Signature` 请求头——见 [Webhook](/guides/webhooks)。

## 设计代理工具

如果你把 NextMail 作为工具暴露给模型，这些原语与 API 天然对应：

| 工具 | 接口 | 说明 |
| --- | --- | --- |
| `create_mailbox` | `POST /api/emails/generate` | 返回一个可以交给人类的地址 |
| `list_mailboxes` | `GET /api/emails` | 支持 `domain` 过滤 |
| `read_messages` | `GET /api/emails/{emailId}` | 用 `since` 做增量读取 |
| `read_message` | `GET /api/emails/{emailId}/messages/{messageId}` | 完整正文，两种格式 |
| `share_mailbox` | `POST /api/emails/{emailId}/share` | `expiresIn: 0` 表示永久 |
| `send_mail` | `POST /api/emails/{emailId}/send` | 消耗每日配额 |

几条实用建议：

- **给代理一个受限的 Key。** Key 归属于某个用户，继承该用户的配额和权限。
- **对模型可能影响的东西，优先用 `expiresIn` 而非永久分享。** 永久分享就是永久
  泄漏。
- **净化 HTML 正文。** API 返回原始 `html` 字段；要把它当作不可信输入处理，与
  Web UI 用沙箱 iframe 的做法一致。
- **尊重邮箱上限。** `MAX_EMAILS` 限制非皇帝账号可拥有的邮箱数量。

## 错误处理

| 状态码 | 代理应该怎么做 |
| --- | --- |
| `400` | 修正请求——通常是游标、日期或字段类型不对 |
| `401` | Key 缺失、错误或已被吊销 |
| `403` | 该 Key 不能操作该资源（Catch-all 邮箱） |
| `409` | 名称冲突——例如 API Key 名称已被占用 |
| `429` | 每日发信配额已用尽；停止发送 |
| `503` | 站点没有配置收件域名——这是运营方的问题 |

## 值得纳入规划的限制

- 邮箱会过期：1 小时、1 天、3 天或永久。
- `MAX_EMAILS` 限制每个账号的活跃邮箱数量。
- 发信按角色按天设上限；配额在 UTC 00:00 重置。
- Webhook 投递最多重试三次——务必去重。
- 入站邮件按投递键去重，因此重复投递的邮件只会存一份。

## 相关项目

上游 MoeMail 项目提供了一个面向代理的 CLI 和一个 MCP 服务器。NextMail 目前专注于
Web 应用和 HTTP API；如果你需要 CLI 或 MCP 服务器，可以对上面描述的接口做一层
封装。
