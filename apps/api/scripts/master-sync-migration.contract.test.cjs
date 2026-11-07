"use strict";

const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const apiRoot = path.resolve(__dirname, "..");
const migration = fs.readFileSync(
  path.join(apiRoot, "prisma/migrations/20261107_zz_restore_master_sync_view/migration.sql"),
  "utf8",
);
const prismaService = fs.readFileSync(
  path.join(apiRoot, "src/modules/prisma/prisma.service.ts"),
  "utf8",
);
const healthController = fs.readFileSync(
  path.join(apiRoot, "src/health/health.controller.ts"),
  "utf8",
);
const campaignService = fs.readFileSync(
  path.join(apiRoot, "src/modules/campaign/campaign.service.ts"),
  "utf8",
);
const formerBootstrapSql = fs.readFileSync(
  path.join(apiRoot, "prisma/views.sql"),
  "utf8",
);

test("startup never creates or drops the production master-sync view", () => {
  assert.doesNotMatch(prismaService, /initializeSreViews\s*\(/);
  assert.doesNotMatch(prismaService, /DROP MATERIALIZED VIEW/i);
  assert.match(prismaService, /pg_catalog\.pg_matviews/);
  assert.match(prismaService, /MASTER_SYNC_VIEW_UNAVAILABLE/);
  assert.match(healthController, /masterSyncViewReady/);
  assert.doesNotMatch(formerBootstrapSql, /^\s*(DROP|CREATE|ALTER)\s+/im);
});

test("additive migration declares the missing targeting dependencies", () => {
  assert.match(migration, /ADD COLUMN IF NOT EXISTS "target_all"/);
  assert.match(migration, /CREATE TABLE "public"."_CampaignToDriver"/);
  assert.match(migration, /CREATE MATERIALIZED VIEW "public"."mv_active_campaigns"/);
  assert.doesNotMatch(migration, /\bDROP\s+(TABLE|MATERIALIZED VIEW|SCHEMA)\b/i);
  assert.doesNotMatch(migration, /\bTRUNCATE\b/i);
});

test("unapproved, inactive and out-of-window campaigns are excluded", () => {
  assert.match(migration, /c\."status" = 'ACTIVE'/);
  assert.match(migration, /c\."active" = true/);
  assert.match(migration, /c\."start_date" <= now\(\)/);
  assert.match(migration, /c\."end_date" >= now\(\)/);
});

test("materialized view has required unique index and constrained grants", () => {
  assert.match(migration, /CREATE UNIQUE INDEX "idx_mv_campaigns_id"/);
  assert.match(migration, /REVOKE ALL ON TABLE "public"."mv_active_campaigns"/);
  assert.match(migration, /REVOKE ALL ON FUNCTION "public"."refresh_active_campaigns"/);
  assert.match(migration, /ENABLE ROW LEVEL SECURITY/);
});

test("hardware and driver targeting aggregates are retained", () => {
  for (const token of [
    "assigned_device_uuids",
    "assigned_hw_ids",
    "assigned_driver_ids",
    "device_campaigns",
    "playlist_items",
    "_CampaignToDriver",
  ]) {
    assert.ok(migration.includes(token), `Missing targeting dependency: ${token}`);
  }
});

test("fallback sync cannot serve campaigns pending payment or approval", () => {
  const block = campaignService.slice(
    campaignService.indexOf("Fallback to legacy query if view fails"),
  );
  assert.match(block, /status: "ACTIVE"/);
  assert.match(block, /active: true/);
});
