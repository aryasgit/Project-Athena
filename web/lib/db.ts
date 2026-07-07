import postgres from "postgres";

/**
 * Single shared Postgres client. Works against a local Postgres or Supabase.
 * On Vercel use the Supabase pooled ("Transaction") connection string.
 */
declare global {
  // eslint-disable-next-line no-var
  var __athenaSql: ReturnType<typeof postgres> | undefined;
}

function create() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    // Allow the app to build without a database configured.
    return null;
  }
  // Require SSL for managed/hosted databases (Supabase, sslmode=require),
  // but not for a local Postgres or a unix socket.
  const needsSsl = /supabase|sslmode=require/.test(url);
  // Supabase's transaction pooler (pgbouncer) does not support prepared
  // statements, so disable them when talking to a pooler.
  const isPooler = /pooler\.supabase|pgbouncer/.test(url);
  return postgres(url, {
    max: 5,
    idle_timeout: 20,
    ssl: needsSsl ? "require" : false,
    prepare: isPooler ? false : undefined,
  });
}

export const sql = global.__athenaSql ?? create();
if (process.env.NODE_ENV !== "production") global.__athenaSql = sql ?? undefined;

export const MODULE = process.env.NEXT_PUBLIC_MODULE ?? "placement";
