---
title: Email domain and routing
description: Connect your domain to NextMail with Cloudflare Email Routing and catch-all rules.
sidebar_position: 3
---

# Email domain and routing

Mail only reaches NextMail if two things are true: the domain is listed as a
**receiving domain** in the site settings, and Cloudflare Email Routing forwards
that domain to the NextMail Email Worker.

## 1. Add the domain to the site settings

The Emperor manages receiving domains in the profile page, under site settings.
The list is stored in Cloudflare KV as `EMAIL_DOMAINS`; multiple domains are
separated by commas. The first deployment initialises it from the
`EMAIL_DOMAIN` environment variable.

Each domain can additionally have its own catch-all configuration — see
[catch-all below](#catch-all-per-domain).

:::note
A domain that is not listed as a receiving domain cannot be used to create
mailboxes, and the API answers `503` when no domain is configured at all.
:::

## 2. Enable Email Routing in Cloudflare

Sign in to the [Cloudflare dashboard](https://dash.cloudflare.com/), pick your
zone and open **Email** → **Email Routing**.

1. If the panel says routing is disabled, click **Enable Email Routing**.
2. Cloudflare offers to add the required DNS records — accept them with
   **Add records and enable**.

![Enable email routing](/img/docs/enable-email-routing.jpg "Enable email routing in Cloudflare")

3. Open **Routing rules** and edit the **Catch-all address**:
   - **Action**: *Send to a Worker*
   - **Destination**: the `email-receiver-worker` deployed by NextMail
   - **Save**

![Configure the catch-all rule](/img/docs/configure-routing-rule.jpg "Send catch-all mail to the NextMail Email Worker")

![Add Email Routing DNS records](/img/docs/add-routing-dns.jpg "Add the Email Routing DNS records")

## 3. Verify

Send a message to any address on that domain. If the catch-all rule is
configured correctly, the mail appears in the catch-all mailbox (or in the
mailbox that owns the address).

## Catch-all per domain

The catch-all mailbox receives mail for addresses nobody created. The Emperor
configures it per domain:

| Setting | Meaning |
| --- | --- |
| Receiving mail sent to uncreated addresses | Whether unknown recipients are collected at all |
| Summary mailbox address | Which mailbox stores them |
| Keep this mailbox visible after disabling | Whether the mailbox stays in the list once collection is off |

Important behaviour:

- Turning the visibility switch off does **not** delete historical mail and does
  not change the collection rules.
- Unknown addresses only arrive when the owning domain has catch-all enabled;
  NextMail never creates a mailbox per unknown address.
- Renaming the catch-all mailbox keeps its ID and its existing messages.
- Catch-all mailboxes are owned by the Emperor, never expire, are pinned to the
  top of the mailbox list and cannot be deleted from the list — they are managed
  in site settings.

## Multiple domains

You can serve several domains from one deployment. Each of them needs its own
Email Routing rule pointing at the Email Worker; the deployment script only
configures the zone of `EMAIL_DOMAIN` automatically.

The Emperor can also restrict which domains a given user may create mailboxes
in. Users without an explicit restriction inherit all site domains; clearing
the list removes their ability to create new mailboxes. Existing mailboxes are
never affected.

## Troubleshooting

**The catch-all switch keeps loading**
: Open **Routing rules** → **Destination address** and bind a mailbox manually.

**Mail does not arrive**
: Check that the domain is listed in the site settings, that the Cloudflare
catch-all action really points at `email-receiver-worker`, and that DNS for the
zone is managed by Cloudflare.

**I receive mail for the wrong domain**
: `EMAIL_DOMAIN` must exactly match a zone name in your account. When you use a
subdomain, configure Email Routing for that subdomain first and make sure it
resolves to its own zone.