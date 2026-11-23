"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const planFile = path.join(
  __dirname,
  "..",
  "docs",
  "security",
  "manual-sql",
  "supabase-functions-searchpath-reviewonly.sql",
);
const sql = fs.readFileSync(planFile, "utf8");

test("Supabase security SQL remains manual-only and fails closed on drift", () => {
  assert.ok(!planFile.includes(path.join("prisma", "migrations")));
  assert.match(sql, /^-- REVIEW-ONLY PLAN for #507/m);
  assert.match(sql, /^BEGIN;$/m);
  assert.match(sql, /^COMMIT;$/m);
  assert.match(sql, /SET LOCAL lock_timeout = '3s';/);
  assert.match(sql, /to_regprocedure\('public\.refresh_active_campaigns\(\)'\)/);
  assert.match(
    sql,
    /to_regprocedure\('public\.update_campaign_expirations_updated_at\(\)'\)/,
  );
  assert.match(sql, /TAD_SEARCHPATH_PREFLIGHT_FUNCTION_CHANGED/);
  assert.match(sql, /TAD_SEARCHPATH_PREFLIGHT_REFRESH_BODY_CHANGED/);
  assert.match(sql, /TAD_SEARCHPATH_PREFLIGHT_VIEW_MISSING/);
  assert.match(sql, /TAD_SEARCHPATH_PREFLIGHT_UNEXPECTED_PUBLIC_EXECUTE/);
  assert.match(sql, /TAD_SEARCHPATH_POSTFLIGHT_INVALID_CONFIG/);
  assert.match(
    sql,
    /array_position\(p\.proconfig, 'search_path=pg_catalog, pg_temp'\) IS NULL/,
  );
});

test("refresh remains SECURITY INVOKER, fixed search path, and schema-qualified", () => {
  const definition = sql.slice(
    sql.indexOf("CREATE OR REPLACE FUNCTION public.refresh_active_campaigns()"),
    sql.indexOf("$function$;", sql.indexOf("CREATE OR REPLACE FUNCTION")),
  );
  assert.match(definition, /RETURNS void\s+LANGUAGE plpgsql\s+SECURITY INVOKER/);
  assert.match(definition, /SET search_path = pg_catalog, pg_temp/);
  assert.match(definition, /REFRESH MATERIALIZED VIEW CONCURRENTLY public\.mv_active_campaigns;/);
  assert.match(definition, /REFRESH MATERIALIZED VIEW public\.mv_active_campaigns;/);
  assert.doesNotMatch(
    definition,
    /REFRESH MATERIALIZED VIEW (?:CONCURRENTLY )?mv_active_campaigns;/,
  );
  assert.match(definition, /EXCEPTION\s+WHEN OTHERS THEN/);
  assert.doesNotMatch(definition, /SECURITY DEFINER/i);
});

test("trigger hardening preserves its body and release gates", () => {
  assert.match(
    sql,
    /ALTER FUNCTION public\.update_campaign_expirations_updated_at\(\)\s+SET search_path = pg_catalog, pg_temp;/,
  );
  assert.match(sql, /#217 backup\/restore evidence/);
  assert.match(sql, /#313 release protection/);
  assert.doesNotMatch(sql, /^\s*(?:DROP|TRUNCATE|DELETE FROM|INSERT INTO|UPDATE|GRANT|REVOKE|ALTER TABLE)\b/im);
});
