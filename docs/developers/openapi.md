---
title: OpenAPI reference
description: REST endpoints for creating mailboxes, reading messages and sharing links.
sidebar_position: 2
---

# OpenAPI reference

The API is a plain JSON REST API. There is no version prefix and no SDK
requirement — `curl` and `fetch` are enough.

## Authentication

Send your API key in the `X-API-Key` header:

```http
X-API-Key: YOUR_API_KEY
```

API keys are created in the profile page and require the **Duke** or
**Emperor** role. Key management itself (create, list, enable, delete) uses the
signed-in session, not the API key.

The key works on the mailbox and configuration endpoints (`/api/config`,
`/api/emails*`). Webhook, role and key-management endpoints always require a
session cookie.

Missing or invalid credentials produce `401` with a JSON body.

## Conventions

| Status | Meaning |
| --- | --- |
| `400` | Invalid input — malformed JSON, wrong field type, invalid cursor, invalid date |
| `401` | Missing or invalid credentials |
| `403` | Authenticated but not allowed (for example a catch-all mailbox) |
| `404` | Unknown mailbox, message or share |
| `409` | Conflict — for example a duplicate API key name |
| `503` | The site has no receiving domain configured |

Invalid input never changes state: a rejected request does not create a
mailbox and does not flip an API key's enabled flag.

## Configuration

### Get site configuration

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

| Field | Description |
| --- | --- |
| `defaultRole` | Role for new accounts: `civilian`, `knight` or `duke` |
| `emailDomains` | Receiving domains, comma separated |
| `adminContact` | Contact address |
| `maxEmails` | Active mailbox limit for non-emperor accounts |

Authenticated callers additionally receive `availableEmailDomains` — the
domains they may use. The Emperor also receives the Turnstile configuration
(`enabled`, `siteKey`, `hasSecret`) and `catchAll.domains`, each with
`enabled`, `showAlways` and `mailboxName`. Secrets are never included.

## Mailboxes

### Create a mailbox

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

| Field | Required | Description |
| --- | --- | --- |
| `name` | No | Address prefix; omit for a random address |
| `expiryTime` | Yes | `3600000` (1 h), `86400000` (1 d), `259200000` (3 d) or `0` (permanent) |
| `domain` | Yes | One of `availableEmailDomains` |

The response contains the created mailbox, including its `id` and `address`.

### List mailboxes

```http
GET /api/emails?cursor=<cursor>&domain=<domain>
```

Optional parameters:

- `cursor` — pagination cursor returned by a previous call.
- `domain` — restrict the list to one receiving domain.

Catch-all mailboxes are pinned to the front of the list. The response
contains the mailbox list together with per-mailbox `totalMessages` and
`unreadMessages` counters.

### Delete a mailbox

```http
DELETE /api/emails/{emailId}
```

Removes the mailbox together with its messages and share links. Catch-all
mailboxes are protected and answer `403`.

### Delete mailboxes in bulk

```http
DELETE /api/emails/bulk
Content-Type: application/json
```

```json
{ "emailIds": ["id-1", "id-2"] }
```

The whole batch fails if any mailbox in it is not yours, has expired or is a
catch-all mailbox. Nothing is partially deleted.

### List the messages of a mailbox

```http
GET /api/emails/{emailId}?cursor=<cursor>&since=<cursor>
```

Two modes:

- `cursor` — page backwards through the message list. The response contains
  `messages`, `latestCursor` and `hasMore`.
- `since` — incremental polling. Returns only messages that arrived after the
  cursor and the next `latestCursor` to poll with.

Use the cursors exactly as returned. Malformed cursors, dates or IDs are
rejected with `400` instead of silently restarting the polling. Legacy
timestamp cursors are still accepted once and replay from the beginning;
de-duplicate by message ID.

Each message contains at least `id`, `fromAddress`, `toAddress`, `subject`,
`content`, `html`, `isRead` and its arrival timestamp.

### Read a single message

```http
GET /api/emails/{emailId}/messages/{messageId}
```

Returns the full message including both bodies.

## Sharing

### Share a mailbox

```http
POST /api/emails/{emailId}/share
Content-Type: application/json
```

```json
{ "expiresIn": 86400000 }
```

`expiresIn` is a duration in milliseconds; `0` creates a permanent share. The
response contains the `token` and the public URL
`https://<host>/shared/<token>`.

### List mailbox shares

```http
GET /api/emails/{emailId}/share?cursor=<cursor>
```

Returns `{ "shares": [...], "total": n, "nextCursor": "..." }`.

### Delete a mailbox share

```http
DELETE /api/emails/{emailId}/share/{shareId}
```

```json
{ "success": true }
```

### Share a single message

```http
POST /api/emails/{emailId}/messages/{messageId}/share
Content-Type: application/json
```

```json
{ "expiresIn": 0 }
```

The public URL is `https://<host>/shared/message/<token>`. Listing and deleting
message shares work the same way as for mailbox shares.

## Sending

### Check whether a mailbox may send

```http
GET /api/emails/send-permission?address=<mailbox-address>
```

### Send a message

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

`to`, `subject` and `content` are all required. Sending consumes the daily
quota of the mailbox owner; `429` is returned when the quota is exhausted.
Sent messages are stored in the mailbox.

## API key management

These endpoints use the session of an account that may manage keys.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/api-keys` | List your keys |
| `POST` | `/api/api-keys` | Create a key (`name` required, non-empty) |
| `PATCH` | `/api/api-keys/{id}` | Enable or disable a key (`enabled` must be a JSON boolean) |
| `DELETE` | `/api/api-keys/{id}` | Delete a key |

Creating a key with a name you already used returns `409` with the code
`API_KEY_NAME_EXISTS` — the existing key is neither replaced nor returned,
even when it is disabled or expired. The string `"false"` is not the boolean
`false`.

## Examples

Create a mailbox:

```bash
curl -X POST https://app.example.com/api/emails/generate \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name":"test","expiryTime":3600000,"domain":"example.com"}'
```

Poll a mailbox for new messages:

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

Share a mailbox for one day:

```bash
curl -X POST https://app.example.com/api/emails/your-email-id/share \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"expiresIn":86400000}'
```