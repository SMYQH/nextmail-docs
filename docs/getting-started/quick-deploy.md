---
title: Quick deploy
description: Deploy NextMail to Cloudflare in a few minutes.
sidebar_position: 2
---

# Quick deploy

This walkthrough deploys NextMail to your own Cloudflare account with the
bundled script. It assumes you already have a Cloudflare account and a domain
whose DNS is hosted on Cloudflare.

## 1. Get the code

```bash
git clone https://github.com/SMYQH/nextmail.git
cd nextmail
npm ci
```

Requires Node.js 24+ and npm.

## 2. Create the deployment settings

```bash
cp .env.deploy.example .env.deploy
```

`.env.deploy` is the single operator settings file. It is ignored by Git and is
the only environment file the project reads — never create `.env`,
`.env.local` or `.dev.vars`.

At minimum, fill in:

| Variable | Meaning |
| --- | --- |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID |
| `CLOUDFLARE_API_TOKEN` | API token with the permissions listed below |
| `AUTH_SECRET` | Random secret used to sign sessions (`openssl rand -base64 32`) |
| `EMAIL_DOMAIN` | The domain that receives mail, for example `mail.example.com` |
| `NEXT_PUBLIC_BASE_URL` | Public URL of the deployment, for example `https://mail.example.com` |

Optional OAuth login (GitHub or Google) works when both the ID and the secret
of a provider are present; the button is hidden otherwise.

### API token permissions

Scope the token to the account that owns your zone. It needs:

- `D1: Edit`
- `Workers KV Storage: Edit`
- `Workers Scripts: Edit`
- `Zone: Read` and `Email Routing Rules: Edit` for the `EMAIL_DOMAIN` zone
- `Workers Routes: Edit` for the zone when you use a custom domain
- `WAF: Edit` and `Bot Management: Read` for the website zone when you use a
  custom domain — standard Bot Fight Mode must be turned off

`DNS: Edit` and `API Tokens: Edit` are not required.

## 3. Deploy

```bash
npm run deploy
```

The script performs, in order:

1. **Pre-flight checks** — validates the configuration, verifies the API token
   and its read permissions, and inspects WAF and Bot Management settings. It
   refuses to build or touch remote resources when a check fails.
2. **Build** — creates the Next.js production bundle and the OpenNext Worker
   bundle.
3. **Resource discovery** — finds or creates the `nextmail-d1` database and the
   `nextmail-kv` namespace, then writes the resolved IDs into the ignored
   `wrangler.json`.
4. **Migrations** — applies the Drizzle migrations to the remote database and
   runs the one-off role backfill.
5. **Secrets and settings** — installs authentication secrets as Worker
   secrets and applies optional site settings (accounts, catch-all, sending
   quotas).
6. **Workers** — publishes the main Worker, the Email Worker and the Cleanup
   Worker, and points the zone catch-all rule at the Email Worker.
7. **Verification** — checks `/api/config`, `/api/emails` and the front-end for
   unexpected Cloudflare challenges.

:::note
Deployment is not a single transaction. If a later step fails, earlier steps
stay applied — inspect the state and re-run the script; already existing
resources are reused.
:::

## 4. Point a domain at it

With a custom domain the script creates the Worker route and the certificate
automatically. Otherwise the deployment is reachable on `*.workers.dev`.

Next, configure [Email routing](/getting-started/email-domain) so that mail
actually reaches NextMail.

## 5. Create the first account

Open the deployment, sign in, and go to the profile page. If the site has no
Emperor yet, the page offers **Initialize site owner** — confirm it and the
first account becomes the Emperor with full access to site settings.

## Deploying from GitHub Actions instead

Set `REPOSITORY_URL` and `GITHUB_TOKEN` in `.env.deploy` and the script also
synchronises the deployment settings to your repository secrets. CI reads only
secrets, never `.env.deploy`. See
[Deployment and operations](/developers/deployment) for the full runbook.