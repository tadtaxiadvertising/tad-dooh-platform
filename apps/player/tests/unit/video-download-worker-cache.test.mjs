import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const workerSource = readFileSync(
  new URL("../../src/workers/video-downloader.worker.js", import.meta.url),
  "utf8",
);

/** Deterministic, transaction-aware IndexedDB fixture; no network/devices. */
function makeWorker({ failCacheWrite = false, failFetch = false, emptyBlob = false } = {}) {
  const databases = new Map();
  const messages = [];
  let onMessage;
  function getDatabase(name) {
    if (databases.has(name)) return databases.get(name);
    const stores = new Map();
    const db = {
      stores,
      objectStoreNames: { contains: (key) => stores.has(key) },
      createObjectStore(key) { stores.set(key, new Map()); },
      transaction(storeName, mode) {
        const initial = stores.get(storeName);
        if (!initial) throw new Error("STORE_MISSING");
        let snapshot = new Map(initial);
        let pending = 0;
        let finished = false;
        const tx = {
          error: null, oncomplete: null, onabort: null, onerror: null,
          objectStore(nameOfStore) {
            assert.equal(nameOfStore, storeName);
            return {
              get(key) { return request(() => snapshot.get(key)); },
              getAll() { return request(() => Array.from(snapshot.values())); },
              put(value) {
                return request(() => {
                  if (failCacheWrite && name === "tad_video_cache") {
                    throw new Error("QUOTA_EXCEEDED");
                  }
                  snapshot.set(value.url ?? value.id, value);
                });
              },
              delete(key) { return request(() => snapshot.delete(key)); },
            };
          },
        };
        function request(operation) {
          const req = { result: undefined, error: null, onsuccess: null, onerror: null };
          pending++;
          queueMicrotask(() => {
            try {
              req.result = operation();
              req.onsuccess?.();
            } catch (error) {
              req.error = error;
              tx.error = error;
              finished = true;
              req.onerror?.();
              tx.onerror?.();
              tx.onabort?.();
            }
            pending--;
            if (pending === 0 && !finished) {
              queueMicrotask(() => {
                if (!finished && pending === 0) {
                  if (mode === "readwrite") stores.set(storeName, snapshot);
                  finished = true;
                  tx.oncomplete?.();
                }
              });
            }
          });
          return req;
        }
        return tx;
      },
    };
    databases.set(name, db);
    return db;
  }
  const indexedDB = {
    open(name) {
      const isNew = !databases.has(name);
      const db = getDatabase(name);
      const req = { result: db, onupgradeneeded: null, onsuccess: null, onerror: null };
      queueMicrotask(() => {
        if (isNew) req.onupgradeneeded?.();
        req.onsuccess?.();
      });
      return req;
    },
  };
  const fakeFetch = async (url) => failFetch
    ? { ok: false, status: 404, headers: { get: () => null } }
    : { ok: true, status: 200, headers: { get: () => null },
        blob: async () => new Blob(emptyBlob ? [] : ["fixture video " + url]) };
  const self = {
    addEventListener(type, listener) {
      if (type === "message") onMessage = listener;
    },
    postMessage(message) { messages.push(message); },
  };
  runInNewContext(workerSource, {
    indexedDB, fetch: fakeFetch, self, Blob,
    console: { warn() {} },
  }, { filename: "video-downloader.worker.js" });
  async function send(type, requestId, assets = []) {
    onMessage({ data: {
      type, requestId,
      payload: type === "SYNC_ASSETS" ? { assets } : { concurrency: 1 },
    } });
    const resultType = type === "SYNC_ASSETS" ? "SYNC_ASSETS_RESULT" : "DOWNLOAD_STATUS";
    for (let count = 0; count < 30000; count++) {
      const result = messages.find((item) =>
        item.type === resultType && item.requestId === requestId,
      );
      if (result) return result;
      await Promise.resolve();
    }
    throw new Error("WORKER_RESULT_NOT_RECEIVED");
  }
  return { databases, messages, send };
}

