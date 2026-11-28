"use strict";

// Repository-controlled release hold. No environment override and no network.
const fs = require("node:fs");
const path = require("node:path");

function assertReleaseAllowed(manifest) {
  if (
    !manifest ||
    manifest.version !== 1 ||
    manifest.state !== "REVIEWED_RELEASE_ALLOWED" ||
    !Number.isSafeInteger(manifest.recoveryReview) ||
    manifest.recoveryReview <= 0
  ) {
    throw new Error("API_RELEASE_HOLD: reviewed recovery release approval required");
  }
}

function run() {
  const manifest = JSON.parse(fs.readFileSync(
    path.join(__dirname, "api-production-release-hold.json"), "utf8",
  ));
  assertReleaseAllowed(manifest);
}

module.exports = { assertReleaseAllowed, run };

if (require.main === module) {
  try {
    run();
    console.log("API_RELEASE_HOLD_CLEARED_BY_REVIEW");
  } catch {
    console.error("API_RELEASE_HOLD: publication refused; review #217 and #627");
    process.exitCode = 1;
  }
}
