"use strict";

/**
 * Ensure the API's migration and runtime connections target the Supabase
 * project configured for Auth/Storage. This does not connect to the database
 * or print URLs, usernames, passwords, or tokens.
 *
 * Supabase pooler URLs carry the project ref in the username
 * (postgres.<ref>); direct URLs carry it in db.<ref>.supabase.co.
 */
function projectRefFromSupabaseUrl(raw) {
  if (!raw) return null;
  try {
    const host = new URL(raw).hostname.toLowerCase();
    return /^([a-z0-9-]+)\.supabase\.co$/.exec(host)?.[1] ?? null;
  } catch {
    return null;
  }
}

function projectRefFromDatabaseUrl(raw) {
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    const host = parsed.hostname.toLowerCase();
    const direct = /^db\.([a-z0-9-]+)\.supabase\.co$/.exec(host);
    if (direct) return direct[1];
    if (host.endsWith(".pooler.supabase.com")) {
      return /^postgres\.([a-z0-9-]+)$/.exec(
        decodeURIComponent(parsed.username).toLowerCase(),
      )?.[1] ?? null;
    }
    return null;
  } catch {
    return null;
  }
}

function inspectSupabaseTarget(env) {
  const expected = projectRefFromSupabaseUrl(env.SUPABASE_URL);
  const runtime = projectRefFromDatabaseUrl(env.DATABASE_URL);
  const migration = projectRefFromDatabaseUrl(env.DIRECT_URL);
  const hasInvalid = !expected || !runtime || !migration;
  if (hasInvalid) return { ok: false, code: "UNVERIFIABLE_TARGET" };
  if (expected !== runtime || expected !== migration) {
    return { ok: false, code: "PROJECT_MISMATCH" };
  }
  return { ok: true, code: "TARGET_MATCH" };
}

module.exports = { projectRefFromSupabaseUrl, projectRefFromDatabaseUrl, inspectSupabaseTarget };

if (require.main === module) {
  const verdict = inspectSupabaseTarget(process.env);
  if (verdict.ok) {
    console.log("[entrypoint] Supabase runtime/migration project references match.");
  } else {
    console.error(`[entrypoint] Supabase project preflight failed (${verdict.code}). Check deployment secrets without logging their values.`);
    process.exitCode = 1;
  }
}
