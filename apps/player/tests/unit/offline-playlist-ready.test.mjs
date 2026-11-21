import test from "node:test";
import assert from "node:assert/strict";
import { prepareOfflinePlaylist } from "../../src/offline-playlist-ready.ts";

const assets = Object.freeze([
  { id: "VIDEO-1", url: "https://example.invalid/one.mp4", checksum: "checksum-1" },
  { id: "VIDEO-2", url: "https://example.invalid/two.mp4", checksum: "checksum-2" },
]);

function fakeCache({ failed = 0, missing = false, errorAt } = {}) {
  const calls = [];
  const cache = {
    async cacheVideos(items) {
      calls.push("schedule");
      assert.equal(items, assets);
      if (errorAt === "schedule") throw new Error("SCHEDULE_FAILED");
      return { cached: items.length, failed };
    },
    async hasMissingAssets(items) {
      calls.push("verify");
      assert.equal(items, assets);
      if (errorAt === "verify") throw new Error("CACHE_READ_FAILED");
      return missing;
    },
    async evictStaleAssets(items) {
      calls.push("evict");
      assert.equal(items, assets);
      if (errorAt === "evict") throw new Error("EVICTION_FAILED");
      return 1;
    },
  };
  return { cache, calls };
}

test("worker scheduling success alone cannot activate or evict previous offline playlist", async () => {
  const { cache, calls } = fakeCache({ missing: true });
  assert.equal(await prepareOfflinePlaylist(cache, assets), false);
  assert.deepEqual(calls, ["schedule", "verify"]);
});

test("fully cached new playlist evicts stale videos only after verification", async () => {
  const { cache, calls } = fakeCache();
  assert.equal(await prepareOfflinePlaylist(cache, assets), true);
  assert.deepEqual(calls, ["schedule", "verify", "evict"]);
});

test("explicit failed downloads retain the currently playable offline cache", async () => {
  const { cache, calls } = fakeCache({ failed: 1 });
  assert.equal(await prepareOfflinePlaylist(cache, assets), false);
  assert.deepEqual(calls, ["schedule"]);
});

test("cache metadata read failure never causes eviction or playlist promotion", async () => {
  const { cache, calls } = fakeCache({ errorAt: "verify" });
  await assert.rejects(prepareOfflinePlaylist(cache, assets), /CACHE_READ_FAILED/);
  assert.deepEqual(calls, ["schedule", "verify"]);
});

test("failed eviction never returns a false success receipt", async () => {
  const { cache, calls } = fakeCache({ errorAt: "evict" });
  await assert.rejects(prepareOfflinePlaylist(cache, assets), /EVICTION_FAILED/);
  assert.deepEqual(calls, ["schedule", "verify", "evict"]);
});

test("an empty authorized playlist needs no new download and can clear playback", async () => {
  const { cache, calls } = fakeCache();
  assert.equal(await prepareOfflinePlaylist(cache, []), true);
  assert.deepEqual(calls, []);
});

test("a later cache-ready retry can promote the manifest without changing its assets", async () => {
  let missing = true;
  let evictions = 0;
  const cache = {
    async cacheVideos() { return { cached: 2, failed: 0 }; },
    async hasMissingAssets() { return missing; },
    async evictStaleAssets() { evictions++; return 1; },
  };
  assert.equal(await prepareOfflinePlaylist(cache, assets), false);
  assert.equal(evictions, 0);
  missing = false; // Worker has now committed both blobs to IndexedDB.
  assert.equal(await prepareOfflinePlaylist(cache, assets), true);
  assert.equal(evictions, 1);
});
