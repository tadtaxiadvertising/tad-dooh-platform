"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { checkUrl, inspectHtml, inspectMilestone, probe } = require("./advertiser-release-drift.cjs");

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


const v6 = '<section id="motion-story"></section><h1>Tu marca no espera. Va a su encuentro.</h1>';
const sectors = ["Restaurante", "Comercio", "Evento", "Inmobiliaria", "Hotel", "Servicios"];
const cabin = '<div data-cabin-illustration="true"></div>';
const creative = '<div data-qr-creative="true"></div>';
const control = '<button aria-controls="qr-demo-destination">Simular escaneo del QR</button>';
const choices = sectors.map(label => '<button type="button">' + label + '</button>').join("");
const qrSection = content => '<section id="interaccion-qr">' + content + '</section>';
const complete = v6 + cabin + qrSection(creative + control + choices);

test("milestone confirms actual SSR feature markers, not just original V6 copy", () => {
  assert.deepEqual(inspectMilestone(complete), {
    milestone: "v6-582",
    markers: { cabin: true, qrCreative: true, scanControl: true },
    missingSectors: [],
    confirmed: true,
  });
  for (const marker of [cabin, creative, control, '<button type="button">Hotel</button>']) {
    assert.equal(inspectMilestone(complete.replace(marker, "")).confirmed, false);
  }
  assert.deepEqual(inspectMilestone(complete.replace('<button type="button">Hotel</button>', "")).missingSectors, ["Hotel"]);
  assert.equal(inspectMilestone(v6 + cabin + qrSection(creative + control) + choices).confirmed, false);
  assert.equal(inspectMilestone(v6 + '<script>' + JSON.stringify(complete) + '</script>').confirmed, false);
  assert.equal(inspectMilestone(v6 + '<!--' + complete + '-->').confirmed, false);
  assert.equal(inspectHtml('<script>' + JSON.stringify(v6) + '</script>').version, "unknown");
});

test("strict milestone probe rejects stale V6, preserving legacy exit code behavior", async () => {
  const root = "http://127.0.0.1:3993/";
  const options = { requireMilestone: true };
  const old = await probe(root, async () => fakeResponse(v6));
  assert.equal(old.exitCode, 0);
  assert.equal(old.milestone.confirmed, false);
  const strict = await probe(root, async () => fakeResponse(v6), options);
  assert.equal(strict.exitCode, 2);
  assert.equal(strict.reason, "milestone-drift");
  const current = await probe(root, async () => fakeResponse(complete), options);
  assert.equal(current.exitCode, 0);
  assert.equal(current.milestone.confirmed, true);
  assert.equal((await probe(root, async () => fakeResponse(complete, { status: 302 }), options)).exitCode, 3);
});
