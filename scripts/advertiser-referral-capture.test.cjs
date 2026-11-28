"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const source = fs.readFileSync(path.resolve(
  __dirname, "../apps/advertiser/components/advertiser/referral.ts"), "utf8");
const javascript = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;

function harness(search, options = {}) {
  const records = new Map(options.stored ? [["tad_adv_referral_code", options.stored]] : []);
  const sessionStorage = {
    getItem(key) {
      if (options.denyStorage) throw new Error("Storage disabled");
      return records.get(key) ?? null;
    },
    setItem(key, value) {
      if (options.denyStorage) throw new Error("Storage disabled");
      records.set(key, value);
    },
    removeItem(key) {
      if (options.denyStorage) throw new Error("Storage disabled");
      records.delete(key);
    },
  };
  const window = { location: { search } };
  const instance = { exports: {} };
  new Function("exports", "module", "window", "sessionStorage", javascript)(
    instance.exports, instance, window, sessionStorage);
  return { ...instance.exports, records, window };
}

test("the latest valid driver QR code overrides stale browser session attribution", () => {
  const ctx = harness("?ref=NEW-DRIVER_123", { stored: "OLDER-DRIVER" });
  assert.equal(ctx.captureReferralCode(), "NEW-DRIVER_123");
  assert.equal(ctx.records.get("tad_adv_referral_code"), "NEW-DRIVER_123");
});

test("ambiguous or unsafe query parameters cannot qualify a referral", () => {
  for (const search of [
    "?ref=one&ref=two", "?ref=", "?ref=%3Cscript%3E",
    "?ref=bad%20code", "?ref=" + "X".repeat(65),
  ]) {
    const ctx = harness(search, { stored: "PREVIOUS_CODE" });
    assert.equal(ctx.captureReferralCode(), null);
    assert.equal(ctx.records.size, 0, "Explicit invalid referral clears stale storage");
    ctx.window.location.search = "";
    assert.equal(ctx.captureReferralCode(), null, "Bare onboarding URL must not revive the old code");
  }
});

test("a valid code remains usable when browser storage is disabled", () => {
  const ctx = harness("?ref=VALID_DRIVER", { denyStorage: true });
  assert.equal(ctx.captureReferralCode(), "VALID_DRIVER");
  assert.equal(ctx.captureReferralCode(), "VALID_DRIVER");
});

test("removing referral information clears cached attribution", () => {
  const ctx = harness("?ref=VALID_DRIVER");
  assert.equal(ctx.captureReferralCode(), "VALID_DRIVER");
  ctx.clearReferralCode();
  assert.equal(ctx.records.size, 0);
  ctx.window.location.search = "";
  assert.equal(ctx.captureReferralCode(), null);
});

test("an explicit invalid link invalidates a previously captured code even without storage", () => {
  for (const denyStorage of [false, true]) {
    const ctx = harness("?ref=VALID_DRIVER", { denyStorage });
    assert.equal(ctx.captureReferralCode(), "VALID_DRIVER");
    ctx.window.location.search = "?ref=one&ref=two";
    assert.equal(ctx.captureReferralCode(), null);
    ctx.window.location.search = "";
    assert.equal(ctx.captureReferralCode(), null);
  }
});

test("a valid stored code survives a bare URL when no invalid link was received", () => {
  const ctx = harness("", { stored: "VALID_DRIVER" });
  assert.equal(ctx.captureReferralCode(), "VALID_DRIVER");
});
