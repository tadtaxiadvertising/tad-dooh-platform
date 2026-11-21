/** Canonicalizes offline PoP event kinds without manufacturing billable END events. */
export type PlaybackApiEventType = "START" | "END" | "ERROR";

export function toPlaybackApiEventType(eventType: string): PlaybackApiEventType | null {
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
