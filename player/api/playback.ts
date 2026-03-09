const API_URL = import.meta.env?.VITE_API_URL || "http://localhost:3000/api";

export interface PlaybackEvent {
  device_id: string;
  video_id: string;
  timestamp: string;
}

export async function sendPlaybackEvent(event: PlaybackEvent): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/device/playback`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    });

    return res.ok;
  } catch (error) {
    console.error("Playback Event Error:", error);
    return false;
  }
}
