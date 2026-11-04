"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createRequire } = require("node:module");

const ROOT = path.resolve(__dirname, "..");
const apiRequire = createRequire(path.join(ROOT, "apps/api/package.json"));
const nodemailer = apiRequire("nodemailer");
const pkg = apiRequire("nodemailer/package.json");

test("API mailer uses a patched maintained Nodemailer and its bundled types", () => {
  const api = JSON.parse(fs.readFileSync(path.join(ROOT, "apps/api/package.json"), "utf8"));
  assert.equal(api.dependencies.nodemailer, "^10.3.1");
  assert.equal(api.dependencies["@types/nodemailer"], undefined);
  const [major, minor, patch] = pkg.version.split(".").map(Number);
  assert.equal(major, 10);
  assert.ok(minor > 3 || (minor === 3 && patch >= 1),
    "Nodemailer must be at least 10.3.1");
});

test("EmailService prevents file or URL attachments at the transport boundary", () => {
  const source = fs.readFileSync(
    path.join(ROOT, "apps/api/src/modules/notifications/email.service.ts"), "utf8");
  assert.match(source, /disableFileAccess:\s*true/);
  assert.match(source, /disableUrlAccess:\s*true/);
  assert.match(source, /attachments:\s*options\.attachments\?\.map/);
});

test("stream-only fixture permits in-memory PDF attachments without SMTP", async () => {
  const transport = nodemailer.createTransport({
    streamTransport: true, buffer: true, disableFileAccess: true, disableUrlAccess: true
  });
  const out = await transport.sendMail({
    from: "fixture@example.invalid", to: "receiver@example.invalid",
    subject: "Fixture PDF", text: "Local-only mail security test",
    attachments: [{ filename: "fixture.pdf", content: Buffer.from("%PDF-1.4 fixture") }]
  });
  assert.ok(out.messageId);
  assert.ok(Buffer.isBuffer(out.message));
  transport.close();
});

test("blocked file and URL attachments cannot be loaded by mail composition", async () => {
  const transport = nodemailer.createTransport({
    streamTransport: true, buffer: true, disableFileAccess: true, disableUrlAccess: true
  });
  const standard = {
    from: "fixture@example.invalid", to: "receiver@example.invalid",
    subject: "Fixture denied", text: "Local-only test"
  };
  await assert.rejects(transport.sendMail({
    ...standard, attachments: [{ filename: "private", path: "/etc/hosts" }]
  }), /file access|disabled|rejected|not permitted/i);
  await assert.rejects(transport.sendMail({
    ...standard, attachments: [{
      filename: "remote", href: "http://127.0.0.1:1/not-a-real-endpoint"
    }]
  }), /url access|disabled|rejected|not permitted/i);
  transport.close();
});

test("temporary write-capable generator must not reach the merge candidate", () => {
  assert.equal(fs.existsSync(path.join(ROOT,
    ".github/workflows/smtp-security-lock-generator.yml")), false);
});
