"use strict";

const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const api = path.resolve(__dirname, "..");
const schema = fs.readFileSync(path.join(api, "prisma/schema.prisma"), "utf8");
const sql = fs.readFileSync(
  path.join(api, "prisma/migrations/20261107_zzzz_restore_operational_scalar_columns/migration.sql"),
  "utf8",
);

const expected = {
  devices: ["is_simulated"],
  drivers: [
    "cedula", "taxi_plate", "subscription_paid", "subscription_end",
    "onboarding_status", "referred_by", "password", "level",
    "consecutive_months_under_goal", "identidad_vehicular",
    "hardware_config", "insurance_accepted", "insurance_accepted_at",
    "contract_accepted", "contract_accepted_at", "agreement_version",
    "is_simulated", "referral_code", "bank_account",
  ],
  subscriptions: ["device_id", "valid_until", "paid_at", "is_simulated"],
  driver_locations: ["speed", "is_simulated"],
};
const modelNames = {
  devices: "Device",
  drivers: "Driver",
  subscriptions: "Subscription",
  driver_locations: "DriverLocation",
};

test("new migration restores precisely the approved 26 fields", () => {
  assert.equal((sql.match(/ADD COLUMN IF NOT EXISTS/g) || []).length, 26);
  for (const [table, fields] of Object.entries(expected)) {
    const marker = `ALTER TABLE "public"."${table}"`;
    const from = sql.indexOf(marker);
    assert.ok(from >= 0, `Missing table block ${table}`);
    const end = sql.indexOf(";", from);
    const ddl = sql.slice(from, end);
    for (const name of fields) {
      assert.ok(
        ddl.includes(`ADD COLUMN IF NOT EXISTS "${name}"`),
        `Missing ${table}.${name}`,
      );
    }
  }
});

test("each newly introduced column exists in the Prisma model mapping", () => {
  for (const [table, fields] of Object.entries(expected)) {
    const model = modelNames[table];
    const from = schema.indexOf(`model ${model} {`);
    const end = schema.indexOf("\n}", from);
    const block = schema.slice(from, end);
    for (const name of fields) {
      assert.ok(
        block.includes(`@map("${name}")`) ||
          new RegExp(`^\\s*${name}\\s+(?:String|DateTime|Json|Int|Float|Boolean)`, "m").test(block),
        `Missing model scalar ${table}.${name}`,
      );
    }
  }
});

test("no arbitrary financial expiry, destructive SQL or customer inserts", () => {
  assert.match(sql, /"valid_until" TIMESTAMP\(3\) NOT NULL/);
  assert.doesNotMatch(sql, /"valid_until"[^\n]*DEFAULT/);
  assert.doesNotMatch(sql, /^\s*(DROP|DELETE|TRUNCATE|INSERT)\b/im);
  assert.doesNotMatch(sql, /ALTER COLUMN\s+\w+\s+TYPE/i);
});

test("newly added driver and GPS flags are safe-by-default", () => {
  for (const flag of [
    "subscription_paid",
    "insurance_accepted",
    "contract_accepted",
    "is_simulated",
  ]) {
    assert.match(sql, new RegExp(`"${flag}" BOOLEAN NOT NULL DEFAULT false`));
  }
  assert.match(sql, /"onboarding_status" TEXT NOT NULL DEFAULT 'PENDING_AGREEMENT'/);
});
