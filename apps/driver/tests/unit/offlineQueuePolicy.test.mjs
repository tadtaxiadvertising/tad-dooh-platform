import test from "node:test";
import assert from "node:assert/strict";
import { classifyOfflineQueueStatus } from "../../lib/offlineQueuePolicy.ts";

test("409 retains the action and pauses FIFO processing", () => {
  assert.equal(classifyOfflineQueueStatus(409), "pause");
});

test("successful HTTP responses acknowledge queued actions", () => {
  for (const status of [200, 201, 202, 204, 299]) {
    assert.equal(classifyOfflineQueueStatus(status), "ack");
  }
});

test("authentication and subscription problems pause the queue", () => {
  for (const status of [401, 402]) {
    assert.equal(classifyOfflineQueueStatus(status), "pause");
  }
});

test("408, 425 and 429 never delete a pending offline request", () => {
  for (const status of [408, 425, 429]) {
    assert.equal(classifyOfflineQueueStatus(status), "pause");
  }
});

test("server and transport failures pause FIFO to preserve operation order", () => {
  for (const status of [0, -1, 500, 502, 503, 504, 599]) {
    assert.equal(classifyOfflineQueueStatus(status), "pause");
  }
});

test("unexpected redirects do not acknowledge a queued mutation", () => {
  for (const status of [301, 302, 307, 308]) {
    assert.equal(classifyOfflineQueueStatus(status), "pause");
  }
});

test("legacy terminal non-retryable 4xx are unchanged until dead-letter store", () => {
  for (const status of [400, 403, 404, 410, 422]) {
    assert.equal(classifyOfflineQueueStatus(status), "ack");
  }
});
