---
title: 邮箱域名与邮件路由
description: 用 Cloudflare 邮件路由和 Catch-all 规则把域名接入 NextMail。
sidebar_position: 3
---

# 邮箱域名与邮件路由

只有同时满足两个条件，邮件才会到达 NextMail：该域名在站点设置中被列为
**收件域名**，并且 Cloudflare 邮件路由把该域名转发给 NextMail 的 Email Worker。

## 1. 把域名加入站点设置

皇帝在个人中心页面的站点设置中管理收件域名。列表保存在 Cloudflare KV 的
`EMAIL_DOMAINS` 中，多个域名用逗号分隔。首次部署会从 `EMAIL_DOMAIN` 环境变量
初始化它。

每个域名还可以有自己的 Catch-all 配置——见下文
[按域名配置 Catch-all](#按域名配置-catch-all)。

:::note
未列为收件域名的域名不能用来创建邮箱；当一个收件域名都没有配置时，API 返回
`503`。
:::

## 2. 在 Cloudflare 中启用邮件路由

登录 [Cloudflare 控制台](https://dash.cloudflare.com/)，选择你的 Zone，打开
**电子邮件** → **电子邮件路由**。

1. 如果面板提示路由已被禁用，点击**启用电子邮件路由**。
2. Cloudflare 会提示添加所需的 DNS 记录——点击**添加记录并启用**接受。

![启用电子邮件路由](/img/docs/enable-email-routing.jpg "在 Cloudflare 中启用电子邮件路由")

3. 打开**路由规则**，编辑 **Catch-all 地址**：
   - **操作**：选择*发送到 Worker*
   - **目标位置**：选择 NextMail 部署的 `email-receiver-worker`
   - **保存**

![配置 Catch-all 规则](/img/docs/configure-routing-rule.jpg "把 Catch-all 邮件发送到 NextMail Email Worker")

![添加邮件路由 DNS 记录](/img/docs/add-routing-dns.jpg "添加邮件路由所需的 DNS 记录")

## 3. 验证

给该域名下的任意地址发一封邮件。如果 Catch-all 规则配置正确，邮件会出现在
Catch-all 邮箱（或拥有该地址的邮箱）中。

## 按域名配置 Catch-all

Catch-all 邮箱负责接收发往未创建地址的邮件。皇帝按域名配置它：

| 设置项 | 含义 |
| --- | --- |
| 接收发往未创建地址的邮件 | 是否收集未知收件人 |
| 汇总邮箱地址 | 由哪个邮箱存储这些邮件 |
| 关闭后仍保持显示 | 停止收集后邮箱是否继续显示在列表中 |

重要行为：

- 关闭可见性开关**不会**删除历史邮件，也**不会**改变收集规则。
- 只有所属域名启用了 Catch-all 时，未知地址的邮件才会到达；NextMail 绝不会为
  未知地址自动创建邮箱。
- 重命名 Catch-all 邮箱会保留它的 ID 和已有邮件。
- Catch-all 邮箱归皇帝所有，永不过期，固定在邮箱列表顶部，且不能从列表中删除
  ——它们在站点设置中管理。

## 多域名

一个部署可以服务多个域名。每个域名都需要自己的邮件路由规则指向 Email Worker；
部署脚本只自动配置 `EMAIL_DOMAIN` 对应的 Zone。

皇帝还可以限制某个用户能在哪些域名下创建邮箱。没有明确限制的用户继承全部站点
域名；清空列表会剥夺他们创建新邮箱的能力。已有邮箱不受影响。

## 排查问题

**Catch-all 开关一直转圈**
: 打开**路由规则** → **目标地址**，手动绑定一个邮箱。

**邮件收不到**
: 检查域名是否在站点设置中、Cloudflare 的 Catch-all 操作是否真的指向
`email-receiver-worker`，以及该 Zone 的 DNS 是否由 Cloudflare 托管。

**我收到了属于其他域名的邮件**
: `EMAIL_DOMAIN` 必须与账号中的某个 Zone 名称完全一致。使用子域名时，请先为该
子域名配置邮件路由，并确认它能解析到独立的同名 Zone。
