"use strict";

const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const root = path.resolve(__dirname, "../../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const syncManager = read("apps/player/src/sync-manager.ts");
const main = read("apps/player/src/main.ts");
const service = read("apps/api/src/modules/device/device.service.ts");
const types = read("apps/player/src/types.ts");

function between(code, from, until) {
  const i = code.indexOf(from);
  assert.ok(i >= 0, `Missing code anchor: ${from}`);
  const end = code.indexOf(until, i + from.length);
  assert.ok(end > i, `Missing end anchor: ${until}`);
  return code.slice(i, end);
}

test("callback returns measured execution results, not a fire-and-forget void", () => {
  assert.match(types, /interface DeviceCommandResult/);
  assert.match(syncManager, /Promise<DeviceCommandResult\[\]>/);
  assert.match(main, /onCommands: async/);
  assert.match(main, /await kioskBridge\.handleCommand\(cmd\.type, cmd\.params\)/);
});

test("only successful delivered command IDs are acknowledged", () => {
  const method = between(syncManager, "async executeFullSync()", "async executeManifestSync()");
  const results = method.indexOf("await this.onCommands(payload.commands)");
  const acknowledgments = method.indexOf("await this.acknowledgeCommand(outcome.id)");
  assert.ok(results >= 0 && acknowledgments > results);
  assert.match(method, /if \(outcome\.success && delivered\.has\(outcome\.id\)\)/);
  assert.doesNotMatch(method, /this\.acknowledgeCommand\(cmd\.id\)/);
});

test("restart/reboot unknown outcomes cannot be ACKed as EXECUTED", () => {
  assert.match(main, /cmd\.type === "REBOOT" \|\| cmd\.type === "RESTART_APP"/);
  assert.match(main, /success: success && !irreversible/);
  assert.doesNotMatch(main, /syncManager\.executeFullSync\(\);\s*\}\s*else/);
});

test("ACK HTTP failures and unconfirmed receipts do not count as success", () => {
  const method = between(syncManager, "private async acknowledgeCommand(", "private setupNetworkListeners()");
  assert.match(method, /if \(!response\.ok\)/);
  assert.match(method, /if \(!receipt\.acknowledged\)/);
  assert.match(method, /JSON\.stringify\(\{ success: true \}\)/);
});

test("API ACK requires success and guarded one-way state transition", () => {
  const method = between(service, "async acknowledgeCommand(", "// M9: verifica");
  assert.match(method, /result\.success !== true/);
  assert.match(method, /where: \{ id: commandId, status: "PROCESSING" \}/);
  assert.match(method, /deviceCommand\.updateMany/);
  assert.match(method, /current\?\.status === "EXECUTED"/);
  assert.doesNotMatch(method, /deviceCommand\.update\(/);
});
