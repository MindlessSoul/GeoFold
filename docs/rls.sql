-- GeoFold — Row Level Security
--
-- WHY THIS IS REQUIRED
-- NEXT_PUBLIC_SUPABASE_ANON_KEY is shipped to every browser, and Supabase exposes tables
-- in the `public` schema through PostgREST. With RLS disabled, anyone who copies that key
-- out of devtools can read AND write every user's rows directly at
--   https://<project-ref>.supabase.co/rest/v1/surveys?select=*
-- bypassing the Next.js API and all of its "UserId" filtering entirely.
--
-- SAFE TO APPLY
-- The app's own queries connect as the `postgres` role via the pooler (see lib/db.ts),
-- and that role has BYPASSRLS — so enabling RLS does NOT change how the API behaves.
-- It only closes the direct-PostgREST hole.
--
-- Run this against the same database as docs/schema.sql.

alter table profiles      enable row level security;
alter table projects      enable row level security;
alter table surveys       enable row level security;
alter table survey_photos enable row level security;
alter table subscriptions enable row level security;

-- Belt and braces: RLS is the gate, but don't hand the anonymous role table rights either.
revoke all on profiles, projects, surveys, survey_photos, subscriptions from anon;

drop policy if exists "own profile" on profiles;
create policy "own profile" on profiles
  for all to authenticated
  using ((select auth.uid()) = "Id")
  with check ((select auth.uid()) = "Id");

drop policy if exists "own projects" on projects;
create policy "own projects" on projects
  for all to authenticated
  using ((select auth.uid()) = "UserId")
  with check ((select auth.uid()) = "UserId");

drop policy if exists "own surveys" on surveys;
create policy "own surveys" on surveys
  for all to authenticated
  using ((select auth.uid()) = "UserId")
  with check ((select auth.uid()) = "UserId");

-- Photos inherit ownership from their survey.
drop policy if exists "own survey photos" on survey_photos;
create policy "own survey photos" on survey_photos
  for all to authenticated
  using (exists (
    select 1 from surveys s
    where s."Id" = survey_photos."SurveyId" and s."UserId" = (select auth.uid())
  ))
  with check (exists (
    select 1 from surveys s
    where s."Id" = survey_photos."SurveyId" and s."UserId" = (select auth.uid())
  ));

-- Read-only for users: subscription rows are written by the webhook (postgres role,
-- which bypasses RLS). A client must never be able to grant itself a plan.
drop policy if exists "read own subscription" on subscriptions;
create policy "read own subscription" on subscriptions
  for select to authenticated
  using ((select auth.uid()) = "UserId");

-- VERIFY: with the anon key and no session, each of these must return zero rows,
-- and every table must show rowsecurity = true.
--   select relname, relrowsecurity from pg_class
--   where relname in ('profiles','projects','surveys','survey_photos','subscriptions');
