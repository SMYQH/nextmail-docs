---
title: 站点设置与发信
description: 皇帝管理的全局设置，以及 Resend 发信配置。
sidebar_position: 6
---

# 站点设置与发信

站点设置保存在 Cloudflare KV 中，所有账号共享。只有皇帝可以在个人中心页面读取
或修改它们。

## 设置总览

| 设置项 | 用途 |
| --- | --- |
| `DEFAULT_ROLE` | 新账号的默认角色：`civilian`、`knight` 或 `duke` |
| `EMAIL_DOMAINS` | 收件域名，逗号分隔 |
| `ADMIN_CONTACT` | 展示给用户的联系方式 |
| `MAX_EMAILS` | 非皇帝账号的活跃邮箱上限（默认 30） |
| `CATCHALL_EMAIL` | 按域名配置的 Catch-all |
| `RESEND_CONFIG` | 按域名配置的发信设置 |
| `EMAIL_ROLE_LIMITS` | 按角色划分的每日发信上限 |
| `TURNSTILE_ENABLED`、`TURNSTILE_SITE_KEY`、`TURNSTILE_SECRET_KEY` | Cloudflare Turnstile 人机验证 |

`MAX_EMAILS` 必须是 1 到 9007199254740991 之间的安全整数。保存时无效值会被
HTTP 400 拒绝；已存储的无效值会回退为 30。皇帝不受此限制。

## 通过 Resend 发信

NextMail 可以使用 [Resend](https://resend.com/) 从临时邮箱发信。发信配置
**按域名**划分：每个收件域名都有独立的启用开关和独立的 API Key。

### 配置

1. 在 [resend.com](https://resend.com/) 注册账号并创建 API Key。
2. 以皇帝身份登录，打开个人中心页面，找到 Resend 区域。
3. 为该域名启用发信并粘贴对应的 API Key。Key 输入框留空表示保留已存的 Key。
4. 对每个需要发信的域名重复以上步骤。
5. 可选：调整公爵和骑士的每日上限，然后保存。

### 使用

启用发信后，你的角色有权发信的邮箱旁会出现**发送邮件**操作。弹窗要求填写收件人、
主题和正文，支持 HTML 内容。已发送的邮件会保存在邮箱中，因此收信与发信共享同一
条时间线。

### 规则与限制

- 每日配额按用户统计，在 UTC 00:00 重置。`-1` 表示禁止发信，`0` 表示不限，正整数
  表示每日封数上限。
- 通过 Resend 使用自定义域名发信，要求该域名已在 Resend 中验证。
- 皇帝从 Catch-all 邮箱发信时可以覆盖*发件人*前缀；普通邮箱始终使用自己的地址
  发信。
- 删除邮箱不会退还配额。

## Cloudflare Turnstile

Turnstile 为注册添加验证码。启用它并同时提供 site key 与 secret。Secret 只保存在
服务端——API 永远不会返回它，secret 输入框留空表示保留当前值。

## 按用户限制域名

在用户管理中，皇帝可以限制某个账号创建邮箱时可用的收件域名。省略列表会保留当前
值，清空列表则移除全部域名，非空列表只能包含站点域名。皇帝始终可以访问所有
域名。该限制只作用于新建邮箱；已有邮箱继续正常工作。
