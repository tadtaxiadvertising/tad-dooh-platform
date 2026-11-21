import test from "node:test";
import assert from "node:assert/strict";
import { persistPlaybackEvent, removeAcknowledgedPlaybackEvents } from "../../src/playback-queue-storage.ts";

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

// The fake store holds changes until the transaction commits. Request success
// alone never commits a queued Proof-of-Play cleanup.
function mockAckDatabase(events) {
  const records = new Map(events.map((e) => [`${e.video_id}_${e.timestamp}`, e]));
  const pendingDeletes = new Set();
  const requests = [];
  let aborted = false;
  const store = {
    get(key) {
      const request = { result: undefined, onsuccess: null };
      requests.push({ key, request });
      return request;
    },
    delete(key) {
      pendingDeletes.add(key);
      return {};
    },
  };
  const tx = {
    oncomplete: null, onabort: null, onerror: null, error: null,
    objectStore(name) {
      assert.equal(name, "events");
      return store;
    },
    abort() {
      aborted = true;
      pendingDeletes.clear();
      this.onabort?.();
    },
  };
  return {
    db: { transaction(name, mode) {
      assert.equal(name, "events");
      assert.equal(mode, "readwrite");
      return tx;
    } },
    tx, records, requests, pendingDeletes,
    respond(index, result = records.get(requests[index].key)) {
      requests[index].request.result = result;
      requests[index].request.onsuccess?.();
    },
    commit() {
      assert.equal(aborted, false);
      for (const key of pendingDeletes) records.delete(key);
      tx.oncomplete?.();
    },
  };
}

const acknowledgementEvent = Object.freeze({
  ...event, queuedAt: 1732100001000,
});

test("acknowledged playback is not locally marked removed before transaction commit", async () => {
  const store = mockAckDatabase([acknowledgementEvent]);
  let settled = false;
  const pending = removeAcknowledgedPlaybackEvents(store.db, "events", [acknowledgementEvent])
    .then(() => { settled = true; });
  store.respond(0);
  assert.equal(store.pendingDeletes.size, 1);
  await Promise.resolve();
  assert.equal(settled, false);
  assert.equal(store.records.size, 1);
  store.commit();
  await pending;
  assert.equal(settled, true);
  assert.equal(store.records.size, 0);
});

test("two acknowledged playback entries are removed in one committed transaction", async () => {
  const second = { ...acknowledgementEvent, video_id: "VIDEO-2", timestamp: 1732100002000 };
  const store = mockAckDatabase([acknowledgementEvent, second]);
  const pending = removeAcknowledgedPlaybackEvents(store.db, "events", [acknowledgementEvent, second]);
  assert.equal(store.requests.length, 2);
  store.respond(0);
  store.respond(1);
  assert.equal(store.pendingDeletes.size, 2);
  store.commit();
  await pending;
  assert.equal(store.records.size, 0);
});

test("transaction abort after delete requests retains every acknowledged event", async () => {
  const store = mockAckDatabase([acknowledgementEvent]);
  const pending = removeAcknowledgedPlaybackEvents(store.db, "events", [acknowledgementEvent]);
  store.respond(0);
  store.tx.error = new Error("STORAGE_ABORT");
  store.tx.abort();
  await assert.rejects(pending, /STORAGE_ABORT/);
  assert.equal(store.records.size, 1);
});

test("overwritten unacknowledged event aborts cleanup and rolls back previous deletes", async () => {
  const second = { ...acknowledgementEvent, video_id: "VIDEO-2", timestamp: 1732100002000 };
  const store = mockAckDatabase([acknowledgementEvent, second]);
  const pending = removeAcknowledgedPlaybackEvents(store.db, "events", [acknowledgementEvent, second]);
  store.respond(0);
  store.respond(1, { ...second, event_type: "play_start" });
  await assert.rejects(pending, /PLAYBACK_QUEUE_ACK_ABORTED/);
  assert.equal(store.records.size, 2);
  assert.equal(store.pendingDeletes.size, 0);
});

test("reused key with a newer queuedAt value is not deleted by an old ACK", async () => {
  const store = mockAckDatabase([acknowledgementEvent]);
  const pending = removeAcknowledgedPlaybackEvents(store.db, "events", [acknowledgementEvent]);
  store.respond(0, { ...acknowledgementEvent, queuedAt: acknowledgementEvent.queuedAt + 1 });
  await assert.rejects(pending, /PLAYBACK_QUEUE_ACK_ABORTED/);
  assert.equal(store.pendingDeletes.size, 0);
});

test("already-removed records do not trigger deletion of unrelated events", async () => {
  const store = mockAckDatabase([]);
  const pending = removeAcknowledgedPlaybackEvents(store.db, "events", [acknowledgementEvent]);
  store.respond(0);
  assert.equal(store.pendingDeletes.size, 0);
  store.commit();
  await pending;
});

test("failed IndexedDB cleanup transaction propagates an error for retry", async () => {
  const store = mockAckDatabase([acknowledgementEvent]);
  const pending = removeAcknowledgedPlaybackEvents(store.db, "events", [acknowledgementEvent]);
  store.tx.onerror?.();
  await assert.rejects(pending, /PLAYBACK_QUEUE_ACK_FAILED/);
  assert.equal(store.records.size, 1);
});
