# Deploying GeoFold (Next.js → Vercel)

The app is a single Next.js fullstack app in `next/`. It talks to the existing
Supabase project (Postgres + PostGIS, Storage, Auth). Recommended host: **Vercel**.

## 0. Prerequisites (one-time, on Supabase)

These already exist on the current project (the .NET app migrated it), so you only
need to redo them if you point at a **fresh** Supabase project:

- [ ] PostGIS extension enabled
- [ ] Tables: `projects`, `surveys`, `survey_photos`, `subscriptions` (schema lives
      only as EF migrations under `backend/.../Data/Migrations` — a fresh DB needs it
      recreated as SQL)
- [ ] Private Storage bucket named `survey-photos`

## 1. Rotate the JWT secret first

`SUPABASE_JWT_SECRET` was pasted in chat during development. Before going live:
Supabase → Project Settings → API → **rotate/legacy JWT secret**, then use the new
value everywhere.

## 2. Push to GitHub

```bash
git push origin main
```

## 3. Import to Vercel

1. vercel.com → **Add New → Project** → import the repo.
2. **Root Directory: `next`** (important — the app is in the subfolder).
3. Framework preset: Next.js (auto). Build command / output: defaults.

## 4. Set environment variables (Vercel → Settings → Environment Variables)

Add all of these for **Production** (and Preview if you want previews to work).
See `.env.example` for the shape. Do **not** prefix secrets with `NEXT_PUBLIC_`.

| Variable | Notes |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public — a **real** key turns demo mode OFF |
| `SUPABASE_SERVICE_ROLE_KEY` | secret |
| `SUPABASE_JWT_SECRET` | secret (the rotated one) |
| `SUPABASE_STORAGE_BUCKET` | `survey-photos` |
| `DB_HOST` | Supabase **transaction pooler** host |
| `DB_PORT` | `6543` (serverless pooler) |
| `DB_NAME` | `postgres` |
| `DB_USER` | `postgres.<project-ref>` |
| `DB_PASSWORD` | secret |
| `WEBHOOKS_SHARED_SECRET` | long random string |

## 5. Deploy & verify

- Deploy. Open the URL → you should land on the real **login** (not demo).
- Sign in with a Supabase user, create a project, capture a point, check `/map` and
  `/surveys` (export CSV/Excel).
- If writes fail: check `DB_*` (pooler host/port) and that PostGIS + bucket exist.

## Commercial note

Vercel's Hobby (free) tier is non-commercial per their ToS. To sell access you need
**Vercel Pro** (~$20/mo), or an alternative host (Cloudflare via OpenNext, Netlify, or a VPS).
