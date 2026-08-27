# Oriel

**Oriel** is a window that lets in light: a free, open-source, self-hostable microlearning app. It turns idle scrolling into short, sourced lessons (15 seconds to 3 minutes). There are no subscriptions, ads, or premium tiers.

> Kurze deutsche Einleitung: Oriel ist eine freie Microlearning-App. Du hostest sie selbst. Der Feed arbeitet gegen echte Postgres-, Redis- und MinIO-Dienste — nicht gegen Mock-Bildschirme. Die vollständige Betriebsanleitung steht unten auf Englisch.

## What you get

- Next.js App Router, React 19, TypeScript strict, Tailwind CSS 4, Appica UI
- PostgreSQL + Drizzle migrations, Redis + BullMQ workers, S3-compatible storage (MinIO locally)
- Sessions (better-auth) with roles: learner, creator, moderator, admin, superadmin
- OpenAI-compatible provider adapter (configurable base URL). Unconfigured AI falls back to editorial seed content
- Rolling feed queue of 10–15 prepared items
- Moderation pipeline, upload/scan jobs (ClamAV optional; stub records results in development)
- Isolated sandbox origin for compiled experiences (no `allow-same-origin`)

## Local setup

Requirements: Node 22+, pnpm, Docker (recommended) **or** local Postgres 16 with pgvector, Redis 7, and MinIO.

```bash
cp .env.example .env
# set AUTH_SECRET, ENCRYPTION_KEY, ADMIN_BOOTSTRAP_PASSWORD
pnpm install
docker compose up -d postgres redis minio minio-init
pnpm db:migrate
pnpm db:seed
pnpm dev          # app at http://localhost:3000
pnpm worker       # job consumers
```

Without Docker, point `DATABASE_URL`, `REDIS_URL`, and `STORAGE_*` at local services. Create database `oriel`, user `oriel`, and `CREATE EXTENSION vector`.

Open:

- Feed: http://localhost:3000/home
- Admin (after seed with bootstrap email): http://localhost:3000/admin
- Health: http://localhost:3000/api/health

Default bootstrap admin comes from `ADMIN_BOOTSTRAP_EMAIL` / `ADMIN_BOOTSTRAP_PASSWORD` in `.env`. Change the password immediately.

## AI provider

Oriel talks to any OpenAI-compatible HTTP API:

- `AI_BASE_URL` (e.g. `https://api.openai.com/v1` or a local proxy)
- `AI_API_KEY`
- `AI_MODEL`, `AI_FAST_MODEL`, `AI_EMBEDDING_MODEL`, `AI_MODERATION_MODEL`
- Optional separate transcription endpoint
- Timeouts, concurrency, JSON schema flag, daily token budget

If these are empty, generation jobs stay idle and the feed serves seeded editorial items. That is intentional — never a fake success.

User BYOK: encrypted at rest with `ENCRYPTION_KEY`, last four characters stored for display, never shared across users.

## Storage

S3-compatible. Locally: MinIO at `STORAGE_ENDPOINT` with `STORAGE_FORCE_PATH_STYLE=true`. Create bucket `STORAGE_BUCKET`. Private uploads stay private; only published artifacts get public URLs you configure.

## Moderation architecture

Every public submission is a moderation case. Text (and later frames, transcripts, code, generated HTML/JSX) is classified into structured categories with confidence and a recommended action: auto-approve, hold, auto-reject. Health, finance, law, politics, security, and safety are stricter and require visible sources. Appeals and administrator actions append to an immutable audit log. Development scanners may use `SCANNER_MODE=stub` (still writes `scan_results`). Production compose profile `clamav` runs ClamAV.

## Sandbox security

Generated JSX/HTML is inspected against an allowlist, compiled in a worker (not the web process), and rendered in an iframe on `SANDBOX_ORIGIN` with:

- `sandbox` **without** `allow-same-origin`
- Restrictive CSP
- postMessage types: `completion`, `answer`, `score`, `height`, `restart` only

Do not weaken this boundary.

## Migrations

```bash
pnpm db:generate   # after schema edits
pnpm db:migrate
pnpm db:seed
```

Migrations live in `drizzle/`. The first migration enables `vector` and creates all required entities.

## Testing

```bash
pnpm test          # unit: ranking, moderation, sandbox, permissions
pnpm test:e2e      # Playwright journeys (requires app + db)
```

## Production deploy

1. Provision Postgres (pgvector), Redis, S3-compatible storage.
2. Set strong `AUTH_SECRET` and `ENCRYPTION_KEY`.
3. Configure `APP_URL` and `SANDBOX_ORIGIN` as different origins.
4. `docker compose up --build` or run `pnpm build && pnpm start` plus `pnpm worker`.
5. Put TLS in front of app and sandbox.
6. Optional: `--profile clamav` for virus scanning; point `SCANNER_MODE=clamav`.
7. Optional OTLP endpoint for traces.

Oriel is free software. There is no billing integration on purpose.
