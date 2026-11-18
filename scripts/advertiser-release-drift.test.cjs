"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { checkUrl, inspectHtml, probe } = require("./advertiser-release-drift.cjs");

test("probe is restricted to canonical public root or HTTP loopback", () => {
  assert.equal(checkUrl("https://tad.anunciante.ibusiness.com.do/"),
    "https://tad.anunciante.ibusiness.com.do/");
  assert.equal(checkUrl("http://127.0.0.1:3993/"), "http://127.0.0.1:3993/");
  for (const url of [
    "https://example.com/",
    "https://tad.anunciante.ibusiness.com.do.evil.test/",
    "http://tad.anunciante.ibusiness.com.do/",
    "https://tad.anunciante.ibusiness.com.do:444/",
    "https://tad.anunciante.ibusiness.com.do/?token=123",
    "https://user:pass@tad.anunciante.ibusiness.com.do/",
    "http://localhost:3993/private",
    "file:///etc/passwd",
  ]) assert.throws(() => checkUrl(url), /Target must/);
});

test("V6 marker and hero must both exist in server HTML", () => {
  assert.deepEqual(inspectHtml('<section id="motion-story"></section><h1>Tu marca no espera.<br/>Va a su encuentro.</h1>'), {
    version: "motion-v6", hasStory: true, hasHeadline: true, oldHeadline: false,
  });
  assert.equal(inspectHtml("<h1>Tu marca, en primera fila.</h1>").version, "pre-v6");
  assert.equal(inspectHtml('<section id="motion-story"></section>').version, "unknown");
});

function fakeResponse(body, {
  status = 200, contentType = "text/html", length = "0",
} = {}) {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: new Map([["content-type", contentType], ["content-length", length]]),
    text: async () => body,
  };
}

test("probe distinguishes V6, old deploy, and transport errors without redirects", async () => {
  const root = "http://127.0.0.1:3993/";
  const good = '<section id="motion-story">Tu marca no espera. Va a su encuentro.</section>';
  let options;
  const current = await probe(root, async (_, args) => {
    options = args;
    return fakeResponse(good);
  });
  assert.equal(current.exitCode, 0);
  assert.equal(current.version, "motion-v6");
  assert.equal(options.redirect, "manual");
  assert.equal(options.cache, "no-store");
  assert.equal((await probe(root, async () => fakeResponse("en primera fila."))).exitCode, 2);
  assert.equal((await probe(root, async () => fakeResponse("", { status: 503 }))).exitCode, 3);
  assert.equal((await probe(root, async () => fakeResponse(good, {
    contentType: "application/json",
  }))).exitCode, 3);
  assert.equal((await probe(root, async () => fakeResponse(good, {
    length: "2097152",
  }))).exitCode, 3);
  assert.equal((await probe(root, async () => { throw new Error("offline"); })).exitCode, 3);
});
