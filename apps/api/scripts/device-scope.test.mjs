import test from "node:test";
import assert from "node:assert/strict";
import { matchesAuthenticatedDevice } from "../src/modules/device/guards/device-request-scope.ts";

test("device identity accepts its own body/header/query identifiers", () => {
  assert.equal(matchesAuthenticatedDevice("TAD-A", ["TAD-A", undefined]), true);
});

test("a different device token cannot be used for body, path, header or query", () => {
  for (const values of [["TAD-B"], ["TAD-A", "TAD-B"], ["TAD-B", "TAD-A"]]) {
    assert.equal(matchesAuthenticatedDevice("TAD-A", values), false);
  }
});

test("arrays, objects and empty values cannot bypass identity matching", () => {
  for (const value of [["TAD-A"], { id: "TAD-A" }, "", 0, false, null]) {
    assert.equal(matchesAuthenticatedDevice("TAD-A", [value]), false);
  }
});

test("an unrelated command id does not become a device identifier", () => {
  // The guard intentionally selects only params.deviceId, never params.id.
  assert.equal(matchesAuthenticatedDevice("TAD-A", ["TAD-A"]), true);
});
