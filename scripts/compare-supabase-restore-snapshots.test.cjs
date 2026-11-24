"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { FIELDS, SUCCESS, compareSnapshots, normalizedSnapshot } = require("./compare-supabase-restore-snapshots.cjs");

const sample = () => Object.fromEntries(Object.entries(FIELDS).map(([field,type]) => [field, type === "count" ? 11 : false]));
async function withPair(testCase) {
  const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), "tad-restore-compare-"));
  const source = path.join(root, "source.json");
  const clone = path.join(root, "clone.json");
  try {
    await fs.promises.writeFile(source, JSON.stringify(sample()));
    await fs.promises.writeFile(clone, JSON.stringify(sample()));
    return await testCase({root,source,clone});
  } finally {
    await fs.promises.rm(root,{recursive:true,force:true});
  }
}

test("accepts distinct aggregate snapshots without claiming an actual restore",()=>withPair(async ({source,clone})=>{
  assert.deepEqual(await compareSnapshots(source,clone),{code:SUCCESS});
  assert.match(SUCCESS,/RESTORE_UNVERIFIED/);
}));
test("rejects mismatch by field names only",()=>withPair(async ({source,clone})=>{
  const altered=sample();altered.auth_user_rows+=1;altered.storage_object_metadata_rows+=1;
  await fs.promises.writeFile(clone,JSON.stringify(altered));
  assert.deepEqual(await compareSnapshots(source,clone),{code:"AGGREGATES_DIFFER",fields:["auth_user_rows","storage_object_metadata_rows"]});
}));
test("accepts stringified counts and rejects malformed numbers or unknown extra fields",()=>{
  const input=sample();input.public_tables="33";
  assert.equal(normalizedSnapshot(input).public_tables,33);
  for(const invalid of ["03","-1","1e4",1.5,-1,Number.MAX_SAFE_INTEGER+1,null]) {
    input.public_tables=invalid;
    assert.equal(normalizedSnapshot(input),null);
  }
  input.public_tables=33;input.database_password="FAKE_PRIVATE_SECRET";
  assert.equal(normalizedSnapshot(input),null);
});
test("rejects missing, arbitrary or wrong-type columns",()=>{
  const value=sample();delete value.postgis_present;
  assert.equal(normalizedSnapshot(value),null);
  value.postgis_present=0;
  assert.equal(normalizedSnapshot(value),null);
  value.postgis_present=true;
  assert.deepEqual(normalizedSnapshot(value),value);
});
test("refuses source and clone being the same physical file",()=>withPair(async ({source})=>{
  assert.deepEqual(await compareSnapshots(source,source),{code:"SOURCE_AND_CLONE_SAME_FILE"});
}));
test("rejects missing, empty or malformed snapshots",()=>withPair(async ({source,clone})=>{
  assert.deepEqual(await compareSnapshots(source,""),{code:"TWO_SNAPSHOTS_REQUIRED"});
  await fs.promises.writeFile(clone,"{}");
  assert.deepEqual(await compareSnapshots(source,clone),{code:"INVALID_AGGREGATE_SNAPSHOT"});
  await fs.promises.writeFile(clone,"not json");
  assert.deepEqual(await compareSnapshots(source,clone),{code:"SNAPSHOT_READ_FAILED"});
}));
test("rejects symlinks to snapshots",{skip:process.platform==="win32"},()=>withPair(async ({source,clone})=>{
  await fs.promises.unlink(clone);
  await fs.promises.symlink(source,clone);
  assert.deepEqual(await compareSnapshots(source,clone),{code:"INVALID_AGGREGATE_SNAPSHOT"});
}));
test("CLI writes only safe field names and verdict, not private paths or payload",()=>withPair(async ({root,source,clone})=>{
  const script=path.join(__dirname,"compare-supabase-restore-snapshots.cjs");
  const run=spawnSync(process.execPath,[script,source,clone],{encoding:"utf8",timeout:5000});
  assert.equal(run.status,0);
  assert.match(run.stdout,/AGGREGATES_MATCH_RESTORE_UNVERIFIED/);
  assert.ok(!run.stdout.includes(root));
  await fs.promises.writeFile(clone,JSON.stringify({...sample(), auth_user_rows: 12}));
  const failed=spawnSync(process.execPath,[script,source,clone],{encoding:"utf8",timeout:5000});
  assert.equal(failed.status,1);
  assert.match(failed.stderr,/AGGREGATES_DIFFER.*auth_user_rows/);
  assert.ok(!failed.stderr.includes(root));
}));
test("snapshot comparator fields track the repository's read-only recovery SQL",()=>{
  const sql = fs.readFileSync(path.resolve(__dirname,"../docs/incidents/sql/2026-11-21-restore-readonly-proof.sql"),"utf8");
  const aliases = [...sql.matchAll(/\bAS\s+([a-z_]+)(?=,|;|\s)/g)].map(m=>m[1]);
  assert.deepEqual(aliases.sort(),Object.keys(FIELDS).sort());
  assert.doesNotMatch(sql,/\b(DELETE|UPDATE|INSERT|ALTER|DROP|TRUNCATE|CREATE)\s+(TABLE|FROM|INTO|SCHEMA|EXTENSION|INDEX)\b/i);
});
