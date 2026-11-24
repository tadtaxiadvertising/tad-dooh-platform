"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { exportStorage, validateInventory, validateConfig, objectUrl, SUCCESS } = require("./export-supabase-storage-bytes.cjs");
const ref = "abcdefghijklmnopqrst";
const fakeKey = "test-only-synthetic-key-never-use-in-production";
const now = "20261124T050000Z";
function inventory() { return { project_ref: ref, captured_at_utc: now, objects: [
  { bucket_id: "creatives", object_name: "campaigns/a b.png", bytes: 5 },
  { bucket_id: "driver-assets", object_name: "clip.mp4", bytes: 0 },
]}; }
const expectedVerifier = async (dir, p, count) => {
  assert.equal(p,ref); assert.equal(count,"2");
  const m=JSON.parse(await fs.promises.readFile(path.join(dir,"storage-manifest.json"),"utf8"));
  assert.equal(m.project_ref,ref); assert.equal(m.restore_verified,false);
  assert.equal(m.files.length,2); assert.equal(m.source_object_count,2);
  assert.equal(m.files[0].object_name,"campaigns/a b.png");
  assert.deepEqual(m.files.map(x=>x.bytes),[5,0]);
  for (const e of m.files) assert.match(e.sha256,/^[a-f0-9]{64}$/);
  return "STORAGE_BYTES_HASHED_COVERAGE_AND_RESTORE_UNVERIFIED";
};
async function fixture(callback) {
  const root=await fs.promises.mkdtemp(path.join(os.tmpdir(),"tad-export-fixture-"));
  const inventoryFile=path.join(root,"source-private.json");
  const out=path.join(root,"storage-output");
  const data=inventory();
  await fs.promises.writeFile(inventoryFile,JSON.stringify(data));
  const env={
    SUPABASE_URL:"https://" + ref + ".supabase.co",
    SUPABASE_SERVICE_ROLE_KEY:fakeKey,
    TAD_EXPECTED_SUPABASE_PROJECT_REF:ref,
    TAD_EXPECTED_STORAGE_OBJECT_COUNT:"2",
    TAD_APPROVE_STORAGE_READONLY_EXPORT:"YES",
    TAD_ROTATED_SUPABASE_KEY_CONFIRMED:"YES",
    TAD_ENCRYPTED_BACKUP_VOLUME_CONFIRMED:"YES",
    TAD_PRIVATE_STORAGE_INVENTORY_FILE:inventoryFile,
    TAD_PRIVATE_STORAGE_EXPORT_DIR:out,
  };
  try { return await callback({root,env,data,out,inventoryFile}); }
  finally { await fs.promises.rm(root,{recursive:true,force:true}); }
}
function mockFetch(url) {
  if(url.includes("a%20b.png")) return Promise.resolve(new Response("hello",{status:200}));
  return Promise.resolve(new Response(new Uint8Array(0),{status:200}));
}
test("validates names, expected count, and duplicates with no production data",()=>{
  assert.ok(validateInventory(inventory(),ref,2));
  const bad=inventory();bad.objects[1].object_name="campaigns/a b.png";bad.objects[1].bucket_id="creatives";
  assert.equal(validateInventory(bad,ref,2),null);
  bad.objects[1].object_name="../escape";assert.equal(validateInventory(bad,ref,2),null);
  assert.equal(validateInventory(inventory(),ref,3),null);
  assert.equal(validateInventory({...inventory(), secret:"should-fail"},ref,2),null);
});
test("does not accept project mismatch, missing key or missing approvals",()=>fixture(async ({env})=>{
  assert.ok(validateConfig(env));
  assert.equal(validateConfig({...env,SUPABASE_URL:"https://wrong.supabase.co"}),null);
  assert.equal(validateConfig({...env,TAD_ROTATED_SUPABASE_KEY_CONFIRMED:""}),null);
  assert.equal(validateConfig({...env,TAD_APPROVE_STORAGE_READONLY_EXPORT:""}),null);
  assert.equal(validateConfig({...env,TAD_ENCRYPTED_BACKUP_VOLUME_CONFIRMED:""}),null);
  assert.equal(validateConfig({...env,SUPABASE_SERVICE_ROLE_KEY:""}),null);
  assert.equal(validateConfig({...env,TAD_EXPECTED_STORAGE_OBJECT_COUNT:"02"}),null);
}));
test("encodes object paths and rejects unsafe segments",()=>{
  assert.match(objectUrl(ref,"creatives","campaigns/a b.png"),/campaigns\/a%20b\.png$/);
  assert.equal(validateInventory({...inventory(),objects:[{bucket_id:"a",object_name:"x/../y",bytes:2}]},ref,1),null);
});
test("streams all bytes to opaque local files and hashes without release approval",()=>fixture(async ({env,out})=>{
  const verdict=await exportStorage(env,{fetchImpl:mockFetch,checkStorageExportImpl:expectedVerifier});
  assert.equal(verdict,SUCCESS);
  assert.match(SUCCESS,/RESTORE_UNVERIFIED/);
  const names=await fs.promises.readdir(path.join(out,"objects"));
  assert.deepEqual(names,["0000000000000001.blob","0000000000000002.blob"]);
  assert.equal(await fs.promises.readFile(path.join(out,"objects",names[0]),"utf8"),"hello");
  assert.equal((await fs.promises.stat(path.join(out,"objects",names[1]))).size,0);
  // Never overwrite an existing backup directory.
  assert.equal(await exportStorage(env,{fetchImpl:mockFetch,checkStorageExportImpl:expectedVerifier}),"EXPORT_PRECHECK_FAILED");
}));
test("refuses wrong object byte count before manifest or success",()=>fixture(async ({env,out})=>{
  const verdict=await exportStorage(env,{fetchImpl:async()=>new Response("wrong-size",{status:200}),checkStorageExportImpl:expectedVerifier});
  assert.equal(verdict,"REMOTE_BYTES_SIZE_MISMATCH");
  await assert.rejects(()=>fs.promises.stat(path.join(out,"storage-manifest.json")),{code:"ENOENT"});
}));
test("rejects unauthorized remote response and never produces manifest",()=>fixture(async ({env,out})=>{
  const result=await exportStorage(env,{fetchImpl:async()=>new Response("forbidden",{status:403}),checkStorageExportImpl:expectedVerifier});
  assert.equal(result,"REMOTE_OBJECT_READ_FAILED");
  await assert.rejects(()=>fs.promises.stat(path.join(out,"storage-manifest.json")),{code:"ENOENT"});
}));
test("rejects verifier failure, keeping the restricted directory for owner triage",()=>fixture(async ({env})=>{
  const result=await exportStorage(env,{fetchImpl:mockFetch,checkStorageExportImpl:async()=> "STORAGE_HASH_MISMATCH"});
  assert.equal(result,"EXPORTED_BYTES_CHECK_FAILED");
}));
test("does not echo private exceptions, paths or secrets from CLI",()=>fixture(async ({env,root})=>{
  const result=await exportStorage(env,{fetchImpl:async()=>{throw Error(fakeKey+root)}});
  assert.equal(result,"EXPORT_INCOMPLETE_RESTRICTED_DIRECTORY");
  const script=path.join(__dirname,"export-supabase-storage-bytes.cjs");
  const p=spawnSync(process.execPath,[script],{env:{PATH:process.env.PATH},encoding:"utf8",timeout:10000});
  assert.equal(p.status,1);
  assert.match(p.stderr,/INVALID_PRIVATE_CONFIG/);
  assert.ok(!p.stderr.includes(fakeKey));
}));
test("refuses destination within Git checkout",()=>fixture(async ({env,root})=>{
  await fs.promises.mkdir(path.join(root,".git"));
  assert.equal(await exportStorage(env,{fetchImpl:mockFetch,checkStorageExportImpl:expectedVerifier}),"UNSAFE_EXPORT_LOCATION");
}));
test("refuses symlink inventory file", {skip:process.platform==="win32"}, ()=>fixture(async ({env,inventoryFile,root})=>{
  const other=path.join(root,"original-private.json");
  await fs.promises.rename(inventoryFile,other);
  await fs.promises.symlink(other,inventoryFile);
  assert.equal(await exportStorage(env,{fetchImpl:mockFetch,checkStorageExportImpl:expectedVerifier}),"INVALID_INVENTORY");
}));
