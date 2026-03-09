const API_URL = import.meta.env?.VITE_API_URL || "http://localhost:3000/api";

export async function sendHeartbeat(
  deviceId: string,
  batteryLevel: number | null,
  storageFree: string | null,
  playerStatus: string
): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/device/heartbeat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        device_id: deviceId,
        battery_level: batteryLevel,
        storage_free: storageFree,
        player_status: playerStatus,
      }),
    });

    return res.ok;
  } catch (error) {
    console.error("Heartbeat Error:", error);
    return false;
  }
}
