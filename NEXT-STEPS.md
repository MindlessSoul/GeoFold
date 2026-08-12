# GeoFold — handoff & roadmap

Context for picking this up in a fresh session: what exists, what's worth doing next, and the
traps that will waste your time if you don't know about them.

Written 2026-08-04.

---

## 1. Where things stand

The stack is **two apps**: a Next.js fullstack web app that is also the API, and an Expo mobile
client that talks to it.

| Part | State |
|---|---|
| `next/` | **The web app and the backend.** Next.js 16 — UI plus API routes, direct SQL against Supabase Postgres/PostGIS, Supabase Storage & Auth. |
| `mobile/` | **Built and working.** Expo SDK 57 / RN 0.86. Implements the Claude Design prototype over that API. Universal release APK builds locally. |
The old ASP.NET Core API (`backend/`), the old Vite SPA (`web/`), their `deploy/` config and the
root `Dockerfile` have been **deleted from the working tree**. The deletions are not staged or
committed — they are still in git history if anything needs recovering.

> **What was rescued on the way out:** the EF migrations in `backend/` were the only definition of
> the database schema, since `next/` only queries and never creates a table. That schema is now
> [`docs/schema.sql`](docs/schema.sql) and is canonical. The JWT-mode decision tree from
> `docs/backend-setup.md` moved into the root README's environment section.

**Nothing is committed.** `README.md` and `next/src/lib/auth.ts` are modified; `mobile/`,
`NEXT-STEPS.md` and `docs/schema.sql` are untracked. Commit before doing anything destructive.

### Mobile stack

```
expo ~57.0.9          react-native 0.86.2       expo-router ~57.0.9
@maplibre/maplibre-react-native ^11.3.6         expo-camera ~57.0.3
expo-location ~57.0.7 expo-file-system ~57.0.1  expo-image-manipulator ~57.0.7
react-native-view-shot 5.1.0                    react-native-svg 15.15.4
expo-linear-gradient ~57.0.1                    @supabase/supabase-js ^2.111.0
@react-native-async-storage/async-storage 2.2.0
```

Screens: Welcome · Sign in/Create account · Map · Projects · Gallery · Profile · Project detail ·
Capture (viewfinder → review) · Photo detail · Sync & backup.

The map uses **MapLibre + OpenFreeMap** — no API key, no Google Cloud account, no card. This was a
deliberate move off `expo-maps`, which needs a billing-enabled Google project.

### One server change already made

`next/src/lib/auth.ts` — `getUserId()` previously only accepted `Authorization: Bearer` when the
legacy HS256 secret was configured, so a mobile client would silently fail on projects using
asymmetric JWT keys. It now verifies under **both** signing modes (HS256, then JWKS). The cookie
path is untouched.

---

## 2. Traps that will cost you an hour each

- **Do not build Android with JDK 25.** Android Studio bundles it now. The build dies at
  `:react-native-screens:configureCMakeRelWithDebInfo` on *"a restricted method in
  java.lang.System has been called"* — JEP 472 warning that AGP treats as fatal. Use **JDK 17**;
  Gradle keeps one at `~/.gradle/jdks/eclipse_adoptium-17-*`. Point Android Studio's Gradle JDK at
  it, or `npx expo run:android` will keep failing.
- **Expo Go cannot run this app.** `react-native-view-shot` and MapLibre resolve native modules at
  import and throw when absent. They're loaded lazily via `mobile/src/lib/native.ts` so the app
  degrades instead of crashing, but a dev build is required for real use.
- **`.env.local` changes need `npx expo start --clear`.** `EXPO_PUBLIC_*` is inlined at transform
  time and Metro's cache is keyed on file contents, not the environment. Symptom: app stays in
  demo mode after you've configured it.
- **`mobile/android/` shadows `app.json`.** Once prebuild has generated it, plugin changes don't
  apply until you re-run `prebuild --clean`. It's gitignored; delete it to return to managed flow.
- **Release APK is signed with the debug keystore** (Expo template default). Sideloads fine,
  Play Store rejects it.
- **Demo mode state is in memory** — created projects and captures vanish on reload.
- **Route collision:** never put a screen at `app/index.tsx` while `app/(tabs)/index.tsx` exists.
  Both resolve to `/` and navigation silently stops working. Welcome lives at `app/welcome.tsx`
  for this reason.

---

## 3. Google login (and other OAuth)

Worth doing, and **free** — unlike Maps, Google OAuth clients cost nothing and need no billing
account. Supabase Auth already supports it; the app just doesn't use it.

Two implementation routes:

**A. Supabase OAuth via browser redirect** — least code.
`supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: 'geofold://auth' } })`
plus `expo-web-browser` + `expo-linking`. The `geofold` scheme is already set in `app.json`.
Downside: bounces through a browser tab, which feels less native.

**B. Native Google Sign-In** — better UX, more setup.
`@react-native-google-signin/google-signin` → get an ID token → `supabase.auth.signInWithIdToken({
provider: 'google', token })`. Shows the native account picker. Needs SHA-1 fingerprints registered
in Google Cloud for **each** signing key (debug and release — easy to forget).

Setup either way: Google Cloud project → OAuth consent screen → OAuth client IDs (Android + Web) →
paste the Web client ID + secret into Supabase Dashboard → Authentication → Providers → Google.

