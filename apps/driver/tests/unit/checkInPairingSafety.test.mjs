import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const checkIns = ["driver", "admin", "advertiser"].map((portal) => ({
  portal,
  source: readFileSync(path.join(root, "apps", portal, "pages/check-in.tsx"), "utf8"),
}));
const gateway = readFileSync(path.join(root, "packages/services/mobile-gateway.ts"), "utf8");

test("a public QR never silently becomes a trusted telemetry device ID", () => {
  for (const { portal, source } of checkIns) {
    assert.match(source, /startTadTracking\(id, apiBaseUrl\)/, portal);
    assert.doesNotMatch(
      source,
      /localStorage\s*\.\s*setItem\s*\(\s*["'`]TAD_DEVICE_ID["'`]/,
      portal,
    );
  }
});

test("all check-in dashboards distinguish local GPS from secure pairing", () => {
  for (const { portal, source } of checkIns) {
    assert.match(source, /Emparejamiento pendiente/, portal);
    assert.match(source, /QR detectado · sin vincular/, portal);
    assert.match(source, /ENVÍO PENDIENTE/, portal);
    assert.match(source, /hasDeviceCredential:\s*false/, portal);
    assert.doesNotMatch(source, /LINK_OK|Dispositivo Enlazado/, portal);
  }
});

test("gateway derives credential status from memory, never a scanned QR", () => {
  assert.match(gateway, /hasDeviceCredential:\s*currentCredential\s*!==\s*null/);
  assert.match(
    gateway,
    /currentCredential = \{ \.\.\.credential \};[\s\S]*?emitState\(currentStatus, currentError\)/,
  );
});
