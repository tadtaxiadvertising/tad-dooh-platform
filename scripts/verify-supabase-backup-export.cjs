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

async function hashFile(file) {
  const digest = crypto.createHash("sha256");
  for await (const chunk of fs.createReadStream(file)) digest.update(chunk);
  return digest.digest("hex").toUpperCase();
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
    const manifestStat = await fs.promises.lstat(manifestPath);
    if (!manifestStat.isFile() || manifestStat.isSymbolicLink() || manifestStat.size > 16384) {
      return "INVALID_MANIFEST";
    }
    const manifest = JSON.parse(await fs.promises.readFile(manifestPath, "utf8"));
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
      const before = await fs.promises.lstat(file);
      if (!before.isFile() || before.isSymbolicLink() || before.size !== entry.bytes) return "EXPORT_MISMATCH";
      const actual = await hashFile(file);
      const after = await fs.promises.lstat(file);
      if (before.size !== after.size || before.mtimeMs !== after.mtimeMs) return "EXPORT_CHANGED_DURING_CHECK";
      if (!crypto.timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(entry.sha256, "hex"))) {
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
