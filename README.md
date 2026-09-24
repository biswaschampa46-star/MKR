# MKR — Casual Threads & Style

Production storefront + admin panel for **MKR**, a Bangladeshi casual-wear label.
Built with Next.js (App Router) + TypeScript + Tailwind CSS v4, PostgreSQL via
Drizzle ORM, Supabase for Auth / Storage / Realtime, and deployed on Vercel.

> **Never commit `.env.local`.** Every credential is read from environment
> variables at runtime (see `.env.example`). This repository contains no secrets.

## Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16 (App Router, Server Actions, Turbopack) |
| Language | TypeScript 5 (strict, `noEmit`) |
| Styling | Tailwind CSS v4 (`@tailwindcss/postcss`) |
| Database | PostgreSQL (Supabase) via Drizzle ORM + `pg` |
| Auth | Supabase Auth, plus signed httpOnly cookie sessions |
| Storage | Supabase Storage buckets (`uploads`, `profile-photos`, `mkr-marketing-videos`) |
| Realtime | Supabase Realtime with a durable SSE fallback (`/api/realtime`) |
| Email | Resend HTTP API (optional) |
| AI | OpenRouter (optional) |
| Hosting | Vercel |

## Requirements

- Node.js **22.x** (pinned in `package.json` → `engines`; CI also uses Node 22)
- npm 10+
- A PostgreSQL database (a Supabase project is recommended)

## Local development

```bash
npm ci                          # or: npm install
cp .env.example .env.local      # Windows: copy .env.example .env.local
# fill in the values, then
npm run dev                     # http://localhost:3000
```

| Script | Command | Purpose |
| --- | --- | --- |
| `npm run dev` | `next dev` | Development server |
| `npm run build` | `next build` | Production build |
| `npm start` | `next start` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit` | Type check |
| `npm run lint` | `eslint .` | Lint |

## Environment variables

Copy `.env.example` to `.env.local` for local development, and add the same
names in **Vercel → Project → Settings → Environment Variables** for both
Production and Preview.

### Public (shipped to the browser — `NEXT_PUBLIC_*` only)

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | recommended | Canonical https URL used by `metadataBase`, OG/Twitter tags, `robots.txt`, `sitemap.xml` and JSON-LD. Falls back to `SITE_URL`, then the platform's `VERCEL_URL`, then `http://localhost:3000`. |
| `NEXT_PUBLIC_SUPABASE_URL` | recommended | Supabase project URL (browser Auth + Realtime). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | recommended | Supabase anon key (public-safe by design). |

### Server-only secrets (never prefix these with `NEXT_PUBLIC_`)

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | **yes** | Postgres connection string. `src/db/index.ts` throws at import time when it is missing, so the build and every DB-backed page need it. |
| `SUPABASE_SERVICE_ROLE_KEY` | recommended | Server-side uploads, deletes and signed URLs. Without it media is stored in `media_assets.bytea` and served from `/api/media/{id}`. |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | for admin | `/admin/login` credentials. |
| `ADMIN_SESSION_SECRET` | for admin | Signs the admin session cookie. |
| `OPENROUTER_API_KEY` | optional | AI assistant, size recommendations, product copy. |
| `OPENROUTER_API_KEY_FOR_ADMINPANEL_PRODUCT` | optional | Dedicated key for the admin product-copy generator (falls back to `OPENROUTER_API_KEY`). |
| `OPENROUTER_MODEL`, `AI_MODELS`, `OPENROUTER_BASE_URL` / `AI_BASE_URL` | optional | Model selection and gateway override. |
| `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO` | optional | Verification / password-reset / order email. When unset the UI reports that email is not configured — nothing is faked. |
| `PAYMENT_BKASH_NUMBER`, `PAYMENT_NAGAD_NUMBER`, `PAYMENT_ROCKET_NUMBER` | optional | Manual mobile-payment numbers shown at checkout. |
| `SITE_URL` | optional | Server-side alias of `NEXT_PUBLIC_SITE_URL`. |

`VERCEL_URL` is injected by the platform automatically — do not set it manually.

`GET /api/health` reports whether the database, Supabase Auth and Supabase
Storage are configured. It returns booleans only, never values.

## Database & migrations

Migrations are plain SQL in `supabase/migrations/`, applied in filename order.
They are extracted from / verified against the live Supabase project, so a fresh
database can be recreated from them:

| File | Contents |
| --- | --- |
| `0000_schema.sql` | enums, tables, constraints, indexes |
| `0001_extensions_sequences.sql` | extensions and sequences |
| `0002_functions.sql` | SQL/PLpgSQL functions (order RPC, trigger helpers…) |
| `0003_triggers.sql` | triggers |
| `0004_rls.sql` | row-level security policies |
| `0005_storage.sql` | storage buckets and policies |
| `0006_realtime_publication.sql` | realtime publication |
| `0007_hardening.sql` | `rate_limits` table (shared rate limiting), private `profile-photos` |
| `0008_profile_photos_private.sql` | profile-photo privacy follow-up |
| `0009_supabase_config_and_migrations_log.sql` | Supabase configuration ledger |
| `0010_hero_mobile_media.sql` | responsive hero media columns |

