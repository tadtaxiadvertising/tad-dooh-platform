const API_URL = import.meta.env?.VITE_API_URL || "http://localhost:3000/api";

export interface SyncResponse {
  campaign_version: number;
  videos: {
    id: string;
    url: string;
    duration: number;
  }[];
}

export async function checkSync(deviceId: string): Promise<SyncResponse | null> {
  try {
    const res = await fetch(`${API_URL}/device/sync?device_id=${deviceId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      throw new Error(`Sync failed: ${res.statusText}`);
    }

    const data = await res.json();
    if (data.update === false || !data.videos) {
      return null;
    }
    
    return data;
  } catch (error) {
    console.error("API Sync Error:", error);
    return null;
  }
}
