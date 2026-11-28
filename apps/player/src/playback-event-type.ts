import type { PlaybackEvent } from "./types";

/** Canonicalizes offline PoP event kinds without manufacturing billable END events. */
export type PlaybackApiEventType = "START" | "END" | "ERROR";

export function toPlaybackApiEventType(
  eventType: string,
): PlaybackApiEventType | null {
  switch (eventType) {
    case "play_start":
      return "START";
    case "play_confirm":
      return "END";
    case "play_error":
      return "ERROR";
    default:
      return null;
  }
}

/** Build the entire batch before any HTTP request. Unknown kinds abort the
 * batch so no Proof of Play can be silently converted into a paid completion. */
export function buildPlaybackApiPayload(events: PlaybackEvent[]) {
  return events.map((e) => {
    const eventType = toPlaybackApiEventType(e.event_type);
    if (!eventType) {
      throw new Error("UNSUPPORTED_PLAYBACK_EVENT_TYPE");
    }
    return {
      deviceId: e.device_id,
      videoId: e.video_id,
      eventType,
      lat: e.lat,
      lng: e.lng,
      clientTimestamp: new Date(e.timestamp).toISOString(),
    };
  });
}
