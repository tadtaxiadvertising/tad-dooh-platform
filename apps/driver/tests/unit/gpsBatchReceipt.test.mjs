import test from "node:test";
import assert from "node:assert/strict";
import { isCompleteGpsBatchReceipt } from "../../lib/gps-batch-receipt.ts";

function response(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

test("complete new GPS insert has durable receipt", async () => {
  assert.equal(
    await isCompleteGpsBatchReceipt(response({ count: 2, input: 2 }), 2),
    true,
  );
});

test("fully deduplicated retries are acknowledged without deleting unrelated points", async () => {
  assert.equal(
    await isCompleteGpsBatchReceipt(response({ count: 0, input: 2 }), 2),
    true,
  );
});

test("partial/ambiguous/malformed receipts never ACK offline GPS", async () => {
  for (const body of [
    { count: 2 },
    { input: 2 },
    { count: 1, input: 1 },
    { count: 3, input: 2 },
    { count: -1, input: 2 },
    { count: 1.5, input: 2 },
    { count: "2", input: 2 },
    { success: true },
    null,
    [],
  ]) {
    assert.equal(await isCompleteGpsBatchReceipt(response(body), 2), false);
  }
});

test("HTTP 402 and 5xx cannot clear queued GPS", async () => {
  assert.equal(
    await isCompleteGpsBatchReceipt(response({ count: 2, input: 2 }, 402), 2),
    false,
  );
  assert.equal(
    await isCompleteGpsBatchReceipt(response({ count: 2, input: 2 }, 500), 2),
    false,
  );
});

test("unparseable JSON cannot acknowledge queued GPS", async () => {
  const broken = new Response("not JSON", { status: 200 });
  assert.equal(await isCompleteGpsBatchReceipt(broken, 1), false);
});

test("invalid expected batch size cannot clear GPS", async () => {
  assert.equal(await isCompleteGpsBatchReceipt(response({ count: 0, input: 0 }), 0), false);
  assert.equal(await isCompleteGpsBatchReceipt(response({ count: 1, input: 1 }), 1.5), false);
});
