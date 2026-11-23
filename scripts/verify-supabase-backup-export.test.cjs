"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const { spawnSync } = require("node:child_process");
const { checkExport } = require("./verify-supabase-backup-export.cjs");

const REF = "aaaaaaaaaaaaaaaaaaaa";
const SCRIPT = path.join(__dirname, "verify-supabase-backup-export.cjs");
async function fixture() {
  const directory = await fs.promises.mkdtemp(path.join(os.tmpdir(), "tad-backup-verify-"));
  const files = [];
  for (const file of ["roles.sql", "schema.sql", "data.sql"]) {
    const content = `-- synthetic export fixture ${file}\n`;
    await fs.promises.writeFile(path.join(directory, file), content);
    files.push({ file, bytes: Buffer.byteLength(content), sha256: crypto.createHash("sha256").update(content).digest("hex").toUpperCase() });
  }
  const manifest = { project_ref: REF, exported_at_utc: "20261121T193500Z", restore_verified: false, files };
  const save = () => fs.promises.writeFile(path.join(directory, "manifest.json"), JSON.stringify(manifest));
  await save();
  return { directory, manifest, save, cleanup: () => fs.promises.rm(directory, { recursive: true, force: true }) };
}

async function withFixture(callback) {
  const f = await fixture();
  try { return await callback(f); } finally { await f.cleanup(); }
}

test("recovery runbook refuses to treat CLI SQL dumps as managed Auth/Storage backup", () => {
  const runbook = fs.readFileSync(
    path.resolve(__dirname, "../docs/incidents/2026-11-21-p0-217-canonical-backup-restore-runbook.md"),
    "utf8",
  );
  assert.match(runbook, /MANAGED_SCHEMA_COVERAGE_UNVERIFIED/);
  assert.match(runbook, /Supabase-managed schemas/);
  assert.match(runbook, /`auth`/);
  assert.match(runbook, /`storage`/);
  assert.match(runbook, /actual object bytes/);
  assert.match(runbook, /off-site encrypted copy/);
  assert.match(runbook, /RESTORE_NOT_VERIFIED/);
  assert.match(runbook, /EXPORT_INTEGRITY_PASS_RESTORE_UNVERIFIED/);
  assert.match(runbook, /migration\/deployment freeze/);
});

test("accepts three matching local dump files without declaring restoration", () => withFixture(async f => {
  assert.equal(await checkExport(f.directory, REF), "EXPORT_INTEGRITY_PASS_RESTORE_UNVERIFIED");
}));

test("refuses missing or mismatched canonical project", () => withFixture(async f => {
  assert.equal(await checkExport(f.directory, ""), "EXPECTED_REF_REQUIRED");
  assert.equal(await checkExport(f.directory, "bbbbbbbbbbbbbbbbbbbb"), "INVALID_MANIFEST");
}));

test("refuses tampered SQL content", () => withFixture(async f => {
  await fs.promises.appendFile(path.join(f.directory, "data.sql"), "-- extra row\n");
  assert.equal(await checkExport(f.directory, REF), "EXPORT_MISMATCH");
}));

test("refuses manifest that asserts restore without an independent trial", () => withFixture(async f => {
  f.manifest.restore_verified = true;
  await f.save();
  assert.equal(await checkExport(f.directory, REF), "INVALID_MANIFEST");
}));

test("refuses missing, duplicate, or traversal artifact names", () => withFixture(async f => {
  f.manifest.files[2].file = f.manifest.files[1].file;
  await f.save();
  assert.equal(await checkExport(f.directory, REF), "INVALID_MANIFEST");
  f.manifest.files[2].file = "../outside.sql";
  await f.save();
  assert.equal(await checkExport(f.directory, REF), "INVALID_MANIFEST");
}));

test("refuses export directory nested within the repository root", () => withFixture(async f => {
  assert.equal(await checkExport(f.directory, REF, path.dirname(f.directory)), "IN_REPOSITORY");
}));

test("refuses backup directory nested inside any other Git checkout", () => withFixture(async f => {
  const otherRepo = await fs.promises.mkdtemp(path.join(os.tmpdir(), "tad-unrelated-repo-"));
  try {
    await fs.promises.mkdir(path.join(otherRepo, ".git"));
    const movedBackup = path.join(otherRepo, "private-backup");
    await fs.promises.cp(f.directory, movedBackup, { recursive: true });
    assert.equal(await checkExport(movedBackup, REF), "IN_REPOSITORY");
  } finally {
    await fs.promises.rm(otherRepo, { recursive: true, force: true });
  }
}));

