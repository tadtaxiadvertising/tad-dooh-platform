const API_URL = import.meta.env?.VITE_API_URL || "http://localhost:3000/api";

export interface PlaybackEvent {
  device_id: string;
  video_id: string;
  timestamp: string;
}

export async function sendPlaybackBatch(events: PlaybackEvent[]): Promise<boolean> {
  if (events.length === 0) return true;
  try {
    const res = await fetch(`${API_URL}/device/playback/batch`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ events }),
    });

    return res.ok;
  } catch (error) {
    console.error("Playback Batch Error:", error);
    return false;
  }
}
