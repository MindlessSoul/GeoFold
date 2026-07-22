# Deploying the GeoFold API to Cloud Run

The Dockerfile at the repo root builds the API. Cloud Build compiles the image in the cloud —
you don't need Docker installed locally.

## One-time setup
1. Install the gcloud CLI, then:
   ```bash
   gcloud auth login
   gcloud config set project YOUR_PROJECT_ID
   gcloud services enable run.googleapis.com cloudbuild.googleapis.com
   ```

## Configure secrets
2. Copy the env template and fill in real values (this file is gitignored):
   ```bash
   cp deploy/cloudrun.env.example.yaml deploy/cloudrun.env.yaml
   ```
   The values with special characters (the connection string has `;` and `=`) are why we use a
   YAML file instead of inline `--set-env-vars`.

## Deploy
3. From the repo root:
   ```bash
   gcloud run deploy geofold-api \
     --source . \
     --region asia-northeast3 \
     --allow-unauthenticated \
     --max-instances 3 \
     --env-vars-file deploy/cloudrun.env.yaml
   ```

Notes:
- **Region `asia-northeast3` (Seoul)** matches the Supabase project's region, so DB round-trips
  stay fast. If you move Supabase to Singapore, use `asia-southeast1` here too.
- **`--allow-unauthenticated`** is correct: the API does its own JWT auth, so Cloud Run's IAM
  layer stays off. Requests still need a valid Supabase token.
- **`--max-instances 3`** is the billing safety cap — a traffic flood can't scale you into a huge
  bill; excess requests just get rejected.
- Real keys live only in Cloud Run env vars, never in the image or git.

## After deploy
- Cloud Run prints a URL like `https://geofold-api-xxxx.a.run.app`. Put that in the frontend's
  `VITE_API_BASE_URL`, and add the frontend's URL to `Cors__AllowedOrigins__0` here, then redeploy.
- Run the migration against the DB once (from your machine, with the production connection string):
  `dotnet ef database update` — or it's already applied if you did this earlier.

## More secure (optional)
Instead of env vars, store secrets in Secret Manager and reference them with
`--set-secrets Supabase__ServiceRoleKey=geofold-service-role:latest` etc.
