#!/usr/bin/env node
"use strict";

// P0 #217: OFFLINE verification of privately exported Storage object bytes.
// It does not fetch objects, connect to Supabase, validate a source inventory,
// prove encryption or replace a real isolated restore. Never log private paths.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const REF = /^[a-z0-9]{20}$/;
const SHA256 = /^[a-fA-F0-9]{64}$/;
const OPAQUE_FILE = /^objects\/[a-f0-9]{16,64}\.blob$/;
const SUCCESS = "STORAGE_BYTES_HASHED_COVERAGE_AND_RESTORE_UNVERIFIED";
const MANIFEST_LIMIT = 64 * 1024 * 1024;
const FILE_LIMIT = 100000;

function ownKeys(value, keys) {
  return !!value && typeof value === "object" && !Array.isArray(value) &&
    Object.keys(value).sort().join(",") === [...keys].sort().join(",");
}

function within(parent, candidate) {
  const rel = path.relative(parent, candidate);
  return rel === "" || (rel !== ".." && !rel.startsWith(".." + path.sep) && !path.isAbsolute(rel));
}

async function hasGitAncestor(dir) {
  for (let cursor = dir;; cursor = path.dirname(cursor)) {
    try {
      await fs.promises.lstat(path.join(cursor, ".git"));
      return true;
    } catch (e) {
      if (e.code !== "ENOENT") throw e;
    }
    if (cursor === path.dirname(cursor)) return false;
  }
}

function parseCount(raw) {
  if (typeof raw !== "string" || !/^(?:0|[1-9][0-9]{0,8})$/.test(raw)) return null;
  const value = Number(raw);
  return Number.isSafeInteger(value) ? value : null;
}

async function fileDigestSafely(file, expectedSize) {
  const before = await fs.promises.lstat(file);
  if (!before.isFile() || before.isSymbolicLink() ||
      before.nlink !== 1 || before.size !== expectedSize) return null;
  // O_NOFOLLOW prevents symlink swap between lstat/open on POSIX systems.
  const flags = fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0);
  const handle = await fs.promises.open(file, flags);
  try {
    const stat = await handle.stat();
    if (!stat.isFile() || stat.nlink !== 1 ||
        stat.size !== expectedSize ||
        stat.ino !== before.ino || stat.dev !== before.dev) return null;
    const hash = crypto.createHash("sha256");
    for await (const chunk of handle.createReadStream({ autoClose: false })) {
      hash.update(chunk);
    }
    const after = await handle.stat();
    const named = await fs.promises.lstat(file);
    if (!named.isFile() || named.isSymbolicLink() ||
        named.nlink !== 1 || named.ino !== stat.ino ||
        named.dev !== stat.dev || after.nlink !== 1 ||
        after.size !== stat.size || after.mtimeMs !== stat.mtimeMs ||
        after.ctimeMs !== stat.ctimeMs ||
        named.size !== after.size || named.mtimeMs !== after.mtimeMs ||
        named.ctimeMs !== after.ctimeMs) return null;
    return hash.digest();
  } finally {
    await handle.close();
  }
}

// Bind the untrusted Storage manifest to one opened file descriptor. A
// pathname check followed by readFile(path) can be swapped between operations.
// Also cap the *actual* stream bytes, not only the initial lstat size.
async function readStorageManifestSafely(file) {
  const before = await fs.promises.lstat(file);
  if (!before.isFile() || before.isSymbolicLink() ||
      before.nlink !== 1 || before.size > MANIFEST_LIMIT) return null;

  const flags = fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0);
  const handle = await fs.promises.open(file, flags);
  try {
    const opened = await handle.stat();
    if (!opened.isFile() || opened.nlink !== 1 ||
        opened.ino !== before.ino || opened.dev !== before.dev ||
        opened.size !== before.size ||
        opened.mtimeMs !== before.mtimeMs ||
        opened.ctimeMs !== before.ctimeMs) return null;

    const chunks = [];
    let length = 0;
    for await (const chunk of handle.createReadStream({ autoClose: false })) {
      length += chunk.length;
      if (length > MANIFEST_LIMIT) return null;
      chunks.push(chunk);
    }

    const after = await handle.stat();
    const named = await fs.promises.lstat(file);
    if (!named.isFile() || named.isSymbolicLink() ||
        named.nlink !== 1 || named.ino !== opened.ino ||
        named.dev !== opened.dev || after.nlink !== 1 ||
        after.size !== opened.size ||
        after.mtimeMs !== opened.mtimeMs ||
        after.ctimeMs !== opened.ctimeMs ||
        named.size !== after.size ||
        named.mtimeMs !== after.mtimeMs ||
        named.ctimeMs !== after.ctimeMs) return null;

    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } finally {
    await handle.close();
  }
}

