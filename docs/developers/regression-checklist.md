---
title: Regression checklist
description: Focused manual checks for multi-domain mailboxes, catch-all, unread counters and polling.
sidebar_position: 6
---

# Regression checklist

These checks are for developers and AI agents working on NextMail itself. They
target the parts of the application that are easy to break silently: catch-all
identity, unread counters, incremental polling and multi-domain routing.

Run them after changing `app/**`, `workers/**`, the Drizzle migrations or the
deployment scripts. A passing Node test suite does **not** prove production
Cloudflare delivery, Resend or webhook delivery works.

## Before you start

```bash
npm run db:migrate-local
```

Migration `0020_user_email_domain_access.sql` stores the per-user domain
permissions, `0021_message_read_tracking.sql` adds the read state and the
statistics indexes, and `0022_stable_mail_delivery.sql` stores the stable
catch-all mapping and creates the arrival sequence for existing and new
messages.

Existing messages default to unread, and existing users inherit every
configured domain. The arrival sequence is produced by an insert trigger, so
it never depends on mail timestamps or random IDs. Deleting a message removes
its record but never reuses a committed sequence number.

## Focused checks

```sh
node --import tsx --experimental-test-module-mocks --test \
  tests/catch-all-config.test.ts \
  tests/mailbox-controls.test.ts \
  tests/email-receiver.test.ts \
  tests/routes.test.ts \
  tests/message-list-refresh.test.ts \
  tests/mailbox-events.test.ts
```

Then run the full sequence — lint, TypeScript, unit tests and the Worker build.

## Browser checks

Check `/en/mailbox`, `/zh-CN/mailbox` and the matching profile pages with two
receiving domains. Verify the catch-all switch, the prefix, the "show after
disable" behaviour, the domain filter and the per-domain Resend settings.

Restrict a regular user to a single domain, sign in as that user and confirm
both the creation options and the API rejection behaviour.

Open an unread message: the title must return to its normal weight and the
counter must decrease by exactly one.

### Mobile dialog

Run `npm run dev`, sign in with an account that can manage mailboxes, and open
`/en/mailbox` in Chromium at 390 × 844. Click **Create Email** and confirm the
prefix, the optional domain selector, the four lifetime options and both action
buttons fit inside the dialog without horizontal scrolling. Repeat with
several configured domains; the controls must wrap and stay usable. Take a
screenshot once the dialog animation has settled.

### Mailbox statistics race

Open a mailbox that has exactly one unread message, then add a second unread
message. Refresh the mailbox list on the left first and confirm the counter
reads `2 / 2`; then wait for the mail polling cycle. It must still read
`2 / 2`. Repeat with the refresh and the poll in the opposite order, then wait
through an empty incremental poll — the counter must not accumulate twice.

### Pinned mailbox pagination

Load only the catch-all mailbox, add 21 ordinary mailboxes in another session,
then refresh and scroll to the bottom. All 22 mailboxes must be visible with
no duplicates, and the existing pagination end must still be preserved when
ordinary mailboxes overlap.

### Error messages in the right language

Save an invalid catch-all prefix, an already-taken address and an empty
enabled mailbox name on both `/en/profile` and `/zh-CN/profile`. Each message
must use the current language. Simulate an unknown server error or a failed
request: the UI must show the generic save-failure message in the current
language and never the raw server text.

### Catch-all save and recovery

Deliver mail to an unknown address in the window between a successful rename
in the database and the KV write. It must land in the original mailbox.
Simulate a KV write failure on the first save or a rename, then submit the same
configuration again — it must reuse the original mailbox and save successfully,
and the original mail must be preserved. When the failed old configuration is
still enabled, incoming mail must also reach the original mailbox through the
stable mapping.

### Catch-all concurrency and sending

Let two first-save requests use different prefixes and interleave them after
both have read the old configuration. Only one registered mailbox may survive,
and mail delivered after the first request completes must not be lost.

After a rename, keep the old KV address and send mail with both the original
prefix and a custom prefix through the Emperor session and through an API key.
Both must succeed and store the correct sending address. An ordinary mailbox
that reuses the old address and any non-Emperor role must not be able to change
the sending prefix.

### Delayed delivery

Insert a message with the same timestamp but a smaller ID, or with an earlier
timestamp, after the first snapshot. The incremental poll must still receive
them while the list keeps showing messages in mail-time order. Drain more than
one page, then insert a new message and delete all the old ones and continue
checking — nothing may be missing or shown twice.

### Cross-session read state

Start with two unread messages and read one of them in another session. Wait
until the current page's polling shows `1 / 2`, then open the same row that is
still bold on this page — the counter must stay at `1 / 2`. Only after opening
the other message does it become `0 / 2`. Check English, Chinese, desktop and
mobile viewports.

## What these checks cannot prove

Unit tests and local simulation do not prove that production Cloudflare
receives mail, that Resend delivers, or that webhook delivery works. Those
need a deployed environment — see [Deployment and
operations](/developers/deployment).
