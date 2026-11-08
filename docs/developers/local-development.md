---
title: Local development
description: Run NextMail locally with a local D1 database and a local KV namespace.
sidebar_position: 4
---

# Local development

## Requirements

- Node.js 24+
- npm
- A Cloudflare account (only for remote resources; offline development works
  without a valid deployment token)

## Setup

```bash
git clone --recurse-submodules https://github.com/SMYQH/nextmail.git
cd nextmail
npm ci
```

The documentation site is included as the `docs` Git submodule. If you already
cloned the application without submodules, initialize it from the repository
root with `git submodule update --init docs`. The application can run without
the submodule, but its documentation source will not be available locally.

### Binding templates

The repository tracks three templates: `wrangler.example.json`,
`wrangler.email.example.json` and `wrangler.cleanup.example.json`. They
describe the Worker, D1 and KV bindings without containing resource IDs.

The generated files `wrangler.json`, `wrangler.email.json` and
`wrangler.cleanup.json` are ignored by Git and are regenerated automatically by
`npm run config:wrangler` and by every command that needs them (`dev`,
`build:worker`, the migration commands and the deployment commands). Do not
commit them and do not paste credentials into them — operator settings live in
`.env.deploy`.

### Environment

```bash
cp .env.deploy.example .env.deploy
```

Development, builds, previews and deployments all read this one file, plus the
process environment. Never create `.env`, `.env.local` or `.dev.vars`.

For local development set a random `AUTH_SECRET` and point
`NEXT_PUBLIC_BASE_URL` at your local address; when it is empty the dev server
derives canonical links from the request. Offline development does not need a
valid Cloudflare deployment token. See
[Deployment and operations](/developers/deployment) for the complete list of
variables.

### Local database

```bash
npm run db:migrate-local
```

This applies the migrations to a local SQLite database and uses its own local
state, independent of any remote D1 instance.

## Run it

```bash
npm run dev
```

## Checks

```bash
npm run lint            # ESLint over the app directory, zero warnings allowed
npx tsc --noEmit        # TypeScript
npm test                # Node unit and route tests, no external services
npm run build           # Next.js production build
npm run build:worker    # OpenNext Worker bundle + validation
npm run preview:worker  # Preview the built Worker locally
```

Run them sequentially. `npm run build` starts with a `prebuild` step that
removes the previous `.next` output and `tsconfig.tsbuildinfo` and regenerates
the route types, so a stale incremental cache can never be reused. Stop the
dev server before a production build and never run two builds at the same time
— they share the `.next` directory.

A successful `npm run build` is **not** a substitute for the Worker build and
runtime verification.

## Browser tests

```bash
npm run test:browser
```

The suite uses the bundled Playwright Chromium and covers English and Chinese,
light and dark themes, desktop and a 390 × 640 mobile viewport: sign-in,
mailbox management, API keys and share pagination. It starts or reuses a local
dev server.

After a fresh clone — or after `git clean -fdx` — run:

```bash
npm run bootstrap
```

It restores the dependencies, the single `.env.deploy`, the local database and
the test configuration, and installs Chromium. Do not substitute Edge or a
system browser.

Reports are written to `.test/playwright/`, results and screenshots to
`.test/results/`; the whole `.test/` directory is ignored by Git.

The full local loop gate is `npm run agent:gate`. Browser tests do **not**
prove production Cloudflare behaviour — inbound delivery, Resend and webhook
delivery have to be verified in a deployed environment.

## Debugging

- Application code runs inside workerd through OpenNext's `getPlatformProxy`,
  so a Node debugger cannot set breakpoints in `app/**` or `proxy.ts`. Inspect
  browser code with the Chrome configuration and Worker code through the
  workerd inspector at `http://127.0.0.1:9229/json/list`.
- Editor and launch configurations live in `.vscode/`.

## Project layout

| Path | Contents |
| --- | --- |
| `app/[locale]/` | Localised pages (home, login, mailbox, profile, shared messages) |
| `app/api/` | Route handlers |
| `app/lib/` | Auth, permissions, database access, validation, shared logic |
| `app/components/`, `app/hooks/` | Features and shared UI primitives |
| `app/i18n/` | Locale setup and the `en` / `zh-CN` message catalogues |
| `workers/email-receiver.ts`, `workers/cleanup.ts` | Inbound mail and scheduled cleanup |
| `drizzle/` | SQL migrations |
| `scripts/` | Migration, deployment, fixture, webhook and icon tooling |
| `tests/` | Node unit and route tests plus the browser suite |

## Testing conventions

- Assert observable behaviour and side effects: responses, persisted data and
  the number of external calls. A status code check alone does not prove that
  nothing else happened.
- Reset the database and configuration, restore mocks and close the databases
  after each test.
- The SQLite/D1 adapter does not simulate multi-instance concurrency, the
  Cloudflare CPU budget or real service delivery. Those need a deployed
  environment.
