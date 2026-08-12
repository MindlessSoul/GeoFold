# GeoFold — TODO

Actionable checklist. Longer-term roadmap and traps live in [`NEXT-STEPS.md`](NEXT-STEPS.md).

Last updated 2026-08-10.

---

## 🚦 Blocking — before the subscription/premium feature works in production

The code (quota model, activation keys, Midtrans QRIS) is written and typechecks, but it needs
these one-time setup steps that can only be done with live credentials / DB access:

- [ ] **Run the DB migration.** Apply [`docs/migration-002-subscription.sql`](docs/migration-002-subscription.sql)
      against the Supabase database (creates `usage_daily`, `activation_keys`,
      `activation_key_redemptions`, `payments`; extends `subscriptions`).
- [ ] **Set Midtrans env** (see [`next/.env.example`](next/.env.example) / [`next/DEPLOY.md`](next/DEPLOY.md)):
      `MIDTRANS_SERVER_KEY`, `MIDTRANS_IS_PRODUCTION`, `PREMIUM_PRICE_IDR`, `PREMIUM_DAYS`.
- [ ] **Set the Midtrans Payment Notification URL** →
      `https://<domain>/api/payments/midtrans/webhook`.
- [ ] **Activation-key generation.** There is no generator yet. Keys are stored only as
      `sha256(plaintext)` in `activation_keys."KeyHash"`. Build a small admin script/route that
      inserts a row and prints the plaintext once, or insert rows by hand.

## ⚠️ Confirm these placeholder values (product decisions, not from any spec)

- [ ] **Daily caps** in [`next/src/lib/quota.ts`](next/src/lib/quota.ts): `FREE_DAILY_SURVEYS = 30`,
      `FREE_DAILY_PHOTOS = 60`. Guessed defaults — set to your real numbers.
- [ ] **Price / duration**: `PREMIUM_PRICE_IDR = 49000`, `PREMIUM_DAYS = 30`. The pricing page
      ([`next/src/app/(marketing)/pricing/page.tsx`](next/src/app/(marketing)/pricing/page.tsx))
      shows "Rp 49.000/mo" — keep it in sync.
- [ ] **Free project rule** is implemented as: first 3 projects free, then +1 per 24h cooldown for
      the 4th onward. Confirm that matches intent.

## 🧹 Code cleanup found during audit

- [ ] **Retire or fix the generic webhook.**
      [`next/src/app/api/webhooks/[provider]/route.ts`](next/src/app/api/webhooks/[provider]/route.ts)
      predates the new model: it sets `Plan='premium'` but not `WorkspaceType`/`PremiumUntilUtc`, so
      under the new quota logic it would **not** actually grant premium. It's superseded by the
      Midtrans webhook + activation keys. Either delete it (and `WEBHOOKS_SHARED_SECRET`) or route it
      through `grantPremiumDays`.

## 📦 Repo / git housekeeping (see "Push status" below)

- [ ] **Resolve the remote.** `origin` (`MindlessSoul/GeoFold`) returns *"Repository not found"* — the
      work cannot be pushed until the correct/accessible remote URL is set and credentials exist.
- [ ] **Do not commit `env.zip`** (added to `.gitignore`). Rotate anything inside it if it was ever
      shared, and delete the file once its contents are safe elsewhere.
- [ ] **Commit the migration.** The working tree still holds the whole uncommitted `backend/`→
      `next/`+`mobile/` migration (see `NEXT-STEPS.md`). Decide commit scope before pushing.

## ✅ Done in the last sessions (for reference)

- Web map: draggable markers, edit-coordinates popup, ruler/measure, satellite/street basemap.
- `PATCH /api/surveys/[id]` to edit coordinates.
- Mobile: satellite basemap, hidden project card, manual coordinate entry.
- Gallery per-project/folder filter.
- `/reset` restyled to brand; pricing page on the free/premium model.
- New subscription/quota model end-to-end (see the Blocking section for go-live steps).

---

## Later / roadmap

See [`NEXT-STEPS.md`](NEXT-STEPS.md) for the full backlog (Google login is now partly wired,
persist demo state, multiple photos per survey, background sync, tests, etc.).
