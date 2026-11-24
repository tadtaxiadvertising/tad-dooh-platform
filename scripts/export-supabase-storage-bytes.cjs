#!/usr/bin/env node
"use strict";

// Operator-only backup helper for incident #217. READ ONLY against Supabase.
// A successful export is not proof of complete source inventory, off-site
// encryption, managed Auth recovery, or a restored application.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const MAX_INVENTORY_BYTES = 8 * 1024 * 1024;
const MAX_OBJECTS = 100000;
const MAX_OBJECT_BYTES = 10 * 1024 * 1024 * 1024;
const REF = /^[a-z0-9]{20}$/;
const COUNT = /^(0|[1-9][0-9]*)$/;
const BUCKET = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/;
const TIMESTAMP = /^\d{8}T\d{6}Z$/;
const SUCCESS = "STORAGE_EXPORT_HASHED_SOURCE_COVERAGE_AND_RESTORE_UNVERIFIED";

function safeCount(value) {
  return typeof value === "string" && COUNT.test(value) &&
    Number.isSafeInteger(Number(value)) ? Number(value) : null;
}
function ownKeys(record, expected) {
  return record && typeof record === "object" && !Array.isArray(record) &&
    Object.keys(record).length === expected.length &&
    expected.every(key => Object.hasOwn(record, key));
}
function isSafeName(name) {
  return typeof name === "string" && name.length > 0 && name.length <= 2048 &&
    !/[\x00-\x1f\x7f]/.test(name) &&
    name.split("/").every(seg => seg && seg !== "." && seg !== "..");
}
function validateInventory(data, ref, count) {
  if (!ownKeys(data, ["project_ref", "captured_at_utc", "objects"]) ||
      data.project_ref !== ref || !TIMESTAMP.test(data.captured_at_utc) ||
      !Array.isArray(data.objects) || data.objects.length !== count ||
      data.objects.length > MAX_OBJECTS) return null;
  const keys = new Set();
  for (const o of data.objects) {
    if (!ownKeys(o, ["bucket_id", "object_name", "bytes"]) ||
        typeof o.bucket_id !== "string" || !BUCKET.test(o.bucket_id) ||
        !isSafeName(o.object_name) || !Number.isSafeInteger(o.bytes) ||
        o.bytes < 0 || o.bytes > MAX_OBJECT_BYTES) return null;
    const key = JSON.stringify([o.bucket_id, o.object_name]);
    if (keys.has(key)) return null;
    keys.add(key);
  }
  return data;
}
async function noGitAncestor(dir) {
  for (let current = dir; ; current = path.dirname(current)) {
    try { await fs.promises.lstat(path.join(current, ".git")); return false; }
    catch (e) { if (e.code !== "ENOENT") return false; }
    if (current === path.dirname(current)) return true;
  }
}
function validateConfig(env) {
  const ref = env.TAD_EXPECTED_SUPABASE_PROJECT_REF;
  const count = safeCount(env.TAD_EXPECTED_STORAGE_OBJECT_COUNT);
  if (!REF.test(ref || "") || count === null || count > MAX_OBJECTS) return null;
  if (env.TAD_APPROVE_STORAGE_READONLY_EXPORT !== "YES" ||
      env.TAD_ROTATED_SUPABASE_KEY_CONFIRMED !== "YES" ||
      env.TAD_ENCRYPTED_BACKUP_VOLUME_CONFIRMED !== "YES") return null;
  if (!env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY.length < 20) return null;
  if (env.SUPABASE_URL !== "https://" + ref + ".supabase.co") return null;
  const inv = env.TAD_PRIVATE_STORAGE_INVENTORY_FILE;
  const dest = env.TAD_PRIVATE_STORAGE_EXPORT_DIR;
  if (typeof inv !== "string" || typeof dest !== "string" ||
      !path.isAbsolute(inv) || !path.isAbsolute(dest) ||
      inv.trim() !== inv || dest.trim() !== dest) return null;
  return { ref, count, inv: path.resolve(inv), dest: path.resolve(dest) };
}
function objectUrl(ref, bucketId, name) {
  const segments = [bucketId, ...name.split("/")];
  return "https://" + ref + ".supabase.co/storage/v1/object/authenticated/" +
    segments.map(x => encodeURIComponent(x)).join("/");
}
async function exportStorage(env, { fetchImpl = globalThis.fetch, checkStorageExportImpl } = {}) {
  const cfg = validateConfig(env);
  if (!cfg || typeof fetchImpl !== "function") return "INVALID_PRIVATE_CONFIG";
  let initialized = false;
  try {
    const stat = await fs.promises.lstat(cfg.inv);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 ||
        stat.size === 0 || stat.size > MAX_INVENTORY_BYTES) return "INVALID_INVENTORY";
    const deststat = await fs.promises.lstat(path.dirname(cfg.dest));
    if (!deststat.isDirectory() || deststat.isSymbolicLink() ||
        await fs.promises.realpath(path.dirname(cfg.dest)) !== path.dirname(cfg.dest) ||
        await fs.promises.realpath(path.dirname(cfg.inv)) !== path.dirname(cfg.inv) ||
        !await noGitAncestor(path.dirname(cfg.dest)) ||
        !await noGitAncestor(path.dirname(cfg.inv))) return "UNSAFE_EXPORT_LOCATION";
    // Read through one descriptor, resisting a file-to-symlink swap.
    const input = await fs.promises.open(cfg.inv,
      fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0));
    let inv;
    try {
      const opened = await input.stat();
      if (!opened.isFile() || opened.nlink !== 1 ||
          opened.ino !== stat.ino || opened.dev !== stat.dev ||
          opened.size !== stat.size) return "INVALID_INVENTORY";
      const chunks = [];
      let total = 0;
      for await (const chunk of input.createReadStream({ autoClose: false })) {
        total += chunk.length;
        if (total > MAX_INVENTORY_BYTES) return "INVALID_INVENTORY";
        chunks.push(chunk);
      }
      const after = await input.stat();
      const named = await fs.promises.lstat(cfg.inv);
      if (after.ino !== opened.ino || after.dev !== opened.dev ||
          after.size !== opened.size || after.mtimeMs !== opened.mtimeMs ||
          !named.isFile() || named.isSymbolicLink() ||
          named.ino !== after.ino || named.dev !== after.dev) return "INVALID_INVENTORY";
      inv = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } finally { await input.close(); }
    if (!validateInventory(inv, cfg.ref, cfg.count)) return "INVALID_INVENTORY";
    // A nonexisting directory is required; do not overwrite a prior backup.
    await fs.promises.mkdir(cfg.dest, { mode: 0o700 });
    initialized = true;
    await fs.promises.mkdir(path.join(cfg.dest, "objects"), { mode: 0o700 });
    const output = [];
    for (const [i, item] of inv.objects.entries()) {
      const relative = "objects/" + (i+1).toString(16).padStart(16,"0") + ".blob";
      const absolute = path.join(cfg.dest, relative);
      const url = objectUrl(cfg.ref, item.bucket_id, item.object_name);
      const response = await fetchImpl(url, {
        method: "GET", redirect: "error", cache: "no-store",
        headers: { Authorization: "Bearer " + env.SUPABASE_SERVICE_ROLE_KEY,
          apikey: env.SUPABASE_SERVICE_ROLE_KEY },
        signal: AbortSignal.timeout(120000),
      });
      if (!response || response.status !== 200 || !response.body) return "REMOTE_OBJECT_READ_FAILED";
      const handle = await fs.promises.open(absolute,
        fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | (fs.constants.O_NOFOLLOW || 0), 0o600);
      const digest = crypto.createHash("sha256");
      let bytes = 0;
      try {
        for await (const chunk of response.body) {
          const buf = Buffer.from(chunk);
          bytes += buf.length;
          if (bytes > item.bytes || bytes > MAX_OBJECT_BYTES) return "REMOTE_BYTES_SIZE_MISMATCH";
          digest.update(buf);
          let offset = 0;
          while (offset < buf.length) {
            const { bytesWritten } = await handle.write(buf, offset, buf.length - offset);
            if (bytesWritten < 1) return "EXPORT_INCOMPLETE_RESTRICTED_DIRECTORY";
            offset += bytesWritten;
          }
        }
        await handle.sync();
      } finally { await handle.close(); }
      if (bytes !== item.bytes) return "REMOTE_BYTES_SIZE_MISMATCH";
      output.push({ bucket_id: item.bucket_id, object_name: item.object_name,
        file: relative, bytes, sha256: digest.digest("hex") });
    }
    const manifest = { project_ref: cfg.ref, exported_at_utc: inv.captured_at_utc,
      restore_verified: false, source_object_count: cfg.count, files: output };
    await fs.promises.writeFile(path.join(cfg.dest, "storage-manifest.json"),
      JSON.stringify(manifest), { flag: "wx", mode: 0o600 });
    // Postcondition matches the existing independently tested offline verifier.
    const checkStorageExport = checkStorageExportImpl ||
      require("./verify-supabase-storage-byte-export.cjs").checkStorageExport;
    const verdict = await checkStorageExport(cfg.dest, cfg.ref, String(cfg.count));
    if (verdict !== "STORAGE_BYTES_HASHED_COVERAGE_AND_RESTORE_UNVERIFIED")
      return "EXPORTED_BYTES_CHECK_FAILED";
    return SUCCESS;
  } catch {
    return initialized ? "EXPORT_INCOMPLETE_RESTRICTED_DIRECTORY" : "EXPORT_PRECHECK_FAILED";
  }
}
module.exports = { exportStorage, validateInventory, validateConfig, objectUrl, SUCCESS };

if (require.main === module) {
  exportStorage(process.env).then(code => {
    if (code === SUCCESS) {
      console.log(code + ": source snapshot consistency, managed Auth restore, off-site encryption and isolated application restore NOT VERIFIED.");
      // Never propagate this partial backup as a successful release gate.
      process.exitCode = 2;
    } else {
      console.error("TAD_STORAGE_EXPORT_REFUSED (" + code + "). Private paths, bucket names and credentials withheld.");
      process.exitCode = 1;
    }
  }).catch(() => {
    console.error("TAD_STORAGE_EXPORT_REFUSED (UNEXPECTED_FAILURE).");
    process.exitCode = 1;
  });
}
