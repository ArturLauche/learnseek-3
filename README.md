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
pnpm sandbox      # dedicated sandbox origin at http://127.0.0.1:3001
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

If these are empty, generation jobs stay idle unless the user stored a BYOK credential. The feed still serves seeded editorial items. That is intentional — never a fake success.

User BYOK: encrypted at rest with `ENCRYPTION_KEY` (AES-256-GCM). After save, Oriel stores and displays only the last four characters. Keys are scoped to the owning user and used for that user's generation/transcription calls. They are never shared across users. Platform moderation and embeddings still use the operator env key when present, so ranking space stays consistent.

## Email and web push

Optional. Leave `SMTP_*` and `VAPID_*` empty for a local install: in-app notifications still work, and Settings says honestly that email/push are not configured. Set `SMTP_HOST` + `SMTP_FROM` to send mail via nodemailer. Set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `NEXT_PUBLIC_VAPID_PUBLIC_KEY` to enable Web Push. Expired browser subscriptions (HTTP 410) are deleted.

## Observability

`OTEL_EXPORTER_OTLP_ENDPOINT` enables JSON OTLP export of traces (`/v1/traces`) and metrics (`/v1/metrics`). Attribute keys such as `password`, `apiKey`, `prompt`, `fullText`, and ciphertext are dropped. If the endpoint is unset, export is a no-op.

## Video pipeline

The Docker image installs `ffmpeg`/`ffprobe`. Uploaded video is probed, transcoded (H.264/AAC), thumbnailed, sampled at 25/50/75%, audio-extracted, transcribed when a transcription endpoint exists, language-detected, and chapter-split from silence. Moderation, topic, and embedding jobs follow. Without ffmpeg the upload is recorded as metadata-only.

## Storage

S3-compatible. Locally: MinIO at `STORAGE_ENDPOINT` with `STORAGE_FORCE_PATH_STYLE=true`. Create bucket `STORAGE_BUCKET`. Private uploads stay private; only published artifacts get public URLs you configure.

## Moderation architecture

Every public submission is a moderation case. Text (and later frames, transcripts, code, generated HTML/JSX) is classified into structured categories with confidence and a recommended action: auto-approve, hold, auto-reject. Health, finance, law, politics, security, and safety are stricter and require visible sources. Appeals and administrator actions append to an immutable audit log. Development scanners may use `SCANNER_MODE=stub` (still writes `scan_results`). Production compose profile `clamav` runs ClamAV.

## Sandbox security

Generated JSX is **parsed and inspected**, then compiled **only** in `worker/compile-child.mjs` (spawned from the BullMQ compile worker). The child runs with a 64MB heap, a wall-clock timeout, CPU/parse-step budgets, and a **stripped environment** (no `DATABASE_URL`, `AUTH_SECRET`, `AI_API_KEY`, or other secrets). Untrusted JSX is never compiled or executed in the Next.js process.

Prefer structured `learning_scenes` (`kind=schema`: quiz, flashcard, timeline, comparison, code, prose). JSX/HTML is used only when the schema cannot represent the experience. Allowlisted imports: Appica `button|badge|card|progress|input` and `@oriel/learning/quiz|flashcard|timeline`.

Compiled HTML is rendered in an iframe on **`SANDBOX_ORIGIN`**, a dedicated host (`pnpm sandbox`, default `http://127.0.0.1:3001` — a different host than `APP_URL` so session cookies are not sent). Compose service `sandbox` runs this host, not the full Next app.

- iframe `sandbox="allow-scripts"` **without** `allow-same-origin`
- CSP: `default-src 'none'; script-src 'self'; connect-src 'none'; frame-ancestors <APP_URL>`
- postMessage types: `completion`, `answer`, `score`, `height`, `restart` only, targeted at the parent origin
- Keyboard, labels, reduced motion, contrast, and a noninteractive text fallback

Do not weaken this boundary. Production should use a distinct hostname (for example `sandbox.example.com`), not only a different port.

Original prompt (redacted), model id, source, validation, compiled hash, and version history (`artifact_versions`) are persisted.

## Migrations

```bash
pnpm db:generate   # after schema edits
pnpm db:migrate
pnpm db:seed
```

Migrations live in `drizzle/`. The first migration enables `vector` and creates all required entities.

## Testing

```bash
pnpm test          # unit + integration (feed integration needs Postgres/Redis)
pnpm test:e2e      # Playwright user + admin journeys (requires app + db)
```

Admin Playwright covers login, user suspend (step-up password), and a moderation decision against the real database.

Workers: `pnpm worker` consumes BullMQ queues (`generation`, `media`, `moderation`, `transcription`, `embedding`, `notifications`, `scan`, `compile`, `feed-replenish`). Compile jobs spawn `worker/compile-child.mjs` with a 64MB heap, stripped env, and a timeout — untrusted JSX is never compiled in the Next.js process. `pnpm sandbox` is the separate-origin iframe host.

If ClamAV is too heavy for a laptop, keep `SCANNER_MODE=stub` (still writes `scan_results`) and enable `--profile clamav` in production.

## Admin account creation

Set `ADMIN_BOOTSTRAP_EMAIL` and `ADMIN_BOOTSTRAP_PASSWORD` (min 12 chars) before `pnpm db:seed`. The seeder assigns `admin` and `superadmin` roles. Change the password after first login.

## Production deploy

1. Provision Postgres (pgvector), Redis, S3-compatible storage.
2. Set strong `AUTH_SECRET` and `ENCRYPTION_KEY`.
3. Configure `APP_URL` and `SANDBOX_ORIGIN` as **different origins** (different host in production; `localhost` vs `127.0.0.1` is acceptable locally). Run `pnpm sandbox` beside `pnpm start`.
4. `docker compose up --build` or run `pnpm build && pnpm start` plus `pnpm worker`.
5. Put TLS in front of app and sandbox.
6. Optional: `--profile clamav` for virus scanning; point `SCANNER_MODE=clamav`.
7. Optional OTLP endpoint for traces and metrics (`OTEL_EXPORTER_OTLP_ENDPOINT`).
8. Optional SMTP and VAPID keys for email and web push. Leave them empty to keep in-app-only delivery.

Oriel is free software. There is no billing integration on purpose.
