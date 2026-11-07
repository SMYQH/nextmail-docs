---
title: Architecture
description: The Workers, D1 and KV that make up a NextMail deployment.
sidebar_position: 1
---

# Architecture

A NextMail deployment consists of three Workers and two Cloudflare resources.

```text
                          ┌──────────────────────────┐
   browser ──────────────►│  nextmail (Next.js app)  │──► D1  (users, mailboxes, messages)
                          └────────────┬─────────────┘
                                       │
                                       ▼
                                    KV   (site settings)

   sender ─► Email Routing ─► email-receiver-worker ─► D1 ─► webhook POST
                                       │
   cron ────────────────────► cleanup-worker ─► D1 (expired mailboxes/messages)
```

## Components

### `nextmail` — the application Worker

Next.js 16 (App Router) with React 19, bundled for Workers by
[OpenNext](https://opennext.js.org/cloudflare). It serves the web UI and the
`/api/*` route handlers. It never talks to the SMTP protocol; it only reads and
writes the database and the KV namespace.

Runtime requirements:

- Compatibility flags `nodejs_compat`, `nodejs_compat_populate_process_env`
  and `global_fetch_strictly_public`
- Compatibility date `2025-04-01` or newer
- Node.js runtime — do **not** add `runtime = "edge"` to route handlers

`process.env` inside the Worker relies on the first two flags. See the
[Cloudflare Node.js compatibility docs](https://developers.cloudflare.com/workers/runtime-apis/nodejs/).

### `email-receiver-worker`

A small Worker bound to a Cloudflare Email Routing rule. It parses the
inbound message with `postal-mime`, stores it in D1 and then triggers the
webhook delivery.

If parsing or the database write fails, it rejects the message with a permanent
SMTP failure (`setReject`) — the sender has to send again once the service
recovers. A message that was stored successfully is never rejected because of
a later webhook failure.

### `cleanup-worker`

A scheduled Worker that removes expired mailboxes and their messages in
bounded batches, so a large backlog cannot exceed the D1 query budget. It is
also responsible for the indexes that keep expiry scans and mailbox pagination
fast.

### D1

SQLite, accessed through [Drizzle ORM](https://orm.drizzle.team/). It holds
users, mailboxes, messages, shares, API keys, webhooks and role assignments.
The schema and its migrations live in the application repository under
`drizzle/`.

### KV

A single namespace named `nextmail-kv` holds the site settings: receiving
domains, default role, limits, catch-all configuration, sending configuration
and Turnstile keys. Both the application Worker and the Email Worker bind the
same namespace — the catch-all mailbox identity is resolved through it.

## Request flow

**Creating a mailbox**

1. The UI reads `/api/config` to learn the domains the account may use.
2. The client posts to `/api/emails/generate` with the prefix, domain and
   lifetime.
3. The route validates the domain against `EMAIL_DOMAINS`, checks the
   `MAX_EMAILS` limit, inserts the row in D1 and returns the address.

**Receiving mail**

1. Cloudflare Email Routing matches the catch-all rule and hands the raw
   message to `email-receiver-worker`.
2. The worker resolves the target mailbox: an existing address wins, otherwise
   the catch-all mailbox of that domain — if the domain has catch-all enabled.
3. The message is inserted with a monotonically increasing arrival sequence.
4. The worker POSTs the webhook, retrying up to three times.

**Reading mail**

`GET /api/emails/{id}` supports two modes:

- `?cursor=` — page backwards through the message list.
- `?since=` — incremental polling with an arrival cursor; the response carries
  the next `latestCursor`.

The arrival sequence is assigned by a database trigger, so ordering does not
depend on timestamps or random IDs and no sequence is ever reused.

## Data model (abridged)

| Table | Contents |
| --- | --- |
| `user` | Accounts, password hashes, OAuth identities, role |
| `emails` | Mailboxes: owner, address, domain, expiry, catch-all flag |
| `messages` | Messages: mailbox, sender, subject, bodies, read flag, arrival sequence |
| `email_shares` / `message_shares` | Share links with expiry |
| `api_keys` | API keys per user, enabled flag, expiry |
| `webhook` | One webhook per user: URL, secret, enabled flag |
| `catch_all_mailboxes` | Stable mapping of a domain to its catch-all mailbox |
| `message_arrivals` | Arrival sequence per message |

## Migrations

Migrations are plain SQL files in `drizzle/` and are applied with Drizzle Kit.
The deployment script applies pending migrations before publishing the new
workers. Relevant migrations for recent upgrades:

| Migration | Purpose |
| --- | --- |
| `0020_user_email_domain_access.sql` | Per-user domain restrictions |
| `0021_message_read_tracking.sql` | Read state and statistics indexes |
| `0022_stable_mail_delivery.sql` | Stable catch-all mapping and arrival sequence |
| `0023_webhook_user_unique.sql` | One webhook per user |
| `0024_message_delivery_key.sql` | Inbound delivery de-duplication key |
| `0025_expiry_cleanup_indexes.sql` | Cleanup indexes |
| `0026_mailbox_created_at_index.sql` | Mailbox pagination index |

When upgrading manually: apply the migrations first, then publish the Email
Worker, then publish the main application.

## Security notes

- Credentials live in Worker secrets, never in the repository or in the
  downloadable Worker bundle.
- API keys, webhook secrets and the Turnstile secret are never returned by the
  API; only a `hasSecret`-style flag is exposed.
- HTML mail bodies are rendered in a sandboxed iframe; scripts inside a
  message never run.
- Response payloads for sensitive endpoints are sent with `Cache-Control:
  no-store`.