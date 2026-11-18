#!/usr/bin/env node
"use strict";

/**
 * Read-only release drift probe for the PUBLIC advertiser landing.
 *
 * No credentials, databases, cookies, environment variables or production writes.
 * Distinct exit codes: 0 = V6 confirmed, 2 = older/unexpected HTML,
 * 3 = transport/error response. Only the canonical public domain or loopback.
 */

const CANONICAL = "https://tad.anunciante.ibusiness.com.do/";
const MAX_HTML_BYTES = 1024 * 1024;

function checkUrl(raw) {
  const url = new URL(raw);
  const canonical = new URL(CANONICAL);
  const loopback = ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname);
  const publicOrigin = url.origin === canonical.origin;
  if ((!publicOrigin && !loopback) ||
      (publicOrigin && url.protocol !== "https:") ||
      (loopback && url.protocol !== "http:") ||
      url.pathname !== "/" || url.search || url.hash ||
      url.username || url.password) {
    throw new Error("Target must be the canonical advertiser root, or a plain HTTP loopback root.");
  }
  return url.href;
}

function inspectHtml(html) {
  const normalized = html.replace(/\s+/g, " ");
  const hasStory = /id=["']motion-story["']/.test(normalized);
  const hasHeadline = normalized.includes("Tu marca no espera.") &&
    normalized.includes("Va a su encuentro.");
  const oldHeadline = normalized.includes("en primera fila.");
  return {
    version: hasStory && hasHeadline ? "motion-v6" : oldHeadline ? "pre-v6" : "unknown",
    hasStory,
    hasHeadline,
    oldHeadline,
  };
}

async function probe(url, get = globalThis.fetch) {
  const address = checkUrl(url);
  let response;
  try {
    response = await get(address, {
      method: "GET",
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
      headers: {
        "accept": "text/html",
        "cache-control": "no-cache",
        "pragma": "no-cache",
      },
    });
  } catch (error) {
    return {
      exitCode: 3,
      reason: "transport-error",
      error: error instanceof Error ? error.name : "unknown",
    };
  }
  const headers = response.headers;
  const meta = {
    status: response.status,
    etag: headers?.get("etag") || null,
    cacheControl: headers?.get("cache-control") || null,
    age: headers?.get("age") || null,
    via: headers?.get("via") || null,
    cfCacheStatus: headers?.get("cf-cache-status") || null,
    // Intentionally do NOT print Set-Cookie, Authorization or request URLs with tokens.
  };
  if (!response.ok) return { exitCode: 3, reason: "http-error", ...meta };
  const type = headers?.get("content-type") || "";
  if (!type.toLowerCase().includes("text/html")) {
    return { exitCode: 3, reason: "unexpected-content-type", ...meta };
  }
  const length = Number(headers?.get("content-length") || "0");
  if (length > MAX_HTML_BYTES) {
    return { exitCode: 3, reason: "body-too-large", ...meta };
  }
  const html = await response.text();
  if (Buffer.byteLength(html, "utf8") > MAX_HTML_BYTES) {
    return { exitCode: 3, reason: "body-too-large", ...meta };
  }
  const fingerprint = inspectHtml(html);
  return {
    exitCode: fingerprint.version === "motion-v6" ? 0 : 2,
    reason: fingerprint.version === "motion-v6" ? "up-to-date" : "release-drift",
    ...fingerprint,
    ...meta,
  };
}

async function main(args = process.argv.slice(2)) {
  if (args.length > 1) throw new Error("Usage: node scripts/advertiser-release-drift.cjs [canonical-or-loopback-root]");
  const url = checkUrl(args[0] || CANONICAL);
  const result = await probe(url);
  process.stdout.write(JSON.stringify({
    target: new URL(url).hostname,
    ...result,
  }, null, 2) + "\n");
  process.exitCode = result.exitCode;
}

if (require.main === module) {
  main().catch(error => {
    process.stderr.write(error instanceof Error ? error.message + "\n" : "Probe failed\n");
    process.exitCode = 3;
  });
}
module.exports = { checkUrl, inspectHtml, probe };
