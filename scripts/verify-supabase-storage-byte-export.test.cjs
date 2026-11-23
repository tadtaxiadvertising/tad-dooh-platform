"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const { spawnSync } = require("node:child_process");
const { checkStorageExport, SUCCESS } = require("./verify-supabase-storage-byte-export.cjs");

const REF = "aaaaaaaaaaaaaaaaaaaa";
const SECOND_REF = "bbbbbbbbbbbbbbbbbbbb";
const SOURCE_COUNT = "2";
const SCRIPT = path.join(__dirname, "verify-supabase-storage-byte-export.cjs");
const sha = data => crypto.createHash("sha256").update(data).digest("hex");

async function fixture() {
  const directory = await fs.promises.mkdtemp(path.join(os.tmpdir(), "tad-private-storage-check-"));
  const objects = path.join(directory, "objects");
  await fs.promises.mkdir(objects);
  const records = [
    { bucket_id: "creatives", object_name: "banner/ad.png",
      file: "objects/0000000000000001.blob", content: Buffer.from("SYNTHETIC_PRIVATE_OBJECT_A") },
    { bucket_id: "private-ads", object_name: "videos/clip.mp4",
      file: "objects/0000000000000002.blob", content: Buffer.alloc(0) },
  ];
  for (const item of records) await fs.promises.writeFile(path.join(directory, item.file), item.content);
  const manifest = {
    project_ref: REF, exported_at_utc: "20261121T193500Z",
    restore_verified: false, source_object_count: 2,
    files: records.map(item => ({
      bucket_id: item.bucket_id, object_name: item.object_name,
      file: item.file, bytes: item.content.length, sha256: sha(item.content),
    })),
  };
  const save = () => fs.promises.writeFile(
    path.join(directory, "storage-manifest.json"), JSON.stringify(manifest));
  await save();
  return { directory, objects, manifest, save,
    cleanup: () => fs.promises.rm(directory, { recursive: true, force: true }) };
}

async function withFixture(callback) {
  const f = await fixture();
  try { await callback(f); } finally { await f.cleanup(); }
}

test("checks actual local byte hashes without claiming source coverage or isolated restore", () =>
  withFixture(async f => {
    assert.equal(await checkStorageExport(f.directory, REF, SOURCE_COUNT), SUCCESS);
    assert.match(SUCCESS, /COVERAGE_AND_RESTORE_UNVERIFIED/);
  }));

test("requires independent source count and correct project reference", () =>
  withFixture(async f => {
    assert.equal(await checkStorageExport(f.directory, REF), "SOURCE_OBJECT_COUNT_REQUIRED");
    assert.equal(await checkStorageExport(f.directory, REF, "03"), "SOURCE_OBJECT_COUNT_REQUIRED");
    assert.equal(await checkStorageExport(f.directory, REF, "-1"), "SOURCE_OBJECT_COUNT_REQUIRED");
    assert.equal(await checkStorageExport(f.directory, "", SOURCE_COUNT), "EXPECTED_REF_REQUIRED");
    assert.equal(await checkStorageExport(f.directory, SECOND_REF, SOURCE_COUNT), "INVALID_MANIFEST");
    assert.equal(await checkStorageExport(f.directory, REF, "1"), "INVALID_MANIFEST");
    assert.equal(await checkStorageExport(f.directory, REF, "3"), "INVALID_MANIFEST");
  }));

test("refuses same-size tampering and missing local object files", () =>
  withFixture(async f => {
    const item = f.manifest.files[0];
    await fs.promises.writeFile(path.join(f.directory, item.file),
      Buffer.from("X".repeat(item.bytes)));
    assert.equal(await checkStorageExport(f.directory, REF, SOURCE_COUNT), "STORAGE_HASH_MISMATCH");
    await fs.promises.unlink(path.join(f.directory, item.file));
    assert.equal(await checkStorageExport(f.directory, REF, SOURCE_COUNT), "READ_OR_PARSE_FAILED");
  }));

test("refuses duplicate bucket-object keys even with different blob names", () =>
  withFixture(async f => {
    f.manifest.files[1].bucket_id = f.manifest.files[0].bucket_id;
    f.manifest.files[1].object_name = f.manifest.files[0].object_name;
    await f.save();
    assert.equal(await checkStorageExport(f.directory, REF, SOURCE_COUNT), "INVALID_MANIFEST");
  }));

test("refuses duplicate local files, traversal and private names used as paths", () =>
  withFixture(async f => {
    f.manifest.files[1].file = f.manifest.files[0].file;
    await f.save();
    assert.equal(await checkStorageExport(f.directory, REF, SOURCE_COUNT), "INVALID_MANIFEST");
    f.manifest.files[1].file = "../elsewhere.blob";
    await f.save();
    assert.equal(await checkStorageExport(f.directory, REF, SOURCE_COUNT), "INVALID_MANIFEST");
    f.manifest.files[1].file = "objects/secret-customer-name.mp4";
    await f.save();
    assert.equal(await checkStorageExport(f.directory, REF, SOURCE_COUNT), "INVALID_MANIFEST");
  }));

test("rejects unknown manifest fields, unsupported restored flag or bad digests", () =>
  withFixture(async f => {
    f.manifest.private_key = "SYNTHETIC_SECRET";
    await f.save();
    assert.equal(await checkStorageExport(f.directory, REF, SOURCE_COUNT), "INVALID_MANIFEST");
    delete f.manifest.private_key;
    f.manifest.restore_verified = true;
    await f.save();
    assert.equal(await checkStorageExport(f.directory, REF, SOURCE_COUNT), "INVALID_MANIFEST");
    f.manifest.restore_verified = false;
    f.manifest.files[0].sha256 = "0".repeat(64);
    await f.save();
    assert.equal(await checkStorageExport(f.directory, REF, SOURCE_COUNT), "STORAGE_HASH_MISMATCH");
  }));

