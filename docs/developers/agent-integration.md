---
title: Agent integration
description: How an AI agent or script can receive mail through NextMail.
sidebar_position: 3
---

# Agent integration

NextMail is designed to be driven by programs. This page is the shortest path
from "I have an agent" to "my agent receives mail", plus the details that
matter when you build a tool around it.

## The five-minute path

1. **Create an API key** — sign in as an account with the Duke or Emperor role,
   open the profile page and create an API key.
2. **Read the domains** — `GET /api/config` returns `emailDomains` and, for an
   authenticated caller, `availableEmailDomains`.
3. **Create a mailbox** — `POST /api/emails/generate` with a `domain` from step
   2 and an `expiryTime` of your choice.
4. **Poll for messages** — `GET /api/emails/{emailId}?since=<cursor>` and keep
   the returned `latestCursor`.
5. **React** — a webhook is usually better than polling; see below.

```bash
# 1. create a mailbox that lives for one day
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

## Polling, done right

The `since` cursor is an *arrival sequence*, not a timestamp. That makes it
stable: a message that arrives late is still returned, and a sequence number is
never reused.

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

Rules that save you debugging time:

- **Only send `since` after the first successful call.** Without a cursor the
  endpoint returns the newest page.
- **Persist the cursor** if your agent can be interrupted — otherwise you
  replay the same page.
- **De-duplicate by `messageId`.** Webhook delivery can repeat, and legacy
  timestamp cursors replay once.
- **Never invent a cursor.** A malformed cursor is rejected with `400` instead
  of silently restarting the poll.

## Prefer webhooks when you can

For event-driven agents, a webhook is cheaper and faster than polling: the
mail worker pushes every new message to your endpoint, with retries.

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

Verify the `X-Webhook-Signature` header before trusting the payload — see
[Webhooks](/guides/webhooks).

## Designing agent tools

If you expose NextMail to a model as a tool, these primitives map cleanly onto
the API:

| Tool | Endpoint | Notes |
| --- | --- | --- |
| `create_mailbox` | `POST /api/emails/generate` | Returns an address you can hand to a human |
| `list_mailboxes` | `GET /api/emails` | Supports a `domain` filter |
| `read_messages` | `GET /api/emails/{emailId}` | Use `since` for incremental reads |
| `read_message` | `GET /api/emails/{emailId}/messages/{messageId}` | Full body, both formats |
| `share_mailbox` | `POST /api/emails/{emailId}/share` | `expiresIn: 0` for permanent |
| `send_mail` | `POST /api/emails/{emailId}/send` | Consumes the daily quota |

A few practical hints:

- **Give the agent a scoped key.** Keys belong to a user and inherit that
  user's quota and permissions.
- **Prefer `expiresIn` over permanent shares** for anything a model can
  influence; a permanent share is a permanent leak.
- **Sanitise HTML bodies.** The API returns the raw `html` field; treat it as
  untrusted input, exactly like the web UI does with its sandboxed iframe.
- **Respect the mailbox limit.** `MAX_EMAILS` caps how many mailboxes a
  non-emperor account may own.

## Error handling

| Status | What an agent should do |
| --- | --- |
| `400` | Fix the request — usually a bad cursor, date or field type |
| `401` | The key is missing, wrong or revoked |
| `403` | The key may not touch that resource (catch-all mailboxes) |
| `409` | Name conflict — for example an API key name that is already taken |
| `429` | The daily sending quota is exhausted; stop sending |
| `503` | The site has no receiving domain configured — an operator problem |

## Limits worth planning for

- Mailboxes expire: 1 hour, 1 day, 3 days or permanent.
- `MAX_EMAILS` limits active mailboxes per account.
- Sending is capped per role and per day; the quota resets at 00:00 UTC.
- Webhook delivery is retried up to three times — always de-duplicate.
- Inbound mail is de-duplicated by a delivery key, so a redelivered message is
  stored once.

## Related projects

The upstream MoeMail project ships an agent-oriented CLI and an MCP server.
NextMail currently focuses on the web application and the HTTP API; if you
need a CLI or an MCP server, wrap the endpoints described above.