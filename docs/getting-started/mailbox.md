---
title: Using your mailbox
description: Create mailboxes, read mail, filter by domain and clean up in bulk.
sidebar_position: 4
---

# Using your mailbox

## Create a mailbox

Open the mailbox page and choose **Create email**. You can pick:

- **Prefix** — optional. Leave it empty to get a random address. Prefixes are
  lower-cased; characters such as `@` or consecutive dots are rejected.
- **Domain** — one of the receiving domains enabled for your account.
- **Lifetime** — 1 hour, 1 day, 3 days or permanent.

The address is shown before you create it, so you can copy it without creating
anything first. Creating the same address twice shows a "name already taken"
message in your current language.

## Read mail

The mailbox list shows the total and unread count per mailbox and can be
filtered by domain. Opening a message marks it as read; the unread counter
decreases by one. Public share pages never change the owner's read state.

While a mailbox is open, the page polls for new mail every 30 seconds using an
incremental cursor. Polling pauses while the tab is hidden and resumes when you
come back. A manual refresh updates the counters and the first screen of
messages; older pages that were already loaded may keep a stale copy until you
reload.

## Share a mailbox or a single message

Both a whole mailbox and an individual message can be shared with a link:

- **Mailbox share** — `https://<host>/shared/<token>`
- **Message share** — `https://<host>/shared/message/<token>`

Every share has an expiry. Pick a duration when creating it, or create a
permanent one with `0`. Expired shares are rejected — including at the exact
expiry timestamp. The share list can be paginated and individual links can be
deleted again.

## Delete in bulk

Select up to **40** mailboxes per batch in the list, choose **Delete selected**
and confirm. Deleting a mailbox also removes its received and sent messages and
all of its share links, and it cannot be undone. Daily sending quotas are not
refunded.

A few rules worth knowing:

- The selection survives paging, so you can pick mailboxes across several
  pages, and **Clear selection** removes it.
- Switching the domain filter clears the selection.
- Catch-all mailboxes are never part of the bulk selection.
- The API only deletes mailboxes that you own, that have not expired and that
  are not catch-all mailboxes. If one mailbox in the batch fails a check, the
  whole batch fails — nothing is partially deleted and the selection stays so
  you can retry.

## Limits

The Emperor sets `MAX_EMAILS`, the maximum number of active mailboxes a
non-emperor account may own. The default is 30. The Emperor is not limited.
Invalid values are rejected when saving.

## Sending

Accounts with the *Duke* or *Knight* role can send mail from a mailbox through
Resend, subject to a daily quota. See
[Site settings and sending](/getting-started/settings) for configuration.