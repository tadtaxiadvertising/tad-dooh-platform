import test from "node:test";
import assert from "node:assert/strict";
import { toPlaybackApiEventType } from "../../src/playback-event-type.ts";

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
