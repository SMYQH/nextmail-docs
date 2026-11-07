---
title: Roles and permissions
description: The Emperor, Duke, Knight and Civilian roles and how to change them.
sidebar_position: 5
---

# Roles and permissions

NextMail uses a simple role-based access control system. The role decides
which features an account can use.

| Role | Temporary mailboxes | Webhooks | API keys | User management | Site settings | Sending |
| --- | --- | --- | --- | --- | --- | --- |
| **Emperor** | Yes | Yes | Yes | Yes | Yes | Unlimited |
| **Duke** | Yes | Yes | Yes | No | No | 5 / day |
| **Knight** | Yes | Yes | No | No | No | 2 / day |
| **Civilian** | No | No | No | No | No | Not allowed |

The daily sending limits are defaults; the Emperor can change them in the
profile page. Quotas reset at 00:00 UTC.

## The Emperor

The Emperor is the site owner and the only account with full access. There can
be exactly one Emperor per site.

### Becoming the first Emperor

1. Sign in with the account that should own the site.
2. Open the profile page (click your avatar).
3. If the site has no Emperor yet, the page shows **Initialize site owner**.
4. Confirm the account name in the confirmation box.

The first account that completes this confirmation becomes the Emperor, and the
page reloads with the new role and the administration settings. Once an Emperor
exists, nobody else can be promoted to Emperor.

The endpoint behind this action is `GET`/`POST /api/roles/init-emperor`:

| Situation | Response |
| --- | --- |
| Not signed in | `401` |
| The site already has an Emperor | `409` |
| Session expired | `401` — sign in again |

A `HEAD` request never performs the initialisation. If someone else claimed
the role first, the UI reports it and your account is left unchanged.

## Changing roles

The Emperor can promote or demote other users in the profile page:

- **Duke** — power user: temporary mailboxes, webhooks, API keys.
- **Knight** — regular user: temporary mailboxes and webhooks.
- **Civilian** — no permissions until promoted.

Only the Emperor can manage users, and the Emperor's own role cannot be
downgraded by the interface.

## Default role for new accounts

The default role for new registrations is a site setting (`DEFAULT_ROLE`) with
the values `civilian`, `knight` or `duke`. It can never be set to Emperor.
New accounts inherit the value that is active at registration time.

:::tip
For a private instance, keep the default role at `civilian` and promote the
accounts you trust. For a shared instance, `knight` is a reasonable baseline.
:::