test("refuses symlinked SQL artifacts", { skip: process.platform === "win32" }, () => withFixture(async f => {
  await fs.promises.unlink(path.join(f.directory, "roles.sql"));
  await fs.promises.symlink(path.join(f.directory, "schema.sql"), path.join(f.directory, "roles.sql"));
  assert.equal(await checkExport(f.directory, REF), "EXPORT_MISMATCH");
}));

test("refuses shared hardlinked SQL files even when bytes and checksum match", {
  skip: process.platform === "win32",
}, () => withFixture(async f => {
  const source = path.join(f.directory, "data.sql");
  const alias = path.join(f.directory, "data-alias.sql");
  await fs.promises.link(source, alias);
  assert.equal(await checkExport(f.directory, REF), "EXPORT_MISMATCH");
}));

test("refuses a SQL pathname replaced with a symlink between lstat and open", {
  skip: process.platform === "win32",
}, () => withFixture(async f => {
  const target = path.join(f.directory, "data.sql");
  const original = path.join(f.directory, "data-original.sql");
  const open = fs.promises.open;
  let swapped = false;
  fs.promises.open = async function (file, ...args) {
    if (!swapped && file === target) {
      swapped = true;
      await fs.promises.rename(target, original);
      await fs.promises.symlink(original, target);
    }
    return open.call(this, file, ...args);
  };
  try {
    assert.equal(await checkExport(f.directory, REF), "READ_OR_PARSE_FAILED");
    assert.equal(swapped, true, "The fixture must exercise the pre-open swap");
  } finally {
    fs.promises.open = open;
  }
}));

test("refuses a shared hardlinked manifest even when JSON matches", {
  skip: process.platform === "win32",
}, () => withFixture(async f => {
  await fs.promises.link(
    path.join(f.directory, "manifest.json"),
    path.join(f.directory, "manifest-alias.json"),
  );
  assert.equal(await checkExport(f.directory, REF), "INVALID_MANIFEST");
}));

test("refuses a manifest swapped with a symlink after its first stat", {
  skip: process.platform === "win32",
}, () => withFixture(async f => {
  const target = path.join(f.directory, "manifest.json");
  const original = path.join(f.directory, "manifest-original.json");
  const open = fs.promises.open;
  let swapped = false;
  fs.promises.open = async function (file, ...args) {
    if (!swapped && file === target) {
      swapped = true;
      await fs.promises.rename(target, original);
      await fs.promises.symlink(original, target);
    }
    return open.call(this, file, ...args);
  };
  try {
    assert.equal(await checkExport(f.directory, REF), "READ_OR_PARSE_FAILED");
    assert.equal(swapped, true, "The fixture must exercise the manifest swap");
  } finally {
    fs.promises.open = open;
  }
}));

test("refuses symlinked manifest", { skip: process.platform === "win32" }, () => withFixture(async f => {
  await fs.promises.rename(path.join(f.directory, "manifest.json"), path.join(f.directory, "real-manifest.json"));
  await fs.promises.symlink(path.join(f.directory, "real-manifest.json"), path.join(f.directory, "manifest.json"));
  assert.equal(await checkExport(f.directory, REF), "INVALID_MANIFEST");
}));

test("refuses extraneous fields that could carry sensitive material", () => withFixture(async f => {
  f.manifest.private_password = "SYNTHETIC_DO_NOT_LOG";
  await f.save();
  assert.equal(await checkExport(f.directory, REF), "INVALID_MANIFEST");
}));

test("CLI emits verdicts only without private directory or SQL content", () => withFixture(async f => {
  const run = ref => spawnSync(process.execPath, [SCRIPT, f.directory], {
    encoding: "utf8", timeout: 5000, windowsHide: true,
    env: { PATH: process.env.PATH || "", TAD_EXPECTED_SUPABASE_PROJECT_REF: ref },
  });
  const ok = run(REF);
  assert.equal(ok.status, 0);
  assert.match(ok.stdout, /EXPORT_INTEGRITY_PASS_RESTORE_UNVERIFIED/);
  const denied = run("bbbbbbbbbbbbbbbbbbbb");
  assert.equal(denied.status, 1);
  for (const message of [ok.stdout, ok.stderr, denied.stdout, denied.stderr]) {
    assert.doesNotMatch(message, /synthetic export fixture|SYNTHETIC_DO_NOT_LOG/);
    assert.ok(!message.includes(f.directory));
  }
}));
