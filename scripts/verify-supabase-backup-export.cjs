#!/usr/bin/env node
"use strict";

// Local, read-only integrity check for #217 export artifacts. It deliberately
// does not claim that the dump can be restored, or that the volume is encrypted.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const REQUIRED = new Set(["roles.sql", "schema.sql", "data.sql"]);
const REF = /^[a-z0-9]{20}$/;

function isWithin(parent, candidate) {
  const rel = path.relative(parent, candidate);
  return rel === "" || (rel !== ".." && !rel.startsWith(`..${path.sep}`) && !path.isAbsolute(rel));
}

async function hasGitAncestor(directory) {
  for (let cursor = directory;; cursor = path.dirname(cursor)) {
    try {
      await fs.promises.lstat(path.join(cursor, ".git"));
      return true;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    if (cursor === path.dirname(cursor)) return false;
  }
}

// Read through one verified descriptor: a pathname can be swapped after
// lstat(), and an already-tracked dump should never be a shared hardlink.
// This verifies local file identity only, not backup completeness or a restore.
async function hashFileSafely(file, expectedSize) {
  const before = await fs.promises.lstat(file);
  if (!before.isFile() || before.isSymbolicLink() ||
      before.nlink !== 1 || before.size !== expectedSize) return null;

  const flags = fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0);
  const handle = await fs.promises.open(file, flags);
  try {
    const opened = await handle.stat();
    if (!opened.isFile() || opened.nlink !== 1 ||
        opened.ino !== before.ino || opened.dev !== before.dev ||
        opened.size !== expectedSize) return null;

    const digest = crypto.createHash("sha256");
    for await (const chunk of handle.createReadStream({ autoClose: false })) {
      digest.update(chunk);
    }

    const after = await handle.stat();
    const named = await fs.promises.lstat(file);
    if (!named.isFile() || named.isSymbolicLink() ||
        named.nlink !== 1 || named.ino !== opened.ino || named.dev !== opened.dev ||
        after.size !== opened.size || after.mtimeMs !== opened.mtimeMs ||
        after.ctimeMs !== opened.ctimeMs ||
        named.size !== after.size || named.mtimeMs !== after.mtimeMs ||
        named.ctimeMs !== after.ctimeMs) return null;
    return digest.digest();
  } finally {
    await handle.close();
  }
}

// The JSON manifest needs the same pathname-to-descriptor protection as SQL.
// Read with a small hard limit; never include manifest contents in diagnostics.
async function readManifestSafely(file) {
  const before = await fs.promises.lstat(file);
  if (!before.isFile() || before.isSymbolicLink() ||
      before.nlink !== 1 || before.size > 16384) return null;

  const flags = fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0);
  const handle = await fs.promises.open(file, flags);
  try {
    const opened = await handle.stat();
    if (!opened.isFile() || opened.nlink !== 1 ||
        opened.ino !== before.ino || opened.dev !== before.dev ||
        opened.size !== before.size) return null;

    const chunks = [];
    let length = 0;
    for await (const chunk of handle.createReadStream({ autoClose: false })) {
      length += chunk.length;
      if (length > 16384) return null;
      chunks.push(chunk);
    }

    const after = await handle.stat();
    const named = await fs.promises.lstat(file);
    if (!named.isFile() || named.isSymbolicLink() ||
        named.nlink !== 1 || named.ino !== opened.ino || named.dev !== opened.dev ||
        after.size !== opened.size || after.mtimeMs !== opened.mtimeMs ||
        after.ctimeMs !== opened.ctimeMs ||
        named.size !== after.size || named.mtimeMs !== after.mtimeMs ||
        named.ctimeMs !== after.ctimeMs) return null;
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } finally {
    await handle.close();
  }
}

async function checkExport(directory, expectedRef, repositoryRoot = path.resolve(__dirname, "..")) {
  if (!REF.test(expectedRef || "")) return "EXPECTED_REF_REQUIRED";
  if (!directory || typeof directory !== "string") return "DIRECTORY_REQUIRED";
  try {
    const dir = path.resolve(directory);
    const dirStat = await fs.promises.lstat(dir);
    if (!dirStat.isDirectory() || dirStat.isSymbolicLink()) return "UNSAFE_DIRECTORY";
    const [realDir, realRepo] = await Promise.all([
      fs.promises.realpath(dir),
      fs.promises.realpath(repositoryRoot),
    ]);
    if (isWithin(realRepo, realDir) || await hasGitAncestor(realDir)) return "IN_REPOSITORY";

    const manifestPath = path.join(realDir, "manifest.json");
    const manifest = await readManifestSafely(manifestPath);
    if (!manifest) return "INVALID_MANIFEST";
    if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) return "INVALID_MANIFEST";
    if (
      Object.keys(manifest).sort().join(",") !==
        ["exported_at_utc", "files", "project_ref", "restore_verified"].sort().join(",") ||
      manifest.project_ref !== expectedRef ||
      manifest.restore_verified !== false ||
      !/^\d{8}T\d{6}Z$/.test(manifest.exported_at_utc || "") ||
      !Array.isArray(manifest.files) || manifest.files.length !== 3
    ) return "INVALID_MANIFEST";

    const seen = new Set();
    for (const entry of manifest.files) {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) return "INVALID_MANIFEST";
      if (Object.keys(entry).sort().join(",") !== ["bytes", "file", "sha256"].sort().join(",")) {
        return "INVALID_MANIFEST";
      }
      if (!REQUIRED.has(entry.file) || seen.has(entry.file)) return "INVALID_MANIFEST";
      seen.add(entry.file);
      if (!Number.isSafeInteger(entry.bytes) || entry.bytes <= 0 || !/^[a-fA-F0-9]{64}$/.test(entry.sha256 || "")) {
        return "INVALID_MANIFEST";
      }
      const file = path.join(realDir, entry.file);
      const actual = await hashFileSafely(file, entry.bytes);
      if (!actual || !crypto.timingSafeEqual(actual, Buffer.from(entry.sha256, "hex"))) {
        return "EXPORT_MISMATCH";
      }
    }
    return seen.size === REQUIRED.size ? "EXPORT_INTEGRITY_PASS_RESTORE_UNVERIFIED" : "INVALID_MANIFEST";
  } catch {
    // Never print exception messages: private paths or metadata can appear in them.
    return "READ_OR_PARSE_FAILED";
  }
}

module.exports = { checkExport };

if (require.main === module) {
  checkExport(process.argv[2], process.env.TAD_EXPECTED_SUPABASE_PROJECT_REF)
    .then((code) => {
      if (code === "EXPORT_INTEGRITY_PASS_RESTORE_UNVERIFIED") {
        console.log(code + ": 3 private SQL components checked. No DB connection or restore attempted.");
      } else {
        console.error("TAD_BACKUP_EXPORT_REFUSED (" + code + "). No DB connection attempted.");
        process.exitCode = 1;
      }
    })
    .catch(() => {
      console.error("TAD_BACKUP_EXPORT_REFUSED (UNEXPECTED_ERROR).");
      process.exitCode = 1;
    });
}
