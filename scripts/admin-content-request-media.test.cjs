"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const exportsObject = {};
const helper = ts.transpileModule(read("apps/admin/lib/content-request-media.ts"), {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.CommonJS,
  },
}).outputText;
new Function("exports", helper)(exportsObject);
const { parseContentRequestMedia } = exportsObject;
const unavailable = { filename: null, url: null };

test("accepts legacy JSON and object media with a valid signed URL", () => {
  const media = { filename: "clip.mp4", url: "https://example.invalid/clip.mp4?x=a%2Bb&y=1" };
  assert.deepEqual(parseContentRequestMedia(media), media);
  assert.deepEqual(parseContentRequestMedia(JSON.stringify(media)), media);
  assert.deepEqual(parseContentRequestMedia({ filename: " clip.mp4 ", url: " http://example.invalid/a.mp4 " }),
    { filename: "clip.mp4", url: "http://example.invalid/a.mp4" });
});

test("malformed and primitive payloads never throw or produce a preview", () => {
  for (const value of [undefined, null, "{", "null", "[]", "42", '"text"', [], 42, {}, true]) {
    assert.deepEqual(parseContentRequestMedia(value), unavailable);
  }
});

test("filename must be text; a valid URL remains independently usable", () => {
  for (const filename of [null, {}, [], 17, true, "   "]) {
    assert.deepEqual(parseContentRequestMedia({ filename, url: "https://example.invalid/a" }),
      { filename: null, url: "https://example.invalid/a" });
  }
});

test("rejects non-web, relative, credential-bearing and malformed URLs", () => {
  // A reserved domain and purely synthetic userinfo. Construct with the URL
  // API so the fixture contains no stored credential-bearing connection URI.
  const credentialUrl = new URL("https://example.invalid/a");
  credentialUrl.username = "fixture";
  credentialUrl.password = "synthetic";
  for (const url of [
    undefined, null, {}, [], 42, "", "javascript:void(0)", "data:text/plain,hello",
    "blob:https://example.invalid/id", "file:///tmp/test", "//example.invalid/a",
    "/media/a", "https://", credentialUrl.href,
    "https://example.invalid/a b", "https://example.invalid\\a",
  ]) {
    assert.deepEqual(parseContentRequestMedia({ filename: "clip.mp4", url }),
      { filename: "clip.mp4", url: null });
  }
});

test("modal parses once, disables invalid preview and isolates the new tab", () => {
  const source = read("apps/admin/pages/admin/advertisers/requests.tsx");
  assert.equal((source.match(/parseContentRequestMedia\(selectedRequest\?\.data\)/g) || []).length, 1);
  assert.doesNotMatch(source, /JSON\.parse\(selectedRequest\.data\)/);
  assert.match(source, /disabled=\{!contentMedia\.url\}/);
  assert.match(source, /if \(contentMedia\.url\)/);
  assert.match(source, /"noopener,noreferrer"/);
  assert.match(source, /Vista previa no disponible/);
  assert.match(source, /Nombre no disponible/);
});

test("administrative approval and notes containment remain in place", () => {
  const source = read("apps/admin/pages/admin/advertisers/requests.tsx");
  assert.match(source, /request\.type === "GENERAL" && !request\.campaignId/);
  assert.match(source, /!canApprove\(selectedRequest\)/);
  assert.match(source, /Guardar notas sin aprobar/);
  assert.match(source, /handleAction\(selectedRequest\.id, "REJECTED"\)/);
});