async function checkStorageExport(directory, expectedRef, expectedSourceCount,
  repositoryRoot = path.resolve(__dirname, "..")) {
  if (!REF.test(expectedRef || "")) return "EXPECTED_REF_REQUIRED";
  const count = parseCount(expectedSourceCount);
  if (count === null) return "SOURCE_OBJECT_COUNT_REQUIRED";
  if (typeof directory !== "string" || !directory) return "DIRECTORY_REQUIRED";
  try {
    const dir = path.resolve(directory);
    const dirStat = await fs.promises.lstat(dir);
    if (!dirStat.isDirectory() || dirStat.isSymbolicLink()) return "UNSAFE_DIRECTORY";
    const [realDir, realRepo] = await Promise.all([
      fs.promises.realpath(dir), fs.promises.realpath(repositoryRoot),
    ]);
    if (within(realRepo, realDir) || await hasGitAncestor(realDir)) return "IN_REPOSITORY";

    const objectsDir = path.join(realDir, "objects");
    const objectsStat = await fs.promises.lstat(objectsDir);
    if (!objectsStat.isDirectory() || objectsStat.isSymbolicLink() ||
        !within(realDir, await fs.promises.realpath(objectsDir))) return "UNSAFE_OBJECTS_DIRECTORY";

    const file = path.join(realDir, "storage-manifest.json");
    const manifest = await readStorageManifestSafely(file);
    if (!manifest) return "INVALID_MANIFEST";
    if (!ownKeys(manifest, ["project_ref", "exported_at_utc", "restore_verified",
      "source_object_count", "files"]) ||
        manifest.project_ref !== expectedRef || manifest.restore_verified !== false ||
        !/^[0-9]{8}T[0-9]{6}Z$/.test(manifest.exported_at_utc || "") ||
        manifest.source_object_count !== count ||
        !Array.isArray(manifest.files) || manifest.files.length !== count ||
        manifest.files.length > FILE_LIMIT) return "INVALID_MANIFEST";

    const keys = new Set();
    const localPaths = new Set();
    for (const item of manifest.files) {
      if (!ownKeys(item, ["bucket_id", "object_name", "file", "bytes", "sha256"]) ||
          typeof item.bucket_id !== "string" ||
          !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/.test(item.bucket_id) ||
          typeof item.object_name !== "string" ||
          item.object_name.length < 1 || item.object_name.length > 2048 ||
          /[\x00-\x1f\x7f]/.test(item.object_name) ||
          typeof item.file !== "string" || !OPAQUE_FILE.test(item.file) ||
          !Number.isSafeInteger(item.bytes) || item.bytes < 0 ||
          typeof item.sha256 !== "string" || !SHA256.test(item.sha256)) {
        return "INVALID_MANIFEST";
      }
      const key = JSON.stringify([item.bucket_id, item.object_name]);
      if (keys.has(key) || localPaths.has(item.file)) return "INVALID_MANIFEST";
      keys.add(key);
      localPaths.add(item.file);
      const full = path.join(realDir, item.file);
      if (!within(objectsDir, full)) return "INVALID_MANIFEST";
      const actual = await fileDigestSafely(full, item.bytes);
      if (!actual || !crypto.timingSafeEqual(actual, Buffer.from(item.sha256, "hex"))) {
        return "STORAGE_HASH_MISMATCH";
      }
    }
    return SUCCESS;
  } catch {
    // Never echo filesystem errors: their text may include private paths.
    return "READ_OR_PARSE_FAILED";
  }
}

module.exports = { checkStorageExport, SUCCESS };

if (require.main === module) {
  checkStorageExport(
    process.argv[2],
    process.env.TAD_EXPECTED_SUPABASE_PROJECT_REF,
    process.env.TAD_EXPECTED_STORAGE_OBJECT_COUNT,
  ).then(code => {
    if (code === SUCCESS) {
      console.log(code + ": checked private files only. Source inventory, encryption and restore are UNVERIFIED.");
    } else {
      console.error("TAD_STORAGE_EXPORT_REFUSED (" + code + "). No network or database access attempted.");
      process.exitCode = 1;
    }
  }).catch(() => {
    console.error("TAD_STORAGE_EXPORT_REFUSED (UNEXPECTED_ERROR).");
    process.exitCode = 1;
  });
}
