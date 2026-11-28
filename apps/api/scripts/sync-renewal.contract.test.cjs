"use strict";

const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const root = path.resolve(__dirname, "../../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const controller = read("apps/api/src/modules/sync/sync.controller.ts");
const api = read("apps/api/src/modules/device/device.service.ts");
const player = read("apps/player/src/sync-manager.ts");
const syncModule = read("apps/api/src/modules/sync/sync.module.ts");
const deviceTokenGuard = read("apps/api/src/modules/device/guards/device-token.guard.ts");

function between(source, start, end) {
  const from = source.indexOf(start);
  assert.ok(from >= 0, `Missing method: ${start}`);
  const to = source.indexOf(end, from + start.length);
  assert.ok(to > from, `Missing end marker: ${end}`);
  return source.slice(from, to);
}

test("manifest never replies 304 before verifying device and subscription", () => {
  assert.doesNotMatch(controller, /HttpStatus\.NOT_MODIFIED/);
  assert.doesNotMatch(controller, /etagCache|resolveCachedEtag/);
  const manifest = between(controller, "async getDeviceManifest(", "\n  }");
  assert.match(manifest, /await this\.syncService\.getDeviceManifest\(deviceId\)/);
  assert.match(manifest, /"Cache-Control", "private, no-store"/);
});

test("delta and empty sync include refreshed licenses and pending commands", () => {
  const sync = between(api, "async syncDeviceCampaigns(", "async acknowledgeCommand(");
  const delta = between(sync, "if (lastHash && lastHash === payload.sync_hash)", "\n    }");
  const empty = between(sync, "if (!payload.media_assets || payload.media_assets.length === 0)", "\n    }");
  for (const response of [delta, empty]) {
    assert.match(response, /licenseToken/);
    assert.match(response, /expiresAt/);
    assert.match(response, /commands/);
  }
  assert.match(sync, /const commands = pendingCommands\.map/);
  assert.ok(
    sync.indexOf("const commands = pendingCommands.map") <
      sync.indexOf("this.prisma.deviceCommand.updateMany"),
    "Command JSON must be validated before status changes",
  );
});

test("player handles commands and JWT renewal before unchanged-media early return", () => {
  const sync = between(player, "async executeFullSync()", "async executeManifestSync()");
  const delta = sync.indexOf("if (!payload.update)");
  assert.ok(delta > 0);
  assert.ok(sync.indexOf("this.persistOfflineLicense(") < delta);
  assert.ok(sync.indexOf("this.onCommands(payload.commands)") < delta);
});

test("manifest path renews license before checking the media ETag", () => {
  const sync = between(player, "async executeManifestSync()", "private async postDeviceSync()");
  assert.ok(sync.indexOf("this.persistOfflineLicense(") < sync.indexOf("manifest.etag === this.lastSyncHash"));
  assert.match(sync, /response\.status === 402/);
  assert.match(sync, /response\.status === 403/);
});

test("server-blocked devices revoke JWT without wiping local media files", () => {
  const sync = between(player, "async executeFullSync()", "async executeManifestSync()");
  assert.match(sync, /this\.revokeOfflineLicense\(\)/);
  assert.match(player, /localStorage\.removeItem\("TAD_OFFLINE_LICENSE"\)/);
  const revoke = between(player, "private revokeOfflineLicense()", "private persistOfflineLicense(");
  assert.doesNotMatch(revoke, /evictStaleAssets|cacheVideos|indexedDB/);
});

test("manifest issuance requires a device-bound DEVICE_AUTH token", () => {
  // @Public skips the portal SupabaseAuthGuard only. A hardware guard MUST
  // still protect this endpoint before any OFFLINE_LICENSE is returned.
  assert.match(
    controller,
    /@Public\(\)\s*@UseGuards\(DeviceTokenGuard\)\s*@Get\(":deviceId"\)/,
    "The public manifest route must enforce DeviceTokenGuard",
  );
  assert.match(syncModule, /providers:\s*\[SyncService, DeviceTokenGuard\]/);
  assert.match(deviceTokenGuard, /if \(!token\)/);
  assert.match(deviceTokenGuard, /decoded\.type !== "DEVICE_AUTH"/);
  assert.match(deviceTokenGuard, /request\.params\?\.deviceId/);
  assert.match(
    deviceTokenGuard,
    /matchesAuthenticatedDevice\(deviceId, requestedDeviceIds\)/,
  );
  assert.match(deviceTokenGuard, /device\.status !== BUSINESS_RULES\.STATUS\.DEVICE\.ACTIVE/);
});
