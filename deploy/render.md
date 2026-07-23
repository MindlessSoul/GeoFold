# Deploying the GeoFold API to Render (free, no credit card)

Render builds from the repo's `Dockerfile`. The app honours Render's `PORT` variable and exposes
`/health` for the health check.

## Step 0 — the repo must be on GitHub
Render deploys from a Git host. This repo is currently local only, so first create an empty
repository on GitHub (private is fine), then push to it. Creating the repo and pushing are yours
to do — they're account actions.

## Step 1 — create the service
1. Sign up at render.com (no card needed for the free instance type).
2. **New → Web Service** → connect your GitHub repo.
3. Render detects the `Dockerfile` and selects the **Docker** runtime. Leave the root directory
   blank — the Dockerfile is at the repo root and expects that build context.
4. Instance type: **Free**.

## Step 2 — settings
| Setting | Value |
|---|---|
| Runtime | Docker |
| Health Check Path | `/health` |
| Instance type | Free |

Don't set a start command — the Dockerfile's `ENTRYPOINT` handles it.

## Step 3 — environment variables
Add these under **Environment**. The keys match ASP.NET's `__` nesting convention; the values are
the same ones listed in `deploy/cloudrun.env.example.yaml`.

| Key | Value |
|---|---|
| `ASPNETCORE_ENVIRONMENT` | `Production` |
| `ConnectionStrings__Postgres` | Supabase pooler connection string |
| `Supabase__Url` | `https://<project-ref>.supabase.co` |
| `Supabase__ServiceRoleKey` | service_role key |
| `Supabase__JwtSecret` | legacy HS256 secret, or leave unset if the project uses asymmetric keys |
| `Supabase__StorageBucket` | `survey-photos` |
| `Webhooks__SharedSecret` | a long random string |
| `Cors__AllowedOrigins__0` | the deployed frontend origin, e.g. `https://geofold.vercel.app` |

Don't set `PORT` — Render provides it.

## Step 4 — deploy and smoke test
After the first deploy Render gives you a URL like `https://geofold-api.onrender.com`.

```bash
curl https://geofold-api.onrender.com/health          # expect {"status":"ok"}
curl -o /dev/null -w "%{http_code}\n" https://geofold-api.onrender.com/api/v1/projects   # expect 401
```

A `401` on a protected endpoint is the correct result — it proves auth is wired.

## Step 5 — point the frontend at it
In the frontend host (Vercel), set:
- `VITE_API_BASE_URL` = the Render URL
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` = the real Supabase values

Then add the frontend's origin to `Cors__AllowedOrigins__0` on Render and redeploy the API.

## About the free instance sleeping
A free service sleeps after ~15 minutes idle; the next request wakes it (roughly a minute).
Capture is offline-first, so a field user never waits on this — surveys save to the device and
sync in the background. The app also pings `/health` when it opens to start the wake early.

If you want it never to sleep, point an uptime pinger (UptimeRobot, cron-job.org) at `/health`
every 10 minutes, or move to a paid instance.
