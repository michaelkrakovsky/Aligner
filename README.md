# Aligner

A living map of how your business actually works.

## Run locally
1. Install Node.js 20 or newer.
2. `npm install`
3. `cp .env.example .env.local` and fill in the keys (see Supabase setup below).
4. `npm run dev` and open http://localhost:3000

## Supabase setup (accounts and saved journeys)
1. Create a project at supabase.com.
2. In the SQL editor, run `supabase/migrations/20261114000000_maps.sql`.
3. Project Settings > API: copy the project URL and the publishable (or anon) key into
   `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
4. Authentication > URL Configuration: set the Site URL to your production URL and add
   these redirect URLs:
   - `http://localhost:3000/auth/callback`
   - `https://<your-production-domain>/auth/callback`
   - `https://*-<your-vercel-team>.vercel.app/auth/callback` (preview deploys)
5. Google sign in: in Google Cloud Console, create an OAuth client (Web application) with
   the authorized redirect URI shown under Authentication > Sign In / Providers > Google
   (`https://<project-ref>.supabase.co/auth/v1/callback`). Paste its client ID and secret
   into that Google provider and enable it.

## Deploy
Vercel deploys a preview for every PR and production from `main`. Add
`ANTHROPIC_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
under Project Settings > Environment Variables (Production and Preview), then redeploy.

## Google Docs linking (optional)
People can link Google Docs to map steps. Aligner asks only for `drive.file`: access to the
docs each person picks in Google's file picker, which Aligner only reads (title, link, last edit).
1. In Supabase's SQL editor, run `supabase/migrations/20261115000000_google_connections.sql`.
2. In Google Cloud Console (the Aligner project):
   - APIs & Services > Library: enable **Google Drive API** and **Google Picker API**.
   - Google Auth Platform > Data access: add the `.../auth/drive.file` scope.
   - Google Auth Platform > Clients > your web client: add authorized redirect URIs
     `https://<your-production-domain>/api/google/callback` and
     `http://localhost:3000/api/google/callback`. Google doesn't allow wildcards, so preview
     deploys can't connect Google Docs.
   - APIs & Services > Credentials: create an **API key**, restrict it to the Google Picker API
     and to your site's address (HTTP referrers).
   - The **project number** (on the project dashboard) is the app ID.
3. Add to Vercel (and `.env.local`): `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
   `GOOGLE_TOKEN_ENCRYPTION_KEY`, `NEXT_PUBLIC_GOOGLE_API_KEY`, `NEXT_PUBLIC_GOOGLE_APP_ID`.
   Then redeploy.
