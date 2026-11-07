---
title: Frequently asked questions
description: Short answers to the questions that come up most often.
sidebar_position: 2
---

# Frequently asked questions

## Deployment

**Which Cloudflare plan do I need?**
: The paid Workers plan is recommended. Password hashing uses bcrypt, and the
asynchronous work can exceed the 10 ms CPU budget of the free plan. Do not
weaken the bcrypt cost to fit the free tier — if you only use OAuth login, or
the site is for personal use only, you can ignore this.

**Can I deploy from Windows?**
: Next.js development, lint and unit tests work on Windows. Build the OpenNext
Worker on Linux (or WSL) with Node.js 24 and a fresh `npm ci` — do not reuse a
Windows `node_modules`.

**The deploy script stopped halfway. What now?**
: Deployment is not a transaction. Check which steps completed (D1, KV,
secrets, Workers) and run the script again; existing resources are reused.

**Do I need to create the DNS record myself?**
: No. With `CUSTOM_DOMAIN` the script uses a Worker Custom Domain and
Cloudflare provisions DNS and the certificate. A plain Worker Route only
matches proxied DNS traffic and is not a substitute.

## Receiving mail

**Mail never arrives.**
: Check that the domain is listed in the site settings, that the Cloudflare
catch-all rule targets `email-receiver-worker`, and that the zone is managed by
Cloudflare. See [Email domain and routing](/getting-started/email-domain).

**The catch-all switch keeps loading.**
: Open **Routing rules** → **Destination address** and bind a mailbox manually.

**Can I receive mail for addresses I never created?**
: Yes — that is exactly what the catch-all mailbox is for, and it can be enabled
per domain.

**I renamed the catch-all mailbox. Did I lose the mail?**
: No. The mailbox keeps its ID and its messages; only the address changes.

## Accounts and permissions

**How do I become the site owner?**
: Sign in and use **Initialize site owner** in the profile page. The first
account that confirms it becomes the Emperor. See
[Roles and permissions](/getting-started/roles).

**Can there be two Emperors?**
: No. The site supports exactly one Emperor; the interface refuses to promote
a second one.

**Why can I not create an API key?**
: API keys need the Duke or Emperor role. Civilians and Knights do not have
that permission.

## Mailboxes

**How many mailboxes can I create?**
: `MAX_EMAILS` per non-emperor account, 30 by default. The Emperor is not
limited.

**What happens when I delete a mailbox?**
: Its messages and share links are deleted too, and the action cannot be
undone. Daily sending quotas are not refunded.

**Can I delete 100 mailboxes at once?**
: The bulk action accepts up to 40 per batch. If one mailbox in the batch
fails a check (not yours, expired, or a catch-all mailbox), the whole batch
fails and nothing is deleted.

## Sending

**Nothing is sent and I see no send button.**
: Sending must be enabled for the domain in the Resend configuration, and your
role needs the *Send mail* permission and quota.

**When do sending quotas reset?**
: At 00:00 UTC.

**Does deleting a mailbox refund the quota?**
: No. Quotas are counted per user and per day.

## API and webhooks

**The API answers 503.**
: No receiving domain is configured. Set `EMAIL_DOMAINS` (or let the deployment
initialise it from `EMAIL_DOMAIN`).

**The API answers 409 when I create an API key.**
: The name is already taken by one of your keys — even if that key is disabled
or expired. Pick another name.

**My webhook is not delivered.**
: The target host must be in `WEBHOOK_ALLOWED_HOSTS`, the URL must be HTTPS
without credentials, a fragment or a non-standard port, and the webhook must be
enabled and saved.

**Do webhook deliveries arrive exactly once?**
: No. Delivery is retried up to three times, so the same `messageId` can
arrive more than once. De-duplicate on `messageId`.