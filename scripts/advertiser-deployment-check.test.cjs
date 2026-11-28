"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const ROOT = path.resolve(__dirname, "..");

function verifyFixture(options = {}) {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "tad-advertiser-verify-"));
  const bin = path.join(temp, "bin");
  fs.mkdirSync(bin);
  fs.mkdirSync(path.join(temp, "scripts"));
  fs.copyFileSync(path.join(ROOT, "verify-deployment.sh"), path.join(temp, "verify-deployment.sh"));
  if (options.withProbe !== false) {
    fs.writeFileSync(path.join(temp, "scripts", "advertiser-release-drift.cjs"), "// isolated fixture only\n");
  }
  const executable = (name, source) => {
    const filename = path.join(bin, name);
    fs.writeFileSync(filename, "#!/bin/sh\n" + source + "\n", { mode: 0o755 });
  };
  executable("dirname", 'if [ "$1" = "--" ]; then shift; fi; value="$1"; printf "%s\\n" "${value%/*}"');
  if (options.dns !== false) executable("getent", "exit 0");
  if (options.withCurl !== false) executable("curl", 'printf "200"');
  if (options.withNode !== false) executable("node", "exit " + String(options.releaseStatus ?? 0));
  const run = (...args) => spawnSync("/bin/bash", [path.join(temp, "verify-deployment.sh"), ...args], {
    cwd: temp,
    encoding: "utf8",
    timeout: 5000,
    env: { PATH: bin, HOME: temp, LC_ALL: "C" },
  });
  const dispose = () => fs.rmSync(temp, { recursive: true, force: true });
  return { run, dispose };
}

test("advertiser-only passes with DNS, HTTPS and V6 fingerprint without other services", () => {
  const ctx = verifyFixture();
  try {
    const result = ctx.run("--advertiser-only");
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.match(result.stdout, /Advertiser entrega TAD Motion V6/);
    assert.doesNotMatch(result.stdout, /API health|Player health|Driver \(canónico\)|CORS de los portales/);
  } finally { ctx.dispose(); }
});

for (const [name, options, phrase] of [
  ["older public HTML", { releaseStatus: 2 }, /HTML anterior o no reconocido/],
  ["transport or HTTP error", { releaseStatus: 3 }, /No se pudo verificar la versión pública/],
  ["missing Node", { withNode: false }, /Node.js es obligatorio/],
  ["missing curl", { withCurl: false }, /curl es obligatorio/],
  ["missing probe file", { withProbe: false }, /Falta scripts\/advertiser-release-drift/],
  ["DNS unresolved", { dns: false }, /DNS no resuelve/],
]) {
  test("advertiser-only fails closed: " + name, () => {
    const ctx = verifyFixture(options);
    try {
      const result = ctx.run("--advertiser-only");
      assert.equal(result.status, 1, result.stdout + result.stderr);
      assert.match(result.stdout, phrase);
    } finally { ctx.dispose(); }
  });
}

test("unknown mode and extra arguments are rejected before network activity", () => {
  const ctx = verifyFixture();
  try {
    for (const args of [["--unknown"], ["--advertiser-only", "--unexpected"]]) {
      const result = ctx.run(...args);
      assert.equal(result.status, 2, result.stdout + result.stderr);
      assert.match(result.stderr, /Uso: bash verify-deployment\.sh/);
    }
  } finally { ctx.dispose(); }
});
