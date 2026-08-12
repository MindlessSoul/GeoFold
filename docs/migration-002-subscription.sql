-- GeoFold migration 002 — workspace tiers, activation keys, Midtrans/QRIS, usage limits
--
-- Run AFTER docs/schema.sql and docs/rls.sql, against the same database.
-- Additive only: no existing column is dropped or retyped, so the current app keeps working
-- while the new quota code is written against these tables.
--
-- MODEL DECISION (replaces the old free tier, per product direction):
--   free    = 3 projects, +1 project per 24h, 20 photos per project,
--             plus daily caps on surveys captured and photos uploaded
--   premium = unlimited on every axis, while PremiumUntilUtc is in the future
-- The old "100 surveys/month" and "500 MB storage" limits are retired.

begin;

-- ---------------------------------------------------------------------------
-- 1. Workspace tier
-- The existing `subscriptions` row (one per user) IS the workspace — extending it
-- rather than inventing a parallel entity keeps every current query valid.
-- ---------------------------------------------------------------------------
alter table subscriptions
  add column if not exists "WorkspaceType" text not null default 'free',
  add column if not exists "PremiumUntilUtc" timestamptz,
  -- When a premium workspace lapses while over the free limits, the workspace is frozen:
  -- reads still work, but every write is refused until it is back under the free ceiling.
  add column if not exists "FrozenAtUtc" timestamptz;

do $$ begin
  alter table subscriptions
    add constraint subscriptions_workspacetype_check
    check ("WorkspaceType" in ('free', 'premium'));
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- 2. Activation keys
-- Keys are stored as a SHA-256 hash, never in plain text: a leaked database dump
-- must not hand out free premium. The plaintext key is shown once at generation.
-- ---------------------------------------------------------------------------
create table if not exists activation_keys (
  "Id"            uuid primary key default gen_random_uuid(),
  "KeyHash"       text        not null unique,
  -- Human-readable prefix (e.g. GF-2026-XXXX) for support lookups without the secret.
  "Label"         text,
  "GrantsDays"    integer     not null check ("GrantsDays" > 0),
  "MaxRedemptions" integer    not null default 1 check ("MaxRedemptions" > 0),
  "Redemptions"   integer     not null default 0,
  "ExpiresAtUtc"  timestamptz,
  "RevokedAtUtc"  timestamptz,
  "CreatedAtUtc"  timestamptz not null default now()
);

create index if not exists activation_keys_keyhash_idx on activation_keys ("KeyHash");

-- Ledger: who redeemed what, when. Unique on (key, user) so one account cannot
-- redeem the same key twice to stack days.
create table if not exists activation_key_redemptions (
  "Id"           uuid primary key default gen_random_uuid(),
  "KeyId"        uuid        not null references activation_keys ("Id") on delete restrict,
  "UserId"       uuid        not null references profiles ("Id") on delete restrict,
  "GrantedDays"  integer     not null,
  "RedeemedAtUtc" timestamptz not null default now(),
  unique ("KeyId", "UserId")
);

create index if not exists activation_key_redemptions_user_idx
  on activation_key_redemptions ("UserId");

-- ---------------------------------------------------------------------------
-- 3. Midtrans / QRIS payments
-- One row per payment attempt. ProviderOrderId is what we send to Midtrans and what
-- comes back on the webhook, so it must be unique for idempotent settlement.
-- ---------------------------------------------------------------------------
create table if not exists payments (
  "Id"              uuid primary key default gen_random_uuid(),
  "UserId"          uuid        not null references profiles ("Id") on delete restrict,
  "Provider"        text        not null default 'midtrans',
  "ProviderOrderId" text        not null unique,
  "ProviderTxnId"   text,
  "Method"          text        not null default 'qris',
  "AmountIdr"       bigint      not null check ("AmountIdr" > 0),
  "GrantsDays"      integer     not null check ("GrantsDays" > 0),
  -- pending -> settled | expired | denied | refunded. Only 'settled' extends premium.
  "Status"          text        not null default 'pending',
  "QrUrl"           text,
  "RawPayload"      jsonb,
  "CreatedAtUtc"    timestamptz not null default now(),
  "SettledAtUtc"    timestamptz
);

do $$ begin
  alter table payments add constraint payments_status_check
    check ("Status" in ('pending', 'settled', 'expired', 'denied', 'refunded'));
exception when duplicate_object then null; end $$;

create index if not exists payments_user_idx on payments ("UserId", "CreatedAtUtc" desc);

-- ---------------------------------------------------------------------------
-- 4. Daily usage counters
-- One row per user per UTC day. Incremented on write; read by the quota checks.
-- A counter table beats COUNT(*) over surveys once a workspace has real volume.
-- ---------------------------------------------------------------------------
create table if not exists usage_daily (
  "UserId"        uuid  not null references profiles ("Id") on delete cascade,
  "Day"           date  not null,
  "SurveysCount"  integer not null default 0,
  "PhotosCount"   integer not null default 0,
  primary key ("UserId", "Day")
);

-- ---------------------------------------------------------------------------
-- 5. Per-project photo cap support
-- The 20-photo free cap counts photos through their survey's project. This index
-- makes that count cheap; the rule itself lives in quota.ts.
-- ---------------------------------------------------------------------------
create index if not exists survey_photos_survey_idx on survey_photos ("SurveyId");
create index if not exists surveys_project_idx on surveys ("ProjectId");

-- Project creation cooldown reads the newest project per user.
create index if not exists projects_user_created_idx
  on projects ("UserId", "CreatedAtUtc" desc);

-- ---------------------------------------------------------------------------
-- 6. RLS — same posture as docs/rls.sql: deny anon, owner-only for authenticated.
-- Server writes go through the `postgres` role, which bypasses RLS.
-- ---------------------------------------------------------------------------
alter table activation_keys            enable row level security;
alter table activation_key_redemptions enable row level security;
alter table payments                   enable row level security;
alter table usage_daily                enable row level security;

revoke all on activation_keys, activation_key_redemptions, payments, usage_daily from anon;

-- Deliberately NO policy on activation_keys: clients must never enumerate keys.
-- Redemption happens server-side only, so RLS-enabled + no policy = closed to all clients.

drop policy if exists "own redemptions" on activation_key_redemptions;
create policy "own redemptions" on activation_key_redemptions
  for select to authenticated using ((select auth.uid()) = "UserId");

drop policy if exists "own payments" on payments;
create policy "own payments" on payments
  for select to authenticated using ((select auth.uid()) = "UserId");

drop policy if exists "own usage" on usage_daily;
create policy "own usage" on usage_daily
  for select to authenticated using ((select auth.uid()) = "UserId");

commit;

-- VERIFY
--   select relname, relrowsecurity from pg_class
--   where relname in ('activation_keys','activation_key_redemptions','payments','usage_daily');
