"use strict";

const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const schema = read("prisma/schema.prisma");
const media = read("src/modules/media/media.service.ts");
const campaign = read("src/modules/campaign/campaign.service.ts");
const campaignController = read("src/modules/campaign/campaign.controller.ts");
const finance = read("src/modules/finance/finance.service.ts");
const financeController = read("src/modules/finance/finance.controller.ts");
const advertisers = read("src/modules/advertisers/advertisers.service.ts");

test("Media uses exactly one Prisma field for physical mime_type", () => {
  const start = schema.indexOf("model Media {");
  const end = schema.indexOf("\n}", start);
  const model = schema.slice(start, end);
  assert.match(model, /mimeType\s+String\?\s+@map\("mime_type"\)/);
  assert.doesNotMatch(model, /\bmime_type\s+String\?/);
  assert.equal(
    (model.match(/@map\("mime_type"\)/g) || []).length,
    1,
  );
});

test("all Prisma Media selections use mapped mimeType, not an absent column", () => {
  for (const file of [campaign, campaignController, finance, financeController]) {
    assert.match(file, /mimeType: true/);
    assert.doesNotMatch(file, /mime_type: true/);
  }
});

test("HTTP response keeps legacy mime_type alias without querying phantom column", () => {
  assert.match(media, /mime_type: media\.mimeType/);
  assert.doesNotMatch(media, /media\.mime_type/);
  assert.match(advertisers, /type: m\.mimeType/);
  assert.doesNotMatch(advertisers, /m\.mime_type/);
});

test("canonical MIME writes still use the Prisma model field", () => {
  assert.match(media, /mimeType: data\.contentType/);
  assert.match(media, /mimeType,/);
});
