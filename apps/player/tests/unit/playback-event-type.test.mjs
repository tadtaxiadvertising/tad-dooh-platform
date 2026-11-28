import test from "node:test";
import assert from "node:assert/strict";
import { toPlaybackApiEventType, buildPlaybackApiPayload } from "../../src/playback-event-type.ts";

test("real playback start remains unbillable START", () => {
  assert.equal(toPlaybackApiEventType("play_start"), "START");
});

test("only actual playback confirmation maps to billable END", () => {
  assert.equal(toPlaybackApiEventType("play_confirm"), "END");
});

test("playback failure maps to ERROR, never billable END", () => {
  assert.equal(toPlaybackApiEventType("play_error"), "ERROR");
});

test("unknown and malformed historical IndexedDB kinds never map to END", () => {
  for (const type of ["", "play_stopped", "play_timeout", "error", "END", "play_confirmed", null, undefined]) {
    assert.equal(toPlaybackApiEventType(type), null);
  }
});

test("batch preserves device, video, timestamps and maps all three real kinds", () => {
  const events = ["play_start", "play_confirm", "play_error"].map((event_type, index) => ({
    device_id: "DEVICE-1", video_id: "VIDEO-1", timestamp: 1732100000000 + index * 1000,
    lat: 19.48, lng: -70.70, event_type,
  }));
  const payload = buildPlaybackApiPayload(events);
  assert.deepEqual(payload.map((p) => p.eventType), ["START", "END", "ERROR"]);
  assert.equal(payload.length, events.length);
  assert.equal(payload[0].deviceId, "DEVICE-1");
  assert.equal(payload[0].videoId, "VIDEO-1");
  assert.equal(payload[0].clientTimestamp, new Date(events[0].timestamp).toISOString());
  assert.equal(payload[0].lat, 19.48);
  assert.equal(payload[0].lng, -70.70);
});

test("an unknown stored event aborts the entire batch instead of billing it as END", () => {
  const start = { device_id: "DEVICE-1", video_id: "VIDEO-1", timestamp: 1732100000000, event_type: "play_start" };
  assert.throws(() => buildPlaybackApiPayload([start, { ...start, event_type: "play_timeout" }]), {
    message: "UNSUPPORTED_PLAYBACK_EVENT_TYPE",
  });
});

test("invalid historical timestamps cannot silently become confirmed plays", () => {
  assert.throws(() => buildPlaybackApiPayload([{
    device_id: "DEVICE-1", video_id: "VIDEO-1", timestamp: Number.NaN,
    event_type: "play_confirm",
  }]));
});
