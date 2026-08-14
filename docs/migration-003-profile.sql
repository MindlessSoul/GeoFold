-- GeoFold migration 003 — user profile fields (onboarding)
--
-- Additive only. Collected once after first sign-in (email or OAuth), so every account has a
-- name + contact number. Occupation is optional; the rest gate access until filled.
-- A profile is "complete" when FullName, WhatsappNumber, Domicile and Gender are all set.

begin;

alter table profiles
  add column if not exists "FullName"              text,
  add column if not exists "WhatsappNumber"        text,
  add column if not exists "Domicile"              text,
  add column if not exists "Gender"                text,
  add column if not exists "Occupation"            text,
  add column if not exists "ProfileCompletedAtUtc" timestamptz,
  -- Legal record: the moment the user ticked "I agree to the Privacy Policy & Terms".
  add column if not exists "AgreedTermsAtUtc"      timestamptz;

commit;
