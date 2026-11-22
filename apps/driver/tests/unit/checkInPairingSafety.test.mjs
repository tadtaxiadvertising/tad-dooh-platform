import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const checkIn = readFileSync(path.join(root, "apps/driver/pages/check-in.tsx"), "utf8");
const gateway = readFileSync(path.join(root, "packages/services/mobile-gateway.ts"), "utf8");

test("an untrusted QR remains a locator, never the authenticated telemetry device ID", () => {
  assert.match(checkIn, /startTadTracking\(id, apiBaseUrl\)/);
  assert.doesNotMatch(
    checkIn,
    /localStorage\s*\.\s*setItem\s*\(\s*["'`]TAD_DEVICE_ID["'`]/,
  );
});

test("check-in clearly distinguishes local GPS collection from a secure pairing", () => {
  assert.match(checkIn, /Emparejamiento pendiente/);
  assert.match(checkIn, /QR detectado · sin vincular/);
  assert.match(checkIn, /ENVÍO PENDIENTE/);
  assert.doesNotMatch(checkIn, /LINK_OK|Dispositivo Enlazado/);
});

test("gateway exposes only in-memory device credential status, not a scanned QR", () => {
  assert.match(gateway, /hasDeviceCredential:\s*currentCredential\s*!==\s*null/);
  assert.match(checkIn, /hasDeviceCredential:\s*false/);
  assert.match(gateway, /currentCredential = \{ \.\.\.credential \};[\s\S]*?emitState\(currentStatus, currentError\)/);
});