test("rejects symlinked object file, object directory and hardlinked external file", {
  skip: process.platform === "win32",
}, () => withFixture(async f => {
  const file = path.join(f.directory, f.manifest.files[0].file);
  const target = path.join(f.directory, f.manifest.files[1].file);
  await fs.promises.unlink(file);
  await fs.promises.symlink(target, file);
  assert.equal(await checkStorageExport(f.directory, REF, SOURCE_COUNT), "STORAGE_HASH_MISMATCH");
  await fs.promises.unlink(file);
  await fs.promises.writeFile(file, Buffer.from("SYNTHETIC_PRIVATE_OBJECT_A"));
  const backup = f.objects + "-actual";
  await fs.promises.rename(f.objects, backup);
  await fs.promises.symlink(backup, f.objects, "dir");
  assert.equal(await checkStorageExport(f.directory, REF, SOURCE_COUNT), "UNSAFE_OBJECTS_DIRECTORY");
  await fs.promises.unlink(f.objects);
  await fs.promises.rename(backup, f.objects);
  const extra = path.join(f.directory, "linked");
  await fs.promises.link(file, extra);
  assert.equal(await checkStorageExport(f.directory, REF, SOURCE_COUNT), "STORAGE_HASH_MISMATCH");
}));

test("rejects any backup inside a Git checkout (including unrelated checkout)", () =>
  withFixture(async f => {
    assert.equal(await checkStorageExport(f.directory, REF, SOURCE_COUNT, path.dirname(f.directory)),
      "IN_REPOSITORY");
    const otherRepo = await fs.promises.mkdtemp(path.join(os.tmpdir(), "tad-fake-repo-"));
    try {
      await fs.promises.mkdir(path.join(otherRepo, ".git"));
      const dest = path.join(otherRepo, "private-storage-backup");
      await fs.promises.cp(f.directory, dest, { recursive: true });
      assert.equal(await checkStorageExport(dest, REF, SOURCE_COUNT), "IN_REPOSITORY");
    } finally {
      await fs.promises.rm(otherRepo, { recursive: true, force: true });
    }
  }));

test("CLI prints only static verdict, never paths, object keys, or private contents", () =>
  withFixture(async f => {
    function run(ref, count) {
      return spawnSync(process.execPath, [SCRIPT, f.directory], {
        env: { PATH: process.env.PATH || "",
          TAD_EXPECTED_SUPABASE_PROJECT_REF: ref,
          TAD_EXPECTED_STORAGE_OBJECT_COUNT: count },
        encoding: "utf8", timeout: 5000, windowsHide: true,
      });
    }
    const good = run(REF, SOURCE_COUNT);
    assert.equal(good.status, 0);
    assert.match(good.stdout, /STORAGE_BYTES_HASHED_COVERAGE_AND_RESTORE_UNVERIFIED/);
    const rejected = run(REF, "99");
    assert.equal(rejected.status, 1);
    for (const message of [good.stdout, good.stderr, rejected.stdout, rejected.stderr]) {
      for (const privateValue of ["SYNTHETIC_PRIVATE_OBJECT_A", f.directory, "banner/ad.png",
        "videos/clip.mp4", "private-ads"]) {
        assert.ok(!message.includes(privateValue), "Sensitive value must never be printed");
      }
    }
  }));

test("rejects hardlinked Storage manifests (outside aliases included)", {
  skip: process.platform === "win32",
}, () => withFixture(async f => {
  const manifestFile = path.join(f.directory, "storage-manifest.json");
  await fs.promises.link(manifestFile, path.join(f.directory, "manifest-alias.json"));
  assert.equal(await checkStorageExport(f.directory, REF, SOURCE_COUNT),
    "INVALID_MANIFEST");
}));

test("refuses a symlink swap between Storage manifest lstat and open", {
  skip: process.platform === "win32",
}, () => withFixture(async f => {
  const manifestFile = path.join(f.directory, "storage-manifest.json");
  const copy = path.join(f.directory, "alternate-manifest.json");
  await fs.promises.copyFile(manifestFile, copy);

  const originalOpen = fs.promises.open;
  let swapped = false;
  fs.promises.open = async (name, ...args) => {
    if (!swapped && name === manifestFile) {
      swapped = true;
      await fs.promises.rename(manifestFile, manifestFile + ".original");
      await fs.promises.symlink(copy, manifestFile);
    }
    return originalOpen(name, ...args);
  };
  try {
    assert.equal(await checkStorageExport(f.directory, REF, SOURCE_COUNT),
      "READ_OR_PARSE_FAILED");
    assert.equal(swapped, true);
  } finally {
    fs.promises.open = originalOpen;
  }
}));

test("refuses a regular-file substitution between manifest lstat and open", {
  skip: process.platform === "win32",
}, () => withFixture(async f => {
  const manifestFile = path.join(f.directory, "storage-manifest.json");
  const copy = path.join(f.directory, "alternate-manifest.json");
  await fs.promises.copyFile(manifestFile, copy);

  const originalOpen = fs.promises.open;
  let swapped = false;
  fs.promises.open = async (name, ...args) => {
    if (!swapped && name === manifestFile) {
      swapped = true;
      await fs.promises.rename(manifestFile, manifestFile + ".original");
      await fs.promises.rename(copy, manifestFile);
    }
    return originalOpen(name, ...args);
  };
  try {
    assert.equal(await checkStorageExport(f.directory, REF, SOURCE_COUNT),
      "INVALID_MANIFEST");
    assert.equal(swapped, true);
  } finally {
    fs.promises.open = originalOpen;
  }
}));
