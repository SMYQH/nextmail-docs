---
title: Webhooks
description: Receive every new message through a signed webhook callback.
sidebar_position: 1
---

# Webhooks

When a message arrives, NextMail sends a `POST` request to the webhook URL that
the account configured and enabled.

## Prerequisites

Webhook delivery is only possible for hosts that the operator approved. The
deployment setting `WEBHOOK_ALLOWED_HOSTS` holds a comma-separated list of
exact, trusted hostnames — no protocol, path, port or wildcards:

```dotenv
WEBHOOK_ALLOWED_HOSTS="hooks.example.com,notifications.example.com"
```

The deployment installs this list into the main Worker and the Email Worker.
While no list is configured, the profile page explains that an administrator
has to set it up first; existing webhooks can still be disabled.

## Configure it

1. Open your profile page.
2. Enable the webhook and enter the HTTPS URL.
3. Save, then use **Test** to send a sample request.

The test button only works after the webhook has been saved: if no record with
that URL exists, the request fails with HTTP 400 and the error code
`saveBeforeTest`.

Rejected targets include hosts that are not approved, redirects, non-HTTPS
URLs, URLs with credentials or fragments, and non-standard ports.

## Request format

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

| Field | Description |
| --- | --- |
| `emailId` | Mailbox that received the message |
| `messageId` | Message identifier — stable across redeliveries |
| `fromAddress` | Sender, taken from the message headers when available |
| `subject` | Subject line |
| `content` | Plain text body |
| `html` | HTML body, when the message contains one |
| `receivedAt` | ISO 8601 timestamp |
| `toAddress` | The real recipient address |

## Verify the signature

If a signing secret is configured, every request carries:

```http
X-Webhook-Signature: sha256=<hex>
X-Webhook-Timestamp: <unix timestamp>
```

The signature is the hex-encoded HMAC-SHA256 of
`X-Webhook-Timestamp + "." + <raw request body>`. Verify it, and reject
timestamps that are too old to prevent replay attacks.

The secret never leaves the server: `GET /api/webhook` only reports
`enabled`, `url`, `hasSecret` and `setupError`, and the response is sent with
`Cache-Control: no-store`.

## Reliability

- Answer within **10 seconds**. Slow endpoints risk delivery timeouts.
- The test button and the mail worker retry delivery **up to 3 times**.
- A failed webhook delivery never deletes or rejects an already stored
  message, and never fails the inbound SMTP transaction.
- Duplicate deliveries are possible: the same `messageId` may arrive twice.
  De-duplicate on `messageId`.

## Test it locally

The application repository ships a small receiver for development:

```bash
npm run webhook-test-server
```

It listens on `http://localhost:3001`, prints the subject of every delivery
and answers with HTTP 200. To expose it to the internet, install
[Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)
and run:

```bash
cloudflared tunnel --url http://localhost:3001
```