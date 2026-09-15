# Package Cost Calculator

Per-door cost-to-serve model for Raynor Realty's three management packages
(Min Mgmt, Raynor Special, Prot Plus). Hosted on Vercel, backed by Postgres,
shared by everyone who signs in with a `@raynorrealtync.com` Google account.

## Stack

- Next.js (App Router) on Vercel
- Postgres via Vercel's Neon-backed integration, Drizzle ORM
- NextAuth v5, Google provider, domain-restricted sign-in
- Tailwind CSS
- Vitest for the calc engine and migration layer

The calculation engine (`lib/calc.ts`) and migration layer (`lib/migrate.ts`)
are plain, framework-free TypeScript — pure functions, fully unit tested.

## One-time setup

### 1. Google OAuth (for sign-in)

1. In [Google Cloud Console](https://console.cloud.google.com/), create (or
   reuse) a project, then **APIs & Services -> Credentials -> Create
   Credentials -> OAuth client ID** (type: Web application).
2. Add authorized redirect URI:
   `https://<your-vercel-domain>/api/auth/callback/google`
   (add `http://localhost:3000/api/auth/callback/google` too for local dev).
3. Copy the Client ID and Client Secret — you'll set these as env vars below.

### 2. Vercel project

1. Push this repo to GitHub (see below), then import it in
   [vercel.com/new](https://vercel.com/new).
2. In the project's **Storage** tab, add a **Postgres** database and connect
   it to the project — this auto-populates `POSTGRES_URL` and friends.
3. In **Settings -> Environment Variables**, add:
   - `AUTH_SECRET` — generate with `openssl rand -base64 32`
   - `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` — from step 1
   - `AUTH_ALLOWED_DOMAIN` — `raynorrealtync.com`
4. Deploy.

### 3. Apply the database schema and seed the model

Run these once, locally, pointed at the production database (copy the
`POSTGRES_URL` from Vercel's dashboard into `.env.local` first — see
`.env.example`):

```bash
npm install
npm run db:migrate   # creates the scenarios / scenario_versions tables
npm run db:seed      # seeds one scenario named "Current" from data/seed-model.json
```

## Local development

```bash
npm install
cp .env.example .env.local   # fill in POSTGRES_URL (a Neon/Vercel Postgres branch works fine) and the auth vars
npm run db:migrate
npm run db:seed
npm run dev
```

## Tests

```bash
npm test
```

The suite includes the project's canary: at 180 doors, Fully Allocated / Min
Mgmt must equal $94.40/door/mo. If that number moves, the engine port is
wrong and nothing downstream is trustworthy. It also verifies the legacy
v19 fixture (`data/legacy-v19-fixture.json`) migrates forward with its rates
and templates intact.

## How saves work

Every edit autosaves ~1.5s after you stop typing. Each save both appends a
row to `scenario_versions` (the undo history — append-only, never edited or
deleted) and bumps the scenario's `doc`/`rev` in one transaction. If someone
else saved while you were editing, you get a conflict banner instead of a
silent overwrite: reload their version, or keep yours and overwrite.

Version history and one-click restore live behind the scenario menu.
Restoring a past revision writes it forward as a *new* version — it never
rewinds, so history is never destroyed.

## What's implemented vs. deferred

Implemented: multi-scenario editing shared by everyone, full version
history + restore, JSON export/import, Google-restricted auth, the complete
calc + migration engine, editable cost groups/lines/categories, per-group
cost-view assignment, and a basic side-by-side scenario compare.

Deferred (noted in the original build spec as "worth adding once hosted," or
cut for v1 scope): the drag-and-drop Bench overlay for staging/promoting
services between scope and cost groups, per-row cost-view overrides in the
UI (the data model supports it; there's no UI for it yet), and a readable
per-scenario change log rendered from `scenario_versions`.
