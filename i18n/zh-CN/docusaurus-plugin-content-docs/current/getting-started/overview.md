---
title: 项目概览
description: NextMail 是什么、适合谁，以及部署前需要了解的概念。
sidebar_position: 1
---

# NextMail 项目概览

NextMail 是一个自托管的临时邮箱服务。它完全运行在你自己的 Cloudflare 账号上：
运行在 Workers 上的 Next.js 应用、存放于 D1 的邮箱、存放在 KV 的站点设置，
以及处理收信的 Cloudflare Email Worker。

你不需要注册任何第三方厂商账号，也不存在按用户计费。域名、Cloudflare 资源和
数据都归你所有。

## 你能得到什么

- **一次性邮箱**：生命周期可选（1 小时、1 天、3 天或永久），可以自定义前缀。
- **多收件域名**：同一个部署可以服务多个域名，每个域名有各自的 Catch-all 规则。
- **角色体系**：把站点管理（皇帝）与日常使用（公爵、骑士、平民）分开。
- **Webhook**：每一封新邮件都会以 `POST` 推送到你指定的 URL。
- **OpenAPI 接口**：创建邮箱、读取邮件、生成分享链接，使用 API Key 认证。
- **发信能力**：通过 Resend 发送邮件，按角色设置每日配额。
- **双语界面**：应用与本文档均提供英文和简体中文，Web App 支持 PWA。

## 两条阅读路径

| 你是…… | 从这里开始 | 你会学到 |
| --- | --- | --- |
| 第一次自托管 | [快速部署](/getting-started/quick-deploy) | 部署、把域名指向它、收到第一封邮件 |
| 开发者或 AI 代理 | [系统架构](/developers/architecture) | 组件、数据模型、API 与自动化 |

## 核心概念

**收件域名**
: 你已经配置好 Cloudflare 邮件路由的域名。NextMail 只接受站点所有者启用的域名
的邮件——详见[邮箱域名与邮件路由](/getting-started/email-domain)。

**邮箱**
: 一个临时地址（`prefix@domain`），归属于某个用户。邮箱有到期时间，拥有自己的
邮件、分享链接和发信配额消耗。

**Catch-all**
: 一个系统邮箱，接收发往域名上*任意*地址的邮件，包括从未创建过的地址。皇帝可以
为每个域名启用一个 Catch-all，并决定关闭后是否仍然显示。

**角色**
: `皇帝`、`公爵`、`骑士`或`平民`。角色决定哪些功能可用——详见
[角色与权限](/getting-started/roles)。

**API Key**
: 用于调用 OpenAPI 接口的凭证。只有公爵和皇帝可以创建，在个人中心页面生成。

**Webhook**
: 接收每封新邮件 `POST` 请求的 HTTPS 端点——详见 [Webhook](/guides/webhooks)。

## 邮件在 NextMail 中的流转

```text
发件人 ──► Cloudflare 邮件路由 ──► Email Worker ──► D1（邮件）
                                                        │
                                          Webhook POST ─┘
                                                        │
用户 ──► Workers 上的 Next.js 应用 ──► D1（邮箱、用户）+ KV（站点设置）
```

应用本身从不直接接收来信：Cloudflare 邮件路由把邮件交给一个专用的 Email
Worker，由它存储邮件，然后通知你的 Webhook。

## 开始之前

你需要一个 Cloudflare 账号，以及一个 DNS 由 Cloudflare 托管的 Zone；需要一个可以
指向 NextMail 的域名（或子域名）；如果你打算在本地运行部署脚本，还需要
Node.js 24 以上版本。

接下来请阅读[快速部署](/getting-started/quick-deploy)。
