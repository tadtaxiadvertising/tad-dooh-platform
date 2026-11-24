"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { inspectPinnedSupabaseTarget } = require("./verify-supabase-runtime-target.cjs");

const template = fs.readFileSync(path.resolve(__dirname, "../easypanel-env-template.md"), "utf8");
const serviceStart = template.indexOf("# SERVICIO 1: tad-api");
const serviceEnd = template.indexOf("# SERVICIO 2:", serviceStart);
const apiBlock = template.slice(serviceStart, serviceEnd > serviceStart ? serviceEnd : undefined);

test("EasyPanel template warns not to import secrets into Git/Dockerfile builds", () => {
  assert.ok(serviceStart >= 0);
  assert.match(template, /NO IMPORTAR NI DESPLEGAR DIRECTAMENTE/);
  assert.match(template, /Git\/Dockerfile/);
  assert.match(template, /build-args/);
  assert.match(template, /SOLO en el runtime/);
  assert.match(template, /#244\/\#489|#244\/#489/);
  assert.doesNotMatch(template, /Importar desde este archivo/);
  assert.doesNotMatch(template, /REDEPLOY cada servicio después de guardar/);
});

test("API runtime section requires independent Supabase target pin", () => {
  assert.match(apiBlock, /^TAD_EXPECTED_SUPABASE_PROJECT_REF=<REF_20_CARACTERES_CONFIRMADA_POR_PROPIETARIO>$/m);
  assert.match(apiBlock, /^SUPABASE_URL=<URL_OFICIAL_DEL_PROYECTO_SUPABASE>$/m);
  assert.match(apiBlock, /^DATABASE_URL=<URI_DEL_POOLER_SUPABASE_CON_REF_VERIFICADO>$/m);
  assert.match(apiBlock, /^DIRECT_URL=<URI_DIRECTA_O_POOLER_SESION_CON_REF_VERIFICADO>$/m);
  assert.doesNotMatch(apiBlock, /aws-0-sa-east-1\.pooler/);
  assert.doesNotMatch(apiBlock, /postgresql:\/\/postgres:/);
  assert.match(apiBlock, /postgres\.<project_ref>/);
});

test("pinned preflight accepts real provider-style independent URLs and rejects bare pooler username", () => {
  const ref = "abcdefghijklmnopqrst";
  const fixture = {
    TAD_EXPECTED_SUPABASE_PROJECT_REF: ref,
    SUPABASE_URL: "https://" + ref + ".supabase.co",
    DATABASE_URL: "postgresql://postgres." + ref + ":private@aws-0-us-west-2.pooler.supabase.com:6543/postgres",
    DIRECT_URL: "postgresql://postgres:private@db." + ref + ".supabase.co:5432/postgres",
  };
  assert.deepEqual(inspectPinnedSupabaseTarget(fixture), { ok:true, code:"TARGET_MATCH" });
  const invalid = {...fixture,DATABASE_URL:"postgresql://postgres:private@aws-0-us-west-2.pooler.supabase.com:6543/postgres"};
  assert.deepEqual(inspectPinnedSupabaseTarget(invalid),{ok:false,code:"UNVERIFIABLE_TARGET"});
});