Apply them with the Supabase SQL editor or `psql "$DATABASE_URL" -f <file>`, in
order. `src/db/sql/*.sql` are the original idempotent bootstrap scripts kept for
reference and are safe to re-run. There is **no local database file or path** —
the app talks to Postgres over `DATABASE_URL` only.

`drizzle.config.json` is only used if you choose to run `drizzle-kit`; the app
itself does not depend on generated migration files.

Read-only maintenance scripts (local dev only — they read `.env.local`):

```bash
node scripts/extract-schema.mjs                        # table DDL → supabase/migrations/0000_schema.sql
node scripts/extract-sql.mjs                           # functions/RLS/storage → 0001..0006
node scripts/migrate-media-to-storage.mjs --dry-run    # bytea → Supabase Storage (idempotent)
```

## Deploying to Vercel

1. Push this repository to GitHub (branch `main`).
2. In Vercel choose **Add New → Project → Import** and select the repository.
   The **Next.js** framework preset is detected automatically; leave Build
   Command, Output Directory and Install Command at their detected defaults.
3. Add the environment variables above to **Production** *and* **Preview**.
   `DATABASE_URL` is mandatory — without it the build fails while collecting
   page data. Add `NEXT_PUBLIC_SITE_URL` with your production domain so
   canonical URLs, OG tags and the sitemap are correct.
4. Deploy, then check `https://<your-domain>/api/health` for
   `{"ok":true,"database":"connected",...}`.
5. Apply any `supabase/migrations/*.sql` that the target database is missing.

**No `vercel.json` is required** — the project relies on Next.js defaults
(Node.js runtime for API routes, automatic static/dynamic handling, custom
security headers already declared in `next.config.ts`).

The app is stateless and serverless-safe:

- no filesystem writes anywhere in `src/` (verified) — uploads go to Supabase
  Storage, or into `media_assets.bytea` served by `/api/media/[id]` when the
  service-role key is absent;
- no localhost URLs or absolute Windows paths in application code (the single
  `http://localhost:3000` in `src/lib/env.ts` is a documented dev-only fallback
  that `VERCEL_URL` supersedes on any deployment);
- rate limiting lives in the shared `rate_limits` table, not in process memory;
- no background workers, cron loops or long-lived processes.

### Platform limits worth knowing

- **Request body size:** Vercel Functions enforce a request-body ceiling, so
  local uploads that pass through Server Actions are bounded by the platform,
  not only by `experimental.serverActions.bodySizeLimit` in `next.config.ts`.
  Keep admin image uploads modest (compress before uploading) — the
  `1.7 MB` brand stills in `public/brand/` are a good reference size. Marketing
  videos already bypass Server Actions entirely through signed direct-to-
  Supabase uploads, which is the pattern to follow for anything large.
- **Server-Sent Events:** `/api/realtime` streams for up to 5 minutes and then
  closes gracefully; `EventSource` reconnects automatically and resumes from
  `Last-Event-ID`.
- **Cold starts / runtime:** application code runs on Next.js's default Node.js
  runtime, and the routes that stream or hold long requests
  (`/api/realtime`, `/api/admin/export/orders`) declare it explicitly; the `pg`
  pool is cached on `globalThis` outside production.

## Project layout

```
src/
  app/
    (site)/      storefront routes (home, shop, product, cart, checkout, profile, track…)
    admin/       admin login + authenticated panel
    actions/     Server Actions (auth, admin, orders, products, settings, profile)
    api/         route handlers (media, realtime, ai, cart, checkout, health, export…)
  components/    UI, layout, cart, product, admin, profile, loading components
  db/            Drizzle schema, pg pool, SQL bootstrap scripts
  lib/           env access, auth, storage, email, data access, validation, orders
  hooks/         client-side hooks (realtime subscription)
supabase/migrations/   authoritative SQL migrations (0000 → 0010)
public/brand/          brand assets (logo mark, product stills, OG image)
scripts/               local-only maintenance scripts
.github/workflows/     CI — typecheck, lint, build on every push/PR
```

## Security notes

- All secrets are read at runtime through `src/lib/env.ts` / `src/lib/email.ts`;
  nothing is hardcoded and service-role access stays server-side only.
- `.gitignore` excludes every `.env*` variant except `.env.example`, plus
  `.vercel`, build output, logs and OS/editor junk.
- `/api/health` exposes configuration booleans, never values.
- Admin and customer sessions use httpOnly, SameSite=Lax cookies that are
  `Secure` in production.

