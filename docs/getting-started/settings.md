---
title: Site settings and sending
description: The global settings an Emperor manages, plus the Resend sending configuration.
sidebar_position: 6
---

# Site settings and sending

Site settings are stored in Cloudflare KV and shared by every account. Only the
Emperor can read or change them, in the profile page.

## Settings overview

| Setting | Purpose |
| --- | --- |
| `DEFAULT_ROLE` | Role assigned to new accounts: `civilian`, `knight` or `duke` |
| `EMAIL_DOMAINS` | Receiving domains, comma separated |
| `ADMIN_CONTACT` | Contact address shown to users |
| `MAX_EMAILS` | Maximum active mailboxes per non-emperor account (default 30) |
| `CATCHALL_EMAIL` | Per-domain catch-all configuration |
| `RESEND_CONFIG` | Per-domain sending configuration |
| `EMAIL_ROLE_LIMITS` | Daily sending limits per role |
| `TURNSTILE_ENABLED`, `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile verification |

`MAX_EMAILS` must be a safe integer between 1 and 9007199254740991. Invalid
values are rejected with HTTP 400 when saving; an invalid value that is already
stored falls back to 30. The Emperor is never limited.

## Sending through Resend

NextMail can send mail from a temporary mailbox using
[Resend](https://resend.com/). The sending configuration is **per domain**:
each receiving domain has its own enable switch and its own API key.

### Configure it

1. Create an account at [resend.com](https://resend.com/) and create an API
   key.
2. Sign in as Emperor, open the profile page and find the Resend section.
3. Enable sending for the domain and paste that domain's API key. Leaving the
   key field empty keeps the stored key.
4. Repeat for every domain that should be able to send.
5. Optionally adjust the daily limits for Dukes and Knights, then save.

### Use it

With sending enabled, the **Send email** action appears next to the mailboxes
your role may send from. The dialog asks for a recipient, a subject and a body;
HTML content is supported. Sent messages are stored in the mailbox, so inbound
and outbound mail share one timeline.

### Rules and limits

- Daily quotas are counted per user and reset at 00:00 UTC. `-1` forbids
  sending, `0` means unlimited and a positive number caps the mails per day.
- Sending a custom domain through Resend requires that domain to be verified
  in Resend.
- The Emperor may override the *from* prefix when sending from a catch-all
  mailbox; ordinary mailboxes always send from their own address.
- Quotas are not refunded when a mailbox is deleted.

## Cloudflare Turnstile

Turnstile adds a captcha to registration. Enable it and provide both the
site key and the secret. The secret is only stored on the server — it is never
returned by the API, and leaving the secret field empty keeps the current one.

## Domain access per user

In user management the Emperor can restrict which receiving domains an account
may use when creating mailboxes. Omitting the list keeps the current value,
clearing it removes every domain, and a non-empty list must only contain site
domains. The Emperor always has access to all of them. The restriction applies
to new mailboxes only; existing ones keep working.