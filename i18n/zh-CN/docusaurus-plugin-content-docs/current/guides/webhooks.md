---
title: Webhook
description: 通过带签名的 Webhook 回调接收每一封新邮件。
sidebar_position: 1
---

# Webhook

当一封邮件到达时，NextMail 会向该账号配置并启用的 Webhook URL 发送一个 `POST`
请求。

## 前置条件

只有运营方批准的托管目标才能接收 Webhook。部署设置 `WEBHOOK_ALLOWED_HOSTS`
保存一个逗号分隔的精确受信主机名列表——不含协议、路径、端口或通配符：

```dotenv
WEBHOOK_ALLOWED_HOSTS="hooks.example.com,notifications.example.com"
```

部署会把这个列表分别安装到主 Worker 和 Email Worker。列表未配置时，个人中心
页面会说明需要管理员先完成设置；已有 Webhook 仍可被禁用。

## 配置

1. 打开你的个人中心页面。
2. 启用 Webhook 并填写 HTTPS URL。
3. 保存后使用**测试**发送一个示例请求。

测试按钮只在 Webhook 保存成功后可用：如果不存在该 URL 的记录，请求会以 HTTP 400
失败，错误码为 `saveBeforeTest`。

被拒绝的目标包括：未批准的主机、重定向、非 HTTPS URL、带凭据或片段的 URL，以及
非标准端口。

## 请求格式

```http
POST /your-endpoint HTTP/1.1
Content-Type: application/json
X-Webhook-Event: new_message
```

```json
{
  "emailId": "email-uuid",
  "messageId": "message-uuid",
  "fromAddress": "sender@example.com",
  "subject": "Subject line",
  "content": "Plain text body",
  "html": "<p>HTML body</p>",
  "receivedAt": "2024-01-01T12:00:00.000Z",
  "toAddress": "your-mailbox@example.com"
}
```

| 字段 | 说明 |
| --- | --- |
| `emailId` | 收到该邮件的邮箱 |
| `messageId` | 邮件标识符——重投时保持稳定 |
| `fromAddress` | 发件人，尽可能取自邮件头 |
| `subject` | 主题行 |
| `content` | 纯文本正文 |
| `html` | HTML 正文（当邮件包含时） |
| `receivedAt` | ISO 8601 时间戳 |
| `toAddress` | 真实的收件地址 |

## 验证签名

如果配置了签名密钥，每个请求都会带上：

```http
X-Webhook-Signature: sha256=<hex>
X-Webhook-Timestamp: <unix timestamp>
```

签名是 `X-Webhook-Timestamp + "." + <原始请求体>` 的十六进制 HMAC-SHA256。
请验证签名，并拒绝过于陈旧的时间戳以防止重放攻击。

密钥永不离开服务端：`GET /api/webhook` 只报告 `enabled`、`url`、`hasSecret`
和 `setupError`，响应使用 `Cache-Control: no-store` 发送。

## 可靠性

- 在 **10 秒**内响应。端点过慢可能导致投递超时。
- 测试按钮和邮件 Worker 最多重试投递 **3 次**。
- Webhook 投递失败绝不会删除或拒绝已经存储的邮件，也绝不会让入站 SMTP 事务失败。
- 可能出现重复投递：同一个 `messageId` 可能到达两次。请按 `messageId` 去重。

## 本地测试

应用仓库自带一个用于开发的接收器：

```bash
npm run webhook-test-server
```

它监听 `http://localhost:3001`，打印每次投递的邮件主题并以 HTTP 200 应答。要
暴露到公网，请安装
[Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)
并运行：

```bash
cloudflared tunnel --url http://localhost:3001
```
