-- GeoFold database schema
-- ============================================================================
-- Transcribed from the EF Core migrations that used to live in backend/, with
-- both migrations applied (InitialCreate + AlignToSpec_RestrictDeletes_FormSchema_Quota).
--
-- This file is now the CANONICAL schema. The .NET backend has been retired, and next/ only ever
-- queries — it never creates a table — so without this there would be no way to rebuild the
-- database from source.
--
-- Identifiers are quoted PascalCase because that is what EF generated and what every query in
-- next/src/lib/ expects (e.g. s."Id", p."FormSchema"). Do not "tidy" them to snake_case without
-- rewriting those queries.
--
-- Run against a fresh Supabase/Postgres database. PostGIS must exist before the point columns
-- can be created, which is why it comes first.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- profiles — one row per Supabase auth user. Created on first write by
-- next/src/lib/profile.ts (ensureProfile), not by a trigger.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
    "Id"           uuid PRIMARY KEY,
    "DisplayName"  text NULL,
    "Role"         text NOT NULL,
    "CreatedAtUtc" timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- projects — a survey campaign. FormSchema is the JSON array of field
-- definitions the capture form renders and the server validates against.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS projects (
    "Id"            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "UserId"        uuid NOT NULL,
    "Name"          text NOT NULL,
    "Description"   text NULL,
    "FormSchema"    jsonb NOT NULL DEFAULT '[]'::jsonb,
    "CreatedAtUtc"  timestamp with time zone NOT NULL DEFAULT now(),
    "ArchivedAtUtc" timestamp with time zone NULL,
    CONSTRAINT "FK_projects_profiles_UserId"
        FOREIGN KEY ("UserId") REFERENCES profiles ("Id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "IX_projects_UserId" ON projects ("UserId");

-- ---------------------------------------------------------------------------
-- subscriptions — plan state. The three nullable quota columns are per-user
-- overrides; NULL means "fall back to the plan default" (see next/src/lib/quota.ts).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS subscriptions (
    "Id"                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "UserId"              uuid NOT NULL,
    "Plan"                text NOT NULL,
    "Status"              text NOT NULL,
    "Provider"            text NOT NULL,
    "ProviderRef"         text NULL,
    "CurrentPeriodEndUtc" timestamp with time zone NULL,
    "UpdatedAtUtc"        timestamp with time zone NOT NULL,
    "MaxProjects"         integer NULL,
    "MaxSurveysPerMonth"  integer NULL,
    "StorageQuotaMb"      integer NULL,
    CONSTRAINT "FK_subscriptions_profiles_UserId"
        FOREIGN KEY ("UserId") REFERENCES profiles ("Id") ON DELETE RESTRICT
);

CREATE UNIQUE INDEX IF NOT EXISTS "IX_subscriptions_UserId" ON subscriptions ("UserId");

-- ---------------------------------------------------------------------------
-- surveys — one captured point.
--
-- "Id" has NO default: the client generates it so the upsert is idempotent and
-- a retry after a dropped connection cannot create a duplicate point.
--
-- Deletes are RESTRICT, not CASCADE, throughout. Survey data is evidence — the
-- schema refuses to let a project deletion quietly take points with it.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS surveys (
    "Id"             uuid PRIMARY KEY,
    "ProjectId"      uuid NOT NULL,
    "UserId"         uuid NOT NULL,
    "Location"       geography(Point, 4326) NOT NULL,
    "AccuracyMeters" double precision NULL,
    "CapturedAtUtc"  timestamp with time zone NOT NULL,
    "SyncedAtUtc"    timestamp with time zone NOT NULL DEFAULT now(),
    "Details"        jsonb NULL,
    "Status"         text NOT NULL,
    CONSTRAINT "FK_surveys_projects_ProjectId"
        FOREIGN KEY ("ProjectId") REFERENCES projects ("Id") ON DELETE RESTRICT,
    CONSTRAINT "FK_surveys_profiles_UserId"
        FOREIGN KEY ("UserId") REFERENCES profiles ("Id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "IX_surveys_ProjectId" ON surveys ("ProjectId");
CREATE INDEX IF NOT EXISTS "IX_surveys_UserId"    ON surveys ("UserId");

-- GIST, not btree — this is what makes the map's ST_Intersects bounding-box
-- query in /api/surveys/geojson usable.
CREATE INDEX IF NOT EXISTS "IX_surveys_Location" ON surveys USING GIST ("Location");

-- ---------------------------------------------------------------------------
-- survey_photos — StoragePath points into the private Supabase Storage bucket
-- and is always server-constructed as <userId>/<surveyId>/<photoId>.<ext>.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS survey_photos (
    "Id"            uuid PRIMARY KEY,
    "SurveyId"      uuid NOT NULL,
    "StoragePath"   text NOT NULL,
    "Location"      geography(Point, 4326) NOT NULL,
    "CapturedAtUtc" timestamp with time zone NOT NULL,
    "Width"         integer NULL,
    "Height"        integer NULL,
    "SizeBytes"     bigint NULL,
    "UploadStatus"  text NOT NULL,
    CONSTRAINT "FK_survey_photos_surveys_SurveyId"
        FOREIGN KEY ("SurveyId") REFERENCES surveys ("Id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "IX_survey_photos_SurveyId" ON survey_photos ("SurveyId");

-- ---------------------------------------------------------------------------
-- Also required, and NOT created by this file:
--   * a private Storage bucket named `survey-photos`
-- ---------------------------------------------------------------------------