const asset = { url: "https://example.invalid/ad.mp4", filename: "ad.mp4", checksum: "test-sha" };

test("worker stores a real blob in the player video cache before reporting done", async () => {
  const ctx = makeWorker();
  assert.equal((await ctx.send("SYNC_ASSETS", "s1", [asset])).enqueued, 1);
  const status = await ctx.send("DOWNLOAD_ASSETS", "d1");
  assert.equal(status.finished, 1);
  assert.equal(status.failed, 0);
  const cached = ctx.databases.get("tad_video_cache").stores.get("videos").get(asset.url);
  assert.equal(cached.checksum, asset.checksum);
  assert.ok(cached.blob instanceof Blob);
  assert.ok(cached.blob.size > 0);
  assert.equal(cached.size, cached.blob.size);
});

test("a pre-fix 'done' task without a cached blob must be downloaded again", async () => {
  const ctx = makeWorker();
  await ctx.send("SYNC_ASSETS", "s1", [asset]);
  const tasks = ctx.databases.get("tad_player_download_queue").stores.get("tasks");
  tasks.set(asset.url, { id: asset.url, ...asset, status: "done" });
  assert.equal((await ctx.send("SYNC_ASSETS", "s2", [asset])).enqueued, 1);
});

test("the worker processes all 16 manifest assets rather than silently clipping to 15", async () => {
  const ctx = makeWorker();
  const assets = Array.from({ length: 16 }, (_, i) => ({
    url: `https://example.invalid/video-${i}.mp4`,
    filename: `video-${i}.mp4`,
    checksum: `test-${i}`,
  }));
  assert.equal((await ctx.send("SYNC_ASSETS", "s1", assets)).enqueued, 16);
  assert.equal((await ctx.send("DOWNLOAD_ASSETS", "d1")).finished, 16);
  assert.equal(ctx.databases.get("tad_video_cache").stores.get("videos").size, 16);
});

test("a failed video-cache commit never reports a completed offline download", async () => {
  const ctx = makeWorker({ failCacheWrite: true });
  await ctx.send("SYNC_ASSETS", "s1", [asset]);
  const status = await ctx.send("DOWNLOAD_ASSETS", "d1");
  assert.equal(status.finished, 0);
  assert.equal(status.failed, 1);
});

test("HTTP errors do not manufacture downloaded offline media", async () => {
  const ctx = makeWorker({ failFetch: true });
  await ctx.send("SYNC_ASSETS", "s1", [asset]);
  const status = await ctx.send("DOWNLOAD_ASSETS", "d1");
  assert.equal(status.finished, 0);
  assert.equal(status.failed, 1);
});

test("a fully committed cached task is skipped without duplicate download work", async () => {
  const ctx = makeWorker();
  await ctx.send("SYNC_ASSETS", "s1", [asset]);
  await ctx.send("DOWNLOAD_ASSETS", "d1");
  const second = await ctx.send("SYNC_ASSETS", "s2", [asset]);
  assert.equal(second.enqueued, 0);
  assert.equal(second.skipped, 1);
});

test("a changed checksum requeues the same URL for a new content version", async () => {
  const ctx = makeWorker();
  await ctx.send("SYNC_ASSETS", "s1", [asset]);
  await ctx.send("DOWNLOAD_ASSETS", "d1");
  const changed = { ...asset, checksum: "different-checksum" };
  assert.equal((await ctx.send("SYNC_ASSETS", "s2", [changed])).enqueued, 1);
  await ctx.send("DOWNLOAD_ASSETS", "d2");
  const cached = ctx.databases.get("tad_video_cache").stores.get("videos").get(asset.url);
  assert.equal(cached.checksum, "different-checksum");
});

test("empty media is never marked cached or completed", async () => {
  const ctx = makeWorker({ emptyBlob: true });
  await ctx.send("SYNC_ASSETS", "s1", [asset]);
  const status = await ctx.send("DOWNLOAD_ASSETS", "d1");
  assert.equal(status.finished, 0);
  assert.equal(status.failed, 1);
});
