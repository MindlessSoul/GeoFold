# GeoFold Backend — Setup & Verification

Run from `backend/src/GeoFold.Api` unless stated otherwise.

## 1. Configure secrets (never commit these)

Real keys go in **user-secrets**, stored outside the repo. `appsettings.json` is a git-tracked
template and must keep its empty placeholders.

```bash
dotnet user-secrets set "Supabase:Url" "https://<project-ref>.supabase.co"
dotnet user-secrets set "Supabase:ServiceRoleKey" "<service_role key>"
dotnet user-secrets set "ConnectionStrings:Postgres" "<postgres connection string>"
```

Where to find them in the Supabase dashboard:
- `Url` and `ServiceRoleKey` → **Settings → API**
- connection string → **Settings → Database** (use the connection-pooler string for apps)

> ⚠️ `service_role` bypasses row-level security. Backend only — it must never reach the SPA.
> The SPA uses the **anon/publishable** key.

## 2. Decide the JWT mode

This decides whether you set `Supabase:JwtSecret` at all. The JWKS document is public, so you can
just look:

```bash
curl -s https://<project-ref>.supabase.co/auth/v1/.well-known/jwks.json
```

- **Returns keys** (`"alg":"ES256"` or `"RS256"`) → asymmetric signing keys.
  **Leave `Supabase:JwtSecret` unset.** The API resolves signing keys from JWKS and picks up
  rotation automatically. This is what Supabase recommends.
- **Returns `{"keys":[]}` or nothing** → the project still uses the legacy HS256 shared secret:
  ```bash
  dotnet user-secrets set "Supabase:JwtSecret" "<legacy JWT secret>"
  ```

Note: `Supabase:JwtSecret` must be either a real secret or absent. A blank value is treated as
"not set" (`UseLegacySharedSecret` guards on whitespace) — an empty string previously built a
zero-length key and made every authenticated request fail with IDX10703.

## 3. Enable PostGIS, then apply migrations

Surveys and photos are stored as `geography(point)`, so **PostGIS must exist before migrating**.
In the Supabase SQL editor:

```sql
create extension if not exists postgis;
```

Then:

```bash
dotnet ef database update
```

`pgcrypto` is declared by the model and created by the migration; PostGIS is not.

## 4. Smoke test

```bash
dotnet run
```

Swagger (Development only): `https://localhost:7231/swagger`

**a. Unauthenticated request must be 401** (not 500 — a 500 here means auth config is broken):

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5234/api/v1/projects
```

**b. The one call that proves the system is alive.** Get an access token by signing in (Supabase
JS `signInWithPassword`, or the dashboard), then:

```bash
curl -s -H "Authorization: Bearer <access_token>" http://localhost:5234/api/v1/subscriptions/me
```

A `200` with `plan` / `limits` / `usage` proves four things at once: JWKS (or HS256) validation
works, the DB connection works, quota computation works, and the user is resolved from the token.

Expected shape:

```json
{
  "plan": "free", "status": "canceled", "isActive": false, "currentPeriodEndUtc": null,
  "limits": { "maxProjects": 3, "maxSurveysPerMonth": 100, "storageQuotaMb": 500 },
  "usage":  { "projects": 0, "surveysThisMonth": 0, "storageMb": 0 }
}
```

`null` in `limits` means unlimited on that dimension.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| `500` on every API call | Auth config. Check `Supabase:JwtSecret` is a real secret or absent, never blank. |
| `401` with a token you believe is valid | Wrong JWT mode (step 2), or `iss` mismatch — the token's `iss` must equal `<Url>/auth/v1`. |
| `type "geography" does not exist` on migrate | PostGIS not enabled (step 3). |
| Startup succeeds but config is obviously wrong | Known gap: `SupabaseConfigurationGuard` does not fire yet. Do not rely on it to catch misconfiguration. |

## Running tests

```bash
cd backend && dotnet test
```

These are pure-logic tests only — they touch no database and no real token.
