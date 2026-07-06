# Deployment

Two moving parts: a Postgres database (Supabase) and the Next.js dashboard
(Vercel). The Python pipeline runs wherever you can reach the database — locally
or in CI — and writes results Supabase serves to the dashboard.

## 1. Database — Supabase

1. Create a Supabase project.
2. Copy the connection string from **Project Settings → Database → Connection
   string**. Use the **Transaction pooler** string for serverless/Vercel
   (`...pooler.supabase.com:6543/...`), which appends `sslmode=require`.
3. Point the pipeline at it and run the build:

   ```bash
   cd pipeline
   export DATABASE_URL="postgresql://postgres.<ref>:<pw>@<host>:6543/postgres?sslmode=require"
   athena generate
   athena build
   ```

   The warehouse and all result tables now live in Supabase.

## 2. Dashboard — Vercel

1. Import the GitHub repository into Vercel.
2. Set **Root Directory** to `web` (the Next.js app is not at the repo root).
3. Add environment variables:
   - `DATABASE_URL` — the same Supabase connection string.
   - `NEXT_PUBLIC_MODULE` — `placement`.
4. Deploy. The pages are `force-dynamic`, so each request reads live from
   Postgres; the client (`lib/db.ts`) enables SSL automatically for Supabase.

## Refreshing the data

Re-running `athena build` recomputes every result table in place
(idempotent — the schema is rebuilt and result tables are truncated and
repopulated). No dashboard redeploy is needed; the next request reflects the new
numbers.

## Local development

```bash
# Postgres reachable at $DATABASE_URL, then:
cd pipeline && athena all          # generate + full build
cd ../web && cp .env.example .env.local   # set DATABASE_URL, then:
npm install && npm run dev
```
