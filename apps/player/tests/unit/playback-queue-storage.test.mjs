import test from "node:test";
import assert from "node:assert/strict";
import { persistPlaybackEvent } from "../../src/playback-queue-storage.ts";

const event = Object.freeze({
  device_id: "STORED-DEVICE", video_id: "VIDEO-1", event_type: "play_confirm",
  timestamp: 1732100000000, lat: 19.48, lng: -70.70,
});

function fakeStore({ throwOnPut = false } = {}) {
  const state = { putCalls: [], storeName: null, mode: null, request: null };
  const tx = { oncomplete: null, onabort: null, onerror: null, error: null,
    objectStore(name) {
      assert.equal(name, "events");
      return {
        put(entry) {
          if (throwOnPut) throw new Error("DATA_CLONE_ERROR");
          state.putCalls.push(entry);
          state.request = { onsuccess: null, onerror: null };
          return state.request;
        },
      };
    },
  };
  const db = { transaction(name, mode) {
    state.storeName = name;
    state.mode = mode;
    return tx;
  } };
  return { db, tx, state };
}

test("does not ACK on put request success before IndexedDB commit", async () => {
  const { db, tx, state } = fakeStore();
  let resolved = false;
  const promise = persistPlaybackEvent(db, "events", event, "DEVICE-1")
    .then(() => { resolved = true; });
  state.request.onsuccess?.();
  await Promise.resolve();
  assert.equal(resolved, false);
  tx.oncomplete();
  await promise;
  assert.equal(resolved, true);
});

test("rejects a transaction abort even after put succeeds", async () => {
  const { db, tx, state } = fakeStore();
  const promise = persistPlaybackEvent(db, "events", event, "DEVICE-1");
  state.request.onsuccess?.();
  tx.error = new Error("QUOTA_REACHED_AT_COMMIT");
  tx.onabort();
  await assert.rejects(promise, /QUOTA_REACHED_AT_COMMIT/);
});

test("rejects when the IndexedDB transaction errors", async () => {
  const { db, tx } = fakeStore();
  const promise = persistPlaybackEvent(db, "events", event, "DEVICE-1");
  tx.onerror();
  await assert.rejects(promise, /PLAYBACK_QUEUE_WRITE_FAILED/);
});

test("rejects synchronous put failure instead of reporting queued PoP", async () => {
  const { db } = fakeStore({ throwOnPut: true });
  await assert.rejects(persistPlaybackEvent(db, "events", event, "DEVICE-1"), /DATA_CLONE_ERROR/);
});

test("persists original PoP kind, ID, device binding, and timestamp", async () => {
  const { db, tx, state } = fakeStore();
  const promise = persistPlaybackEvent(db, "events", event, "DEVICE-1");
  assert.equal(state.storeName, "events");
  assert.equal(state.mode, "readwrite");
  assert.deepEqual(state.putCalls[0], {
    ...event,
    id: "VIDEO-1_1732100000000",
    device_id: "DEVICE-1",
    queuedAt: state.putCalls[0].queuedAt,
  });
  assert.equal(typeof state.putCalls[0].queuedAt, "number");
  assert.equal(event.device_id, "STORED-DEVICE");
  tx.oncomplete();
  await promise;
});

test("uses event device identity when player has not been initialized", async () => {
  const { db, tx, state } = fakeStore();
  const promise = persistPlaybackEvent(db, "events", event, "");
  assert.equal(state.putCalls[0].device_id, "STORED-DEVICE");
  tx.oncomplete();
  await promise;
});
