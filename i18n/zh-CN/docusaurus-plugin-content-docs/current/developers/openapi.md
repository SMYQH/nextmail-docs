---
title: OpenAPI 参考
description: 用于创建邮箱、读取邮件和生成分享链接的 REST 接口。
sidebar_position: 2
---

# OpenAPI 参考

API 是一个纯 JSON 的 REST 接口。没有版本前缀，也不要求任何 SDK——`curl` 和
`fetch` 就够了。

## 认证

在 `X-API-Key` 请求头中发送你的 API Key：

```http
X-API-Key: YOUR_API_KEY
```

API Key 在个人中心页面创建，需要**公爵**或**皇帝**角色。Key 的管理本身（创建、
列出、启用、删除）使用登录会话，而不是 API Key。

该 Key 适用于邮箱与配置类接口（`/api/config`、`/api/emails*`）。Webhook、角色
和 Key 管理接口始终要求会话 Cookie。

缺少或无效的凭证会返回带 JSON 正文体的 `401`。

## 约定

| 状态码 | 含义 |
| --- | --- |
| `400` | 输入无效——JSON 格式错误、字段类型错误、游标无效、日期无效 |
| `401` | 缺少或无效的凭证 |
| `403` | 已认证但不被允许（例如 Catch-all 邮箱） |
| `404` | 未知的邮箱、邮件或分享 |
| `409` | 冲突——例如 API Key 名称重复 |
| `503` | 站点没有配置任何收件域名 |

无效输入绝不改变状态：被拒绝的请求不会创建邮箱，也不会翻转 API Key 的启用状态。

## 配置

### 获取站点配置

```http
GET /api/config
```

```json
{
  "defaultRole": "civilian",
  "emailDomains": "example.com",
  "adminContact": "admin@example.com",
  "maxEmails": "30"
}
```

| 字段 | 说明 |
| --- | --- |
| `defaultRole` | 新账号的默认角色：`civilian`、`knight` 或 `duke` |
| `emailDomains` | 收件域名，逗号分隔 |
| `adminContact` | 联系方式 |
| `maxEmails` | 非皇帝账号的活跃邮箱上限 |

已认证的调用方还会收到 `availableEmailDomains`——即他们可以使用的域名。皇帝还会
收到 Turnstile 配置（`enabled`、`siteKey`、`hasSecret`）和 `catchAll.domains`，
后者每一项包含 `enabled`、`showAlways` 和 `mailboxName`。密钥绝不包含在内。

## 邮箱

### 创建邮箱

```http
POST /api/emails/generate
Content-Type: application/json
```

```json
{
  "name": "test",
  "expiryTime": 3600000,
  "domain": "example.com"
}
```

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `name` | 否 | 地址前缀；省略则生成随机地址 |
| `expiryTime` | 是 | `3600000`（1 小时）、`86400000`（1 天）、`259200000`（3 天）或 `0`（永久） |
| `domain` | 是 | `availableEmailDomains` 之一 |

响应包含创建出的邮箱，包括它的 `id` 和 `address`。

### 列出邮箱

```http
GET /api/emails?cursor=<cursor>&domain=<domain>
```

可选参数：

- `cursor`——上一次调用返回的分页游标。
- `domain`——把列表限制到某个收件域名。

Catch-all 邮箱固定在列表最前面。响应包含邮箱列表以及每个邮箱的
`totalMessages` 和 `unreadMessages` 计数。

### 删除邮箱

```http
DELETE /api/emails/{emailId}
```

删除邮箱及其邮件和分享链接。Catch-all 邮箱受保护，返回 `403`。

### 批量删除邮箱

```http
DELETE /api/emails/bulk
Content-Type: application/json
```

```json
{ "emailIds": ["id-1", "id-2"] }
```

若批次中任何一个邮箱不属于你、已过期或是 Catch-all 邮箱，整批失败。不会出现部分
删除。

### 列出邮箱中的邮件

```http
GET /api/emails/{emailId}?cursor=<cursor>&since=<cursor>
```

两种模式：

- `cursor`——向后翻页浏览邮件列表。响应包含 `messages`、`latestCursor` 和
  `hasMore`。
- `since`——增量轮询。返回游标之后到达的邮件，以及下一次轮询要用的
  `latestCursor`。

请原样使用返回的游标。格式错误的游标、日期或 ID 会以 `400` 被拒绝，而不是静默
地重新开始轮询。旧版时间戳游标仍会被接受一次并从头重放，请按邮件 ID 去重。

每封邮件至少包含 `id`、`fromAddress`、`toAddress`、`subject`、`content`、
`html`、`isRead` 及其到达时间戳。

### 读取单封邮件

```http
GET /api/emails/{emailId}/messages/{messageId}
```

返回包含两种正文的完整邮件。

## 分享

### 分享邮箱

```http
POST /api/emails/{emailId}/share
Content-Type: application/json
```

```json
{ "expiresIn": 86400000 }
```

`expiresIn` 是毫秒时长；`0` 创建永久分享。响应包含 `token` 和公开地址
`https://<host>/shared/<token>`。

### 列出邮箱分享

```http
GET /api/emails/{emailId}/share?cursor=<cursor>
```

返回 `{ "shares": [...], "total": n, "nextCursor": "..." }`。

### 删除邮箱分享

```http
DELETE /api/emails/{emailId}/share/{shareId}
```

```json
{ "success": true }
```

### 分享单封邮件

```http
POST /api/emails/{emailId}/messages/{messageId}/share
Content-Type: application/json
```

```json
{ "expiresIn": 0 }
```

公开地址是 `https://<host>/shared/message/<token>`。列出和删除邮件分享的方式与
邮箱分享相同。

## 发信

### 检查邮箱是否可发信

```http
GET /api/emails/send-permission?address=<mailbox-address>
```

### 发送邮件

```http
POST /api/emails/{emailId}/send
Content-Type: application/json
```

```json
{
  "to": "someone@example.com",
  "subject": "Hello",
  "content": "<p>HTML body</p>"
}
```

`to`、`subject` 和 `content` 都是必填。发信会消耗邮箱所有者的每日配额；配额耗尽
时返回 `429`。已发送的邮件会保存在邮箱中。

## API Key 管理

这些接口使用有权管理 Key 的账号会话。

| 方法 | 接口 | 用途 |
| --- | --- | --- |
| `GET` | `/api/api-keys` | 列出你的 Key |
| `POST` | `/api/api-keys` | 创建 Key（`name` 必填且非空） |
| `PATCH` | `/api/api-keys/{id}` | 启用或禁用 Key（`enabled` 必须是 JSON 布尔值） |
| `DELETE` | `/api/api-keys/{id}` | 删除 Key |

用已存在的名称创建 Key 会返回 `409`，错误码 `API_KEY_NAME_EXISTS`——已有的 Key
既不会被替换也不会被返回，即使它已禁用或已过期。字符串 `"false"` 不是布尔值
`false`。

## 示例

创建邮箱：

```bash
curl -X POST https://app.example.com/api/emails/generate \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name":"test","expiryTime":3600000,"domain":"example.com"}'
```

轮询邮箱的新邮件：

```javascript
let cursor;

async function poll(emailId) {
  const url = new URL(`https://app.example.com/api/emails/${emailId}`);
  if (cursor) url.searchParams.set('since', cursor);

  const res = await fetch(url, {
    headers: { 'X-API-Key': 'YOUR_API_KEY' },
  });
  const data = await res.json();

  cursor = data.latestCursor;
  return data.messages;
}
```

分享一个邮箱一天：

```bash
curl -X POST https://app.example.com/api/emails/your-email-id/share \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"expiresIn":86400000}'
```
