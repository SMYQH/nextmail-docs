---
title: Deployment and operations
description: The full runbook for deploying, upgrading, verifying and removing a NextMail deployment.
sidebar_position: 5
---

# Deployment and operations

This is the operator runbook. [Quick deploy](/getting-started/quick-deploy) is the
short version; this page explains what every step does, what it needs and how
to recover when something fails.

## Runtime requirements

NextMail runs on Cloudflare Workers through OpenNext. The main Worker needs the
compatibility flags `nodejs_compat`, `nodejs_compat_populate_process_env` and
`global_fetch_strictly_public`, with a compatibility date of `2025-04-01` or
newer. `process.env` inside the Worker depends on the first two flags. Do
**not** add `runtime = "edge"` to route handlers — OpenNext uses the Node.js
compatibility runtime. See the
[Cloudflare Node.js compatibility docs](https://developers.cloudflare.com/workers/runtime-apis/nodejs/).

:::warning
Use the **paid Workers plan**. Registration, password sign-in and password
upgrades all hash with bcrypt, and an asynchronous bcrypt call can exceed the
10 ms CPU budget of the free plan. Never lower the bcrypt work factor to fit
the free tier. If you only use OAuth login, or the site is for personal use
only, you can ignore this.

The project does not enforce Cloudflare's CPU limit — that is your
responsibility.
:::

## Build on Linux

Build the OpenNext Worker on Linux (including GitHub Actions) or in WSL, with
Node.js 24 and a fresh `npm ci`. Do not reuse a Windows `node_modules`
directory. OpenNext warns that Windows builds are not fully supported;
`npm run build:worker` still produces the Worker and validates
`.open-next/worker.js`, the static asset directory, the D1/KV bindings and the
runtime flags.

Next.js development, linting and unit tests still work on Windows.

Current versions: Next.js `16.4.5` and OpenNext `1.20.16`, which are inside the
[supported range](https://opennext.js.org/cloudflare#supported-nextjs-versions).
Next.js 14 is no longer supported, and version problems are not solved by
downgrading to 14 or by skipping the support check.

A successful `npm run build` is **not** a substitute for the Worker build and
runtime verification.

## The deployment script

### 1. Prepare the settings file

Copy `.env.deploy.example` to `.env.deploy` in the repository root and fill in
the [environment variables](#environment-variables). The file is ignored by
Git. Development, builds, local previews and deployments all read this one
file plus the process environment — never create `.env`, `.env.local` or
`.dev.vars`. Merge any legacy configuration into `.env.deploy`, remove the old
files after checking for conflicts.

Required variables come first in the example, optional ones after. Leaving an
optional setting empty keeps the value that is already stored.

Worker bindings come from the tracked templates `wrangler.example.json`,
`wrangler.email.example.json` and `wrangler.cleanup.example.json`. The
generated files `wrangler.json`, `wrangler.email.json` and
`wrangler.cleanup.json` are ignored and regenerated automatically by the
deployment, build and migration commands. Do not commit them.

### 2. Scope the API token

The token in `.env.deploy` needs the [minimum deployment
permissions](#cloudflare-api-token-permissions). When you set
`CUSTOM_DOMAIN`, you also need a separate `OPENAPI_WAF_VERIFY_SECRET`.

`npm run deploy` validates the token, its read permissions, and the WAF and
Bot Management settings **before** it builds or changes any remote resource.
When the check fails, the deployment stops without side effects.

### 3. Optional GitHub Actions sync

Set `REPOSITORY_URL` and `GITHUB_TOKEN` in `.env.deploy` to sync the settings
to the repository's Actions secrets. Leaving either one empty skips the sync.
See [GitHub Actions deployment](#github-actions-deployment).

### 4. Run the deployment

```bash
npm run deploy
```

The script performs, in order:

1. **Pre-flight** — validates the explicit configuration, verifies the
   Cloudflare token and its read permissions, and inspects WAF and Bot
   Management. With `CUSTOM_DOMAIN` it also checks the Worker Routes, WAF
   Rulesets and Bot Management of the target zone.
2. **Build** — creates the Next.js production bundle and the OpenNext Worker
   bundle.
3. **Resource discovery** — finds or creates the `nextmail-d1` database and
   the `nextmail-kv` namespace, then writes the resolved IDs into the ignored
   `wrangler.json`.
4. **Migrations** — applies the pending Drizzle migrations to the remote
   database and runs the one-off role backfill.
5. **Secrets and settings** — installs the authentication secrets as Worker
   secrets and applies the optional site settings.
6. **Workers** — publishes the main Worker, the Email Worker and the Cleanup
   Worker, and points the zone catch-all rule at the Email Worker.
7. **Verification** — checks `/api/config`, `/api/emails` and the front-end for
   unexpected Cloudflare challenges.

:::note
Deployment is not a transaction. If a later step fails, earlier steps stay
applied. Inspect the state and re-run the script — existing resources are
reused.
:::

### Token verification and permission checks

The pre-flight supports both user tokens and account tokens: it first calls
the user verification endpoint, and if that rejects the token it calls the
[account token verification
endpoint](https://developers.cloudflare.com/api/resources/accounts/subresources/tokens/methods/verify/).
Both kinds of token must be valid and `active`.

Cloudflare's verification endpoint only reports the token status, never the
permission policies attached to it. The pre-flight therefore confirms access
with read-only API requests against the relevant account and zone scopes; it
never creates temporary resources to test write access. The later write steps
still need the `Edit` permissions listed below — if Cloudflare rejects a write,
the deployment can stop after earlier remote steps already succeeded.

### WAF verification

Standard Bot Fight Mode cannot be bypassed by a custom rule, and the
deployment fails when it detects the standard mode enabled. Zone IP Access
Rules, Cloudflare Access and account-level actions that run before zone rules
are neither modified nor bypassed by this configuration.

The real HTTP verification covers the request path of the current deployer to
`/api/config`, `/api/emails` and `/en`. It does not guarantee that every
request from every source or policy is reachable; it fails when it meets a
challenge, a redirect or an unexpected response. If you only use `workers.dev`,
that host is not part of a zone you manage — the project cannot install zone
WAF rules there and cannot run this HTTP verification.

For a custom-domain deployment, generate a random value used only by the
deployment and by automated front-end verification, for example
`openssl rand -hex 32`, and store it as `OPENAPI_WAF_VERIFY_SECRET` in
`.env.deploy` or as a GitHub Actions secret. A matching Cloudflare Skip rule
matches the verification request header on this project's host; automated
browser tests can send the `x-nextmail-waf-verify` header. The variable never
reaches the Worker, the OpenNext application environment, the build output or
a child process environment. Anyone who can read the target zone's WAF rules
can see the rule expression and therefore this value, so it does not replace
application authentication. Use a different value than `AUTH_SECRET`.

After the deployment you can verify again:

```bash
npm run verify:waf
```

## Cloudflare API token permissions

Scope the token's account resources to the Cloudflare account that runs
NextMail. Scope the email-routing permissions to the zone of `EMAIL_DOMAIN`;
when you set `CUSTOM_DOMAIN`, scope the website routing permissions to the
zone that owns that host. The two zones may differ.

| Scope | Permissions |
| --- | --- |
| Account | `D1: Edit`, `Workers KV Storage: Edit`, `Workers Scripts: Edit` |
| Zone of `EMAIL_DOMAIN` | `Zone: Read`, `Email Routing Rules: Edit` |
| Zone of `CUSTOM_DOMAIN` (when set) | `Zone: Read`, `Workers Routes: Edit`, `WAF: Edit`, `Bot Management: Read` |

The project does **not** need `Cloudflare Pages: Edit`,
`Zone Settings: Read/Edit`, `DNS: Edit`, `API Tokens: Edit` or
`Email Routing Addresses: Edit`.

The read-only pre-flight for WAF and Bot Management runs before the build and
confirms the accessibility of the corresponding zone. Because Cloudflare's
token verification endpoint does not return permission policies, `WAF: Edit`
cannot be proven on its own — the deployment confirms that write permission by
creating or updating the project rule when needed, after the build and after
the database and webhook checks, but before the database migration. If the
project rules already match, the deployment leaves them unchanged.

:::tip
If you create the deployment token through the API, use a separate bootstrap
token with `Account API Tokens: Edit`. Create the deployment token with the
permissions above, then store it in the ignored `.env.deploy`. The deployment
token itself does not need token-management permission. In the API permission
group names, `Write` corresponds to `Edit` in the dashboard — fetch the group
ID from the target account's permission group endpoint instead of guessing it
or reusing another group's ID.
:::

## GitHub Actions deployment

The same deployment command can run in GitHub Actions. The workflow is
triggered by:

1. **Automatic** — pushing a new tag starts the deployment.
2. **Manual** — running the workflow from the Actions tab.

### Steps

1. Configure the authentication, Cloudflare credentials and deployment
   parameters either through the automatic sync described above or manually in
   the repository's Actions secrets. The workflow reads these values from
   secrets only; CI neither needs nor reads `.env.deploy`. It runs its checks
   and then `npm run deploy`.

2. Choose a trigger:

   **Tag push**

   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

   **Manual** — open the Actions tab of the repository, pick the *Deploy*
   workflow and click *Run workflow*.

3. Watch the progress in the Actions tab.

### Notes

- CI does not need `.env.deploy`. Before the first run, confirm the repository
  secrets exist — at least `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`,
  `AUTH_SECRET`, `EMAIL_DOMAIN` and `NEXT_PUBLIC_BASE_URL`.
- `DATABASE_ID`, `KV_NAMESPACE_ID`, `CUSTOM_DOMAIN`,
  `OPENAPI_WAF_VERIFY_SECRET`, `EMAIL_DOMAIN`, `WEBHOOK_ALLOWED_HOSTS` and
  `NEXT_PUBLIC_BASE_URL` are read from Actions secrets as well. Values that
  previously lived only in Actions *Variables* have to be migrated.
- The optional site settings and `ADMIN_USERS` listed below are passed as
  Actions secrets with the same names. Updating the local file alone does not
  change a CI configuration that was never synced.
- A tag trigger requires the tag to start with `v`, for example `v1.0.0`.

## Environment variables

### Authentication

| Variable | Purpose |
| --- | --- |
| `AUTH_SECRET` | NextAuth secret that encrypts the session — use a random string |
| `AUTH_GITHUB_ID` | GitHub OAuth App ID |
| `AUTH_GITHUB_SECRET` | GitHub OAuth App secret |
| `AUTH_GOOGLE_ID` | Google OAuth App ID |
| `AUTH_GOOGLE_SECRET` | Google OAuth App secret |

GitHub and Google sign-in are both optional. A provider is only enabled when
its ID **and** secret are present and non-empty; the button is hidden
otherwise.

`NEXT_PUBLIC_BASE_URL` is required. It is the public base URL of the
application — set it to the actual Worker address or to `CUSTOM_DOMAIN` so
that canonical and `hreflang` links are correct. The value is baked in at
build time and the deployment script stops before the build when it is
missing. OAuth callback URLs are derived from the request address and do not
use this variable.

### Cloudflare

| Variable | Purpose |
| --- | --- |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token with the [minimum permissions](#cloudflare-api-token-permissions) |
| `EMAIL_DOMAIN` | Receiving domain, for example `example.com` |
| `DATABASE_ID` | Optional explicit ID of the `nextmail-d1` database; discovered by name when empty |
| `KV_NAMESPACE_ID` | Optional explicit ID of the `nextmail-kv` namespace; discovered by name when empty |
| `CUSTOM_DOMAIN` | Optional public host name, for example `app.example.com` |
| `OPENAPI_WAF_VERIFY_SECRET` | Required when `CUSTOM_DOMAIN` is set |

The D1 database is named `nextmail-d1` and the KV namespace is named
`nextmail-kv`. When you set `DATABASE_ID` or `KV_NAMESPACE_ID` explicitly, the
script verifies that the ID really points to a resource with that name and
stops before writing the Wrangler configuration when it does not.

`EMAIL_DOMAIN` must match a zone name in your account exactly. The deployment
script configures the catch-all of that zone; when the value only matches a
parent zone, the script stops before it modifies the database or publishes, so
that it never changes the catch-all of a parent domain. When you receive mail
on a subdomain, complete the
[Email Routing subdomain setup](https://developers.cloudflare.com/email-service/configuration/subdomains/)
first and confirm that the subdomain matches its own zone.

`CUSTOM_DOMAIN` must belong to a zone managed by this Cloudflare account. The
deployment uses a Worker Custom Domain, so Cloudflare provisions the DNS
record and the certificate — you do not create a proxied DNS record first.
Leave it empty to enable the `workers.dev` address. The host name should be
dedicated to this application; `pages.dev` is not your zone and cannot be used
here.

When you upgrade from an older plain Worker Route, remove the old
`HOST/*` route that points to `nextmail` for the same host name after the
Custom Domain binding succeeded. Wrangler can keep the old route when it
publishes a Custom Domain; routes for other hosts or other Workers stay.

### GitHub sync

| Variable | Purpose |
| --- | --- |
| `REPOSITORY_URL` | Target GitHub repository URL — only with `GITHUB_TOKEN` |
| `GITHUB_TOKEN` | GitHub token with `Secrets: Read and write` on the target repository |

### How the file is handled

Only the configuration entry point reads `.env.deploy`, and it puts the values
into the process environment. It never generates an application `.env` or
`.dev.vars`. The build rejects legacy application environment files and only
exposes the allowed `NEXT_PUBLIC_` configuration. Authentication and OAuth
values are installed separately as Worker secrets. The Cloudflare deployment
token, the account bootstrap JSON, the Resend key and the Turnstile secret
must not end up in a downloadable Worker bundle.

The build neither publishes nor applies remote configuration.

## Initialising site settings during deployment

All variables below live in the optional section of `.env.deploy.example`.
The local full deployment reads `.env.deploy`; GitHub Actions uses secrets
with the same names. An unset or empty value keeps the stored value; a value
that is filled in is applied on every full deployment — clear the
corresponding override when you want to keep later changes made in the
browser. A build or a single Worker publish does not apply any of them.

| Variable | Purpose / format |
| --- | --- |
| `DEFAULT_ROLE` | Default role for new accounts: `civilian`, `knight` or `duke` — never Emperor |
| `EMAIL_DOMAINS` | Receiving domains, comma separated; initialised from `EMAIL_DOMAIN` on the first deployment when empty |
| `ADMIN_CONTACT` | Contact address shown to users |
| `MAX_EMAILS` | Active mailbox limit for non-emperor accounts — a positive safe integer |
| `TURNSTILE_ENABLED` | `true` or `false`; the two keys below are required when enabled |
| `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | Public key and server-side secret; an empty value keeps the stored key |
| `RESEND_CONFIG` | JSON: `{ "enabled": true, "apiKey": "..." }` per receiving domain — enabling requires a key |
| `EMAIL_ROLE_LIMITS` | JSON: `{"duke":5,"knight":2}` — `-1` forbids, `0` is unlimited, a positive number caps the mails per day |
| `CATCHALL_EMAIL` | JSON: `{ "address": "catch@example.com", "enabled": true, "showAlways": true }` per receiving domain; include every domain, `{}` clears the configuration |
| `CATCHALL_OWNER_USERNAME` | Optional username of the catch-all owner; the owner must be the single Emperor of the site |
| `ADMIN_USERS` | Optional JSON array that creates or updates accounts |

A catch-all needs an existing Emperor account, or an Emperor created by
`ADMIN_USERS` in the same deployment. Redeploying, renaming and retrying after
a KV write failure keep the mailbox identity and its mail; the process stops
when the address conflicts with another mailbox.

Site settings, account writes, KV, migrations and publishing are not one
overall transaction. When a step fails halfway, check which stages already
completed.

### Optional account bootstrap

The example only shows the format — replace every password and key, and never
commit the real values:

```dotenv
ADMIN_USERS='[{"username":"admin","password":"replace-with-a-strong-password","name":"Administrator","role":"emperor"},{"username":"automation","password":"replace-with-another-password","role":"duke","allowedDomains":["example.com"],"apiKeys":[{"name":"automation","key":"replace-with-a-long-random-key","enabled":true}],"webhook":{"url":"https://hooks.example.org/mail","secret":"replace-with-signing-secret","enabled":false}}]'
```

- At most 100 accounts and 500 API keys in total. New accounts need a
  username that satisfies the registration rules and a password of at least 8
  characters; passwords are stored with the same algorithm the application
  uses. An account without an explicit role becomes a Civilian.
- The username locates an existing password account. Only the fields you
  provide are updated; omitted or empty strings keep the previous value, and
  accounts or keys that are not listed are not deleted. As long as the
  configuration still carries a password or a role, later deployments keep
  applying these overrides.
- `role` can be `emperor`, `duke`, `knight` or `civilian`. The site still
  supports exactly one Emperor and an existing Emperor is never downgraded —
  name the Emperor explicitly when you need one.
- `allowedDomains` keeps the previous value when omitted, `null` means no
  restriction, `[]` forbids every domain. A non-empty array may only use the
  receiving domains of the site, and it cannot restrict the Emperor.
- `apiKeys` are updated by their current name per user. A new key requires the
  `key` value and can only be configured by a role that may manage API keys.
  `expiresAt` is an ISO timestamp; when omitted the existing expiry is kept.
  A new key is valid for one year and must not be `null`. The full key is
  visible in plain text in the account's profile — the user accepted this.
- `webhook` supports `url`, `secret` and `enabled`. Enabling it or setting a
  target must satisfy `WEBHOOK_ALLOWED_HOSTS` and the role permissions. The
  deployment never sends a test webhook or email.

Apart from these overrides, business data such as share links and sent mail
stays under application management — the deployment does not fabricate history.

## Webhook allowlist

`WEBHOOK_ALLOWED_HOSTS` is a precondition for webhook delivery. It is a
comma-separated list of exact, trusted public host names approved by the
operator, without protocol, path, port or wildcards:

```dotenv
WEBHOOK_ALLOWED_HOSTS="hooks.example.com,notifications.example.com"
```

Set it in `.env.deploy` at the repository root, or as a GitHub Actions secret
with the same name. `npm run deploy` installs the allowlist into both the main
application Worker and the Email Worker. Local development and previews use
`.env.deploy` as well, so no `.dev.vars` is needed. Publishing a single
component on its own does not perform the settings sync of a full deployment —
use the full deployment to install secrets and site settings.

Before an upgrade, review the enabled webhook targets and approve only hosts
controlled by the trusted operator. The deployment checks them before it
migrates or publishes and stops when a target would be blocked. It never
approves a stored user URL automatically. The list may be empty when no
webhook is enabled — the profile page then explains that an administrator has
to finish the setup before a webhook can be enabled, and existing webhooks
can still be disabled.

After the deployment, save an HTTPS webhook URL on an approved host and use
**Test** in the profile page. Unapproved hosts, redirects, non-HTTPS URLs,
credentials, fragments and non-standard ports are all rejected. `GET
/api/webhook` only reports whether a signing secret is configured, never the
secret itself — keep it in your deployment configuration. Verify that
`X-Webhook-Signature` is `sha256=` followed by the hex HMAC-SHA256 of
`X-Webhook-Timestamp + "." + raw request body`, and reject timestamps that
are too old to prevent replay attacks. See [Webhooks](/guides/webhooks).

## OAuth applications

### GitHub

1. Sign in to [GitHub Developer settings](https://github.com/settings/developers)
   and create a new OAuth App.
2. Generate a new `Client ID` and `Client Secret`.
3. Configure:
   - **Application name**: `<your-app-name>`
   - **Homepage URL**: `https://<your-app-host>`
   - **Authorization callback URL**:
     `https://<your-app-host>/api/auth/callback/github`

### Google

1. Open the [Google Cloud Console](https://console.cloud.google.com/) and
   create a project.
2. Configure the OAuth consent screen.
3. Create an OAuth client ID:
   - Application type: *Web application*
   - Authorised JavaScript origins: `https://<your-app-host>`
   - Authorised redirect URIs: `https://<your-app-host>/api/auth/callback/google`
4. Store the client ID and secret as `AUTH_GOOGLE_ID` and
   `AUTH_GOOGLE_SECRET`.

## Multi-domain catch-all

The main application and the Email Worker must bind the **same** `SITE_CONFIG`
KV namespace. The full deployment script synchronises the binding in both
generated files; before a manual deployment run `npm run config:wrangler` and
then check `./wrangler.json` and `./wrangler.email.json` together.

Every receiving domain needs its own Cloudflare Email Routing rule that hands
mail to the Email Worker. The full deployment only configures the zone of
`EMAIL_DOMAIN` automatically — the other domains are separate work.

The website domain is not a receiving domain and cannot be used as the default
one.

## Upgrading

Back up D1 before an upgrade. The relevant migrations are:

| Migration | Purpose |
| --- | --- |
| `0020_user_email_domain_access.sql` | Per-user domain restrictions |
| `0021_message_read_tracking.sql` | Read state and statistics indexes |
| `0022_stable_mail_delivery.sql` | Stable catch-all mapping and arrival sequence |
| `0023_webhook_user_unique.sql` | One webhook per user |
| `0024_message_delivery_key.sql` | Inbound delivery de-duplication key |
| `0025_expiry_cleanup_indexes.sql` | Cleanup indexes |
| `0026_mailbox_created_at_index.sql` | Mailbox pagination index |

Migration `0022` backfills the arrival sequence for existing messages and
records every later insert with a trigger, so its runtime depends on the
number of messages you already have. It does not delete mail or change mail
timestamps. Legacy timestamp cursors replay their metadata once against the
new endpoints — clients de-duplicate by ID.

Check the actual pending SQL before an upgrade. Passing the Node test suite
does not replace a remote D1 migration or a real SMTP verification.

:::warning
Upgrade manually in this order: apply the migrations, publish the Email
Worker, then publish the main application. The full deployment script
publishes the main application first and the Email Worker second — when you
use the full script, wait until both Workers succeeded before you change the
catch-all prefix.
:::

## Removing a deployment

After you are sure you want to delete the Cloudflare resources and the D1
data:

```bash
npm run delete
```

The command reads `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` and
`EMAIL_DOMAIN` from `.env.deploy` and the process environment; keep
`CUSTOM_DOMAIN` — or the routes in the generated `wrangler.json` — when a
custom-domain route was deployed. The script verifies the token and lists the
resources it is going to handle before it deletes anything. Explicit D1/KV
IDs that still exist must point to the project resources named `nextmail-d1`
and `nextmail-kv`, otherwise the command stops; IDs that no longer exist are
skipped as already cleaned.

The cleanup covers exactly the three Workers `nextmail`,
`email-receiver-worker` and `cleanup-worker`, the exact routes in the project
configuration that point to `nextmail`, the KV namespace named `nextmail-kv`,
the D1 database named `nextmail-d1`, and the catch-all of `EMAIL_DOMAIN` as
long as it still forwards to `email-receiver-worker`.

Deleting the D1 database removes the application data — back it up first.
Before the deployment overwrites the catch-all it stores the original rule per
zone in the project KV, including the state "no rule existed". Later
deployments keep the first recorded state and never treat NextMail's own
receiving rule as the original. The cleanup restores the original rule of the
same zone only when the current catch-all still points at the NextMail Worker;
when no rule existed before, when the upgrade stored no backup, or when the
backup cannot be attributed to a zone, the current rule is disabled. Backups
from older versions that contain no zone information are never restored across
zones, and an overwritten configuration that was never saved cannot be
recovered.

The script does not delete Cloudflare zones and never calls the DNS API
directly. It does not modify the GitHub repository, Actions secrets, OAuth
applications, the local `.env.deploy` or the Wrangler configuration. The DNS
and the certificate of a Worker Custom Domain are managed by Cloudflare, and
the next deployment re-establishes the association from `CUSTOM_DOMAIN`.

After the cleanup the ignored `wrangler.json` still holds the resource IDs and
routes of the last deployment; the repository only keeps the
`wrangler.example.json` template without resource IDs. When you deploy again
and `DATABASE_ID` or `KV_NAMESPACE_ID` still point at deleted resources, clear
or update them first. The flow is not atomic — if the Cloudflare API fails
after a partial deletion, run it again; Workers, routes or resources that no
longer exist are skipped.

## After the deployment

1. Confirm that the front-end loads without a Cloudflare challenge.
2. Confirm that the catch-all rule of the domain points at
   `email-receiver-worker`, then send a test mail to an address that nobody
   created and check the catch-all mailbox.
3. Create the first account and claim the Emperor role on the profile page —
   see [Roles and permissions](/getting-started/roles).
4. Configure the receiving domains and, if you want it, the catch-all mailbox
   in the site settings.
5. Approve the webhook hosts in `WEBHOOK_ALLOWED_HOSTS` before anyone enables
   a webhook.