**Also missing on the auth screen:**

- Password reset — the app currently tells people to use the web app. `resetPasswordForEmail` +
  a deep link would close that.
- Apple Sign-In — *required by App Store review* if you ship any other social login on iOS.
  `expo-apple-authentication` + `signInWithIdToken`.
- Biometric unlock for re-entry (`expo-local-authentication`).
- The design's "Continue with company SSO" button was deliberately omitted — no backend support.
  Supabase SSO (SAML) is a paid plan feature.

---

## 4. Database — free options, and the constraint that rules most of them out

**The constraint: this app is geospatial.** Surveys are stored as `geography(point, 4326)` and the
map feed uses `ST_Intersects` against a bounding box. Anything without PostGIS means either
rewriting that in application code or losing server-side spatial queries.

| Option | Free tier | PostGIS | Auth | Storage | Verdict |
|---|---|---|---|---|---|
| **Supabase** | yes | ✅ | ✅ | ✅ | **Stay here.** Only option covering all three, and the code already targets it. |
| Neon | yes | ✅ | ✗ | ✗ | Good Postgres. You'd add auth + file storage separately. |
| Self-hosted Postgres + PostGIS | VPS cost | ✅ | ✗ | ✗ | Full control, no free tier, you run it. |
| PocketBase | self-host | ✗ (SQLite) | ✅ | ✅ | One binary, auth + storage + DB. Loses spatial SQL. |
| Appwrite Cloud | yes | ✗ | ✅ | ✅ | Complete BaaS, no real geo support. |
| Firebase | yes | ✗ | ✅ | ✅ | Geo queries need geohash workarounds. Big rewrite. |
| Turso / Cloudflare D1 | generous | ✗ | ✗ | ✗ | SQLite. Great for edge, wrong shape for this. |

**Recommendation: stay on Supabase free.** It's the only one that gives Postgres + PostGIS + Auth +
Storage together, and every query in `next/src/lib/` is already written against it. Switching costs
a rewrite and buys nothing while usage is small.

Free-tier limits change — check current numbers before relying on them. The one that actually bites
in practice: **free projects pause after a period of inactivity** and need waking from the
dashboard. For a demo that's an annoyance; for anything customer-facing it's a reason to upgrade or
self-host.

If Supabase ever has to go, the least painful path is **Neon** (Postgres + PostGIS, so the SQL
survives) plus Supabase-compatible auth, or self-hosting the whole stack on a small VPS.

---

## 5. Improvements worth making

Roughly in order of value.

### High

- **Persist demo state** — back the in-memory store in `mobile/src/lib/demo.ts` with AsyncStorage
  so a reload doesn't wipe it. Currently makes the demo look broken.
- **Google login** — see above.
- **Multiple photos per survey.** The server and schema already support it; the capture UI does
  one. The design's checklist concept assumed several.
- **Background sync.** Sync currently runs on launch, foreground and reconnect. `expo-background-task`
  would drain the outbox while the app is closed.
- **Real keystore** before any distribution.

### Medium

- **Heading in the stamp** — the design shows `heading N 38°`; `expo-location`'s
  `watchHeadingAsync` provides it. Currently only coordinates, accuracy and time are burned in.
- **Marker clustering** at low zoom — MapLibre supports it via `GeoJSONSource` with `cluster`.
- **Offline map tiles** — MapLibre ships an `OfflineManager`. Genuinely useful for a field app in a
  dead zone, and currently unused.
- **Search and filters** in Gallery and Projects.
- **Edit / delete a survey** after capture. The API supports upsert; there's no UI.
- **Export CSV/XLSX from mobile.** `next/src/lib/export.ts` has a dependency-free implementation
  that could be ported.
- **Draft persistence** — if the app dies during the review form, the photo and form are lost.

### Lower

- **Tests.** Neither app has any. The only tests in the repo were xUnit tests in the retired
  `backend/`, and they go with it. `next/src/lib/validation.ts` and `quota.ts` are pure logic and
  the obvious first candidates.
- **Error reporting** (Sentry or similar) — currently a crash in the field leaves no trace.
- **i18n.** The UI is English but field labels are Indonesian (`Catatan`). Pick one or make it real.
- **App icon and splash** are still Expo defaults.
- **CI** — nothing builds or checks automatically.
- **APK size.** Universal APK is ~129 MB because native libs are stored uncompressed across four
  ABIs. ABI splits would give ~53 MB for phones (`arm64-v8a`) plus a separate emulator build.
  Deliberately universal right now so it installs anywhere.

---

## 6. Build commands

```bash
cd mobile && npx expo start --web
```

```bash
cd mobile/android && JAVA_HOME="$USERPROFILE/.gradle/jdks/eclipse_adoptium-17-amd64-windows.2" ANDROID_HOME="$LOCALAPPDATA/Android/Sdk" ./gradlew assembleRelease
```

APK: `mobile/android/app/build/outputs/apk/release/app-release.apk`

`mobile/eas.json` also has `preview`/`development` profiles pinned to APK output for cloud builds —
needs `eas login` and `EXPO_PUBLIC_*` supplied via `eas env:create`, since `.env.local` is
gitignored and never reaches EAS.

Checks: `npx tsc --noEmit` · `npm run lint` · `npx expo-doctor`
