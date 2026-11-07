---
title: Overview
description: What NextMail is, who it is for, and the concepts you need before deploying.
sidebar_position: 1
---

# NextMail overview

NextMail is a self-hosted temporary email service. It runs entirely on your own
Cloudflare account: a Next.js application on Workers, mailboxes in D1, site
settings in KV, and inbound mail handled by a Cloudflare Email Worker.

There is no vendor account to create and no per-user billing. You own the
domain, the Cloudflare resources and the data.

## What you get

- **Disposable mailboxes** with a configurable lifetime (1 hour, 1 day, 3 days or
  permanent), optionally prefixed with a name you choose.
- **Multiple receiving domains** served by the same deployment, each with its own
  catch-all rules.
- **A role system** that separates site administration (Emperor) from everyday
  use (Duke, Knight, Civilian).
- **Webhooks** that POST every new message to a URL you control.
- **An OpenAPI surface** for creating mailboxes, reading messages and sharing
  links, authenticated with API keys.
- **Sending** through Resend, with per-role daily quotas.
- **Bilingual UI** (English and Simplified Chinese) and a PWA-capable web app.

## Two ways to read this site

| If you are… | Start here | What you will learn |
| --- | --- | --- |
| New to self-hosting | [Quick deploy](/getting-started/quick-deploy) | Deploy, point a domain at it, receive your first mail |
| A developer or an AI agent | [Architecture](/developers/architecture) | Components, data model, API and automation |

## Core concepts

**Receiving domain**
: A domain you have configured with Cloudflare Email Routing. NextMail only
accepts mail for domains that the operator has enabled — see
[Email domain and routing](/getting-started/email-domain).

**Mailbox**
: A temporary address (`prefix@domain`) owned by one user. A mailbox has an
expiry time and owns its messages, its shares and its sending quota usage.

**Catch-all**
: A system mailbox that receives mail sent to *any* address on a domain, even
addresses nobody created. The Emperor can enable one catch-all per domain and
choose whether it stays visible after being disabled.

**Role**
: `Emperor`, `Duke`, `Knight` or `Civilian`. Roles decide which features are
available — see [Roles and permissions](/getting-started/roles).

**API key**
: A credential for the OpenAPI endpoints. Only Dukes and Emperors can create
one; it is created in the profile page.

**Webhook**
: An HTTPS endpoint that receives a `POST` for every new message delivered to
your mailboxes — see [Webhooks](/guides/webhooks).

## How mail flows through NextMail

```text
sender ──► Cloudflare Email Routing ──► Email Worker ──► D1 (messages)
                                                          │
                                          Webhook POST ───┘
                                                          │
user ──► Next.js app on Workers ──► D1 (mailboxes, users) + KV (site settings)
```

The application never receives inbound mail directly: Cloudflare Email Routing
routes it to a dedicated Email Worker, which stores the message and then
notifies your webhook.

## Before you start

You need a Cloudflare account with a zone whose DNS is managed by Cloudflare,
a domain (or subdomain) you can point at NextMail, and Node.js 24+ if you
intend to run the deployment script locally.

Continue with [Quick deploy](/getting-started/quick-deploy).