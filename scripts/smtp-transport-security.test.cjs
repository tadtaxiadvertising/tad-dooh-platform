"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createRequire } = require("node:module");
const vm = require("node:vm");
const os = require("node:os");

const ROOT = path.resolve(__dirname, "..");
const apiRequire = createRequire(path.join(ROOT, "apps/api/package.json"));
const nodemailer = apiRequire("nodemailer");
const pkg = apiRequire("nodemailer/package.json");

function loadEmailService(sendMail, onOptions, delays = []) {
  const ts = require("typescript");
  const filename = path.join(ROOT, "apps/api/src/modules/notifications/email.service.ts");
  const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
      experimentalDecorators: true, emitDecoratorMetadata: false,
    },
    fileName: filename,
  }).outputText;
  const loaded = { exports: {} };
  const fixtureRequire = name => {
    if (name === "nodemailer") return { createTransport: options => { onOptions(options); return { sendMail }; } };
    if (name === "@nestjs/common") return {
      Injectable: () => value => value,
      Logger: class { log() {} warn() {} debug() {} error() {} },
    };
    throw new Error("Unexpected service dependency in isolated SMTP fixture: " + name);
  };
  vm.runInNewContext(compiled, {
    module: loaded, exports: loaded.exports, require: fixtureRequire,
    process: { env: { SMTP_HOST: "smtp.fixture.invalid", SMTP_PORT: "587", SMTP_USER: "fixture", SMTP_PASSWORD: "fixture", SMTP_FROM: "sender@example.invalid" } },
    setTimeout: (callback, delay) => { delays.push(delay); return setImmediate(callback); },
  }, { filename, timeout: 1000 });
  return new loaded.exports.EmailService({ systemError: { create: async () => ({}) } });
}

test("real EmailService preserves PDF composition and retry while denying external reads", async () => {
  const transport = nodemailer.createTransport({
    streamTransport: true, buffer: true, disableFileAccess: true, disableUrlAccess: true,
  });
  let options;
  let attempts = 0;
  let rendered;
  const delays = [];
  const service = loadEmailService(async message => {
    attempts += 1;
    if (attempts < 3) throw new Error("Synthetic retryable transport failure");
    const result = await transport.sendMail(message);
    rendered = result.message;
    return result;
  }, value => { options = value; }, delays);
  try {
    service.onModuleInit();
    assert.equal(options.disableFileAccess, true);
    assert.equal(options.disableUrlAccess, true);
    assert.equal(options.pool, true);
    assert.equal(options.maxConnections, 3);
    const result = await service.sendEmail({
      to: "receiver@example.invalid", subject: "Synthetic PDF", html: "<p>Local fixture</p>",
      attachments: [{ filename: "fixture.pdf", content: Buffer.from("%PDF-1.4 fixture"), contentType: "application/pdf" }],
    });
    assert.equal(result.success, true);
    assert.equal(attempts, 3);
    assert.deepEqual(delays, [1000, 2000]);
    assert.match(rendered.toString(), /application\/pdf/);
    assert.match(rendered.toString(), /fixture\.pdf/);
  } finally {
    transport.close();
  }
});

test("API mailer uses a patched maintained Nodemailer and its bundled types", () => {
  const api = JSON.parse(fs.readFileSync(path.join(ROOT, "apps/api/package.json"), "utf8"));
  // A later patched 10.x release is valid; never pin this security check
  // to a stale literal version while the lockfile advances.
  const declared = /^\^10\.(\d+)\.(\d+)$/.exec(api.dependencies.nodemailer);
  assert.ok(declared, "Nodemailer must declare a bounded ^10.x.y release.");
  const [, declaredMinor, declaredPatch] = declared.map(Number);
  assert.ok(
    declaredMinor > 3 || (declaredMinor === 3 && declaredPatch >= 1),
    "Declared Nodemailer minimum must be at least 10.3.1",
  );
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

test("message-level raw cannot bypass disabled filesystem access", async () => {
  const fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), "tad-mail-security-"));
  const fixturePath = path.join(fixtureDir, "fixture.eml");
  fs.writeFileSync(fixturePath, "From: fixture@example.invalid\r\n\r\nSynthetic local fixture");
  const transport = nodemailer.createTransport({
    streamTransport: true, buffer: true, disableFileAccess: true, disableUrlAccess: true,
  });
  try {
    await assert.rejects(transport.sendMail({
      from: "fixture@example.invalid", to: "receiver@example.invalid",
      raw: { path: fixturePath },
    }), /file access|disabled|rejected|not permitted/i);
  } finally {
    transport.close();
    fs.unlinkSync(fixturePath);
    fs.rmdirSync(fixtureDir);
  }
});

test("temporary write-capable generator must not reach the merge candidate", () => {
  assert.equal(fs.existsSync(path.join(ROOT,
    ".github/workflows/smtp-security-lock-generator.yml")), false);
});
