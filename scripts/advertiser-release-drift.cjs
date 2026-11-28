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

function renderedMarkup(html) {
  return html.replace(/<!--[\s\S]*?-->|<(script|style|template)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "");
}

function inspectHtml(html) {
  const normalized = renderedMarkup(html).replace(/\s+/g, " ");
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

// Check rendered markup, not serialized React payloads or comments.
// This confirms visible feature markers, not a particular Git commit or behavior.
function inspectMilestone(html) {
  const markup = renderedMarkup(html);
  const qr = markup.match(/<section\b[^>]*\sid=["']interaccion-qr["'][^>]*>[\s\S]*?<\/section\s*>/i)?.[0] || "";
  const markers = {
    cabin: /<div\b[^>]*\sdata-cabin-illustration(?:=["'][^"']*["'])?(?=[\s>])/i.test(markup),
    qrCreative: /<div\b[^>]*\sdata-qr-creative(?:=["'][^"']*["'])?(?=[\s>])/i.test(qr),
    scanControl: /<button\b[^>]*\saria-controls=["']qr-demo-destination["']/i.test(qr),
  };
  const labels = [...qr.matchAll(/<button\b[^>]*>([\s\S]*?)<\/button\s*>/gi)]
    .map(match => match[1].replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim());
  const missingSectors = ["Restaurante", "Comercio", "Evento", "Inmobiliaria", "Hotel", "Servicios"]
    .filter(label => !labels.includes(label));
  return {
    milestone: "v6-582",
    markers,
    missingSectors,
    confirmed: Object.values(markers).every(Boolean) && missingSectors.length === 0,
  };
}

async function probe(url, get = globalThis.fetch, { requireMilestone = false } = {}) {
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
  const milestone = inspectMilestone(html);
  const v6 = fingerprint.version === "motion-v6";
  const accepted = v6 && (!requireMilestone || milestone.confirmed);
  return {
    exitCode: accepted ? 0 : 2,
    reason: !v6 ? "release-drift" : !accepted ? "milestone-drift" : "up-to-date",
    ...fingerprint,
    milestone,
    ...meta,
  };
}

async function main(args = process.argv.slice(2)) {
  const requireMilestone = args.includes("--require-v6-582");
  const targets = args.filter(arg => arg !== "--require-v6-582");
  if (targets.length > 1 || args.length - targets.length > 1 || targets.some(arg => arg.startsWith("--"))) {
    throw new Error("Usage: node scripts/advertiser-release-drift.cjs [--require-v6-582] [canonical-or-loopback-root]");
  }
  const url = checkUrl(targets[0] || CANONICAL);
  const result = await probe(url, globalThis.fetch, { requireMilestone });
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
module.exports = { checkUrl, inspectHtml, inspectMilestone, probe };
