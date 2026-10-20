// ─── TAD DOOH Player — FullyKiosk Bridge ──
// Integration with FullyKiosk Browser's local REST API (default: http://localhost:1312)
// Enables remote control of the tablet: screen brightness, volume, kiosk lock,
// screen on/off, force reboot, and motion sensor management.
// Ref: https://www.fully-kiosk.com/#webinterface

import env from "./config";

const KIOSK_BASE_URL = "http://localhost:1312";

interface KioskCommand {
  action: string;
  params?: Record<string, string | number>;
}

export class FullyKioskBridge {
  private baseUrl: string;
  private isAvailable: boolean = false;
  private checkTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Override base URL via env var for non-default port or remote proxy
    this.baseUrl = env.KIOSK_URL || KIOSK_BASE_URL;
  }

  init(): void {
    this.detectKiosk();
    this.startAvailabilityCheck();
  }

  destroy(): void {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }
  }

  isKioskAvailable(): boolean {
    return this.isAvailable;
  }

  // ── Screen Management ──
  async setScreenBrightness(level: number): Promise<boolean> {
    // Level: 0-255 (Android brightness scale)
    return this.sendCommand({
      action: "setScreenBrightness",
      params: { level },
    });
  }

  async screenOn(): Promise<boolean> {
    return this.sendCommand({ action: "screenOn" });
  }

  async screenOff(): Promise<boolean> {
    return this.sendCommand({ action: "screenOff" });
  }

  async keepScreenOn(enable: boolean): Promise<boolean> {
    return this.sendCommand({
      action: enable ? "enableScreenOn" : "disableScreenOn",
    });
  }

  // ── Volume Management ──
  async setVolume(level: number, stream: string = "music"): Promise<boolean> {
    // Level: 0-15 (Android volume steps), stream: music/ring/alarm/notification
    return this.sendCommand({
      action: "setAudioVolume",
      params: { level, stream },
    });
  }

  async setMute(mute: boolean): Promise<boolean> {
    return this.sendCommand({
      action: mute ? "setAudioMute" : "setAudioUnmute",
    });
  }

  // ── Kiosk Lock Management ──
  async lockKiosk(): Promise<boolean> {
    return this.sendCommand({ action: "lockKiosk" });
  }

  async unlockKiosk(): Promise<boolean> {
    return this.sendCommand({ action: "unlockKiosk" });
  }

  async isKioskLocked(): Promise<boolean> {
    const result = await this.sendQuery("isKioskLocked");
    return result === "true";
  }

  // ── Device Management ──
  async forceReboot(): Promise<boolean> {
    return this.sendCommand({ action: "forceReboot" });
  }

  async restartApp(): Promise<boolean> {
    return this.sendCommand({ action: "restartApp" });
  }

  async loadUrl(url: string): Promise<boolean> {
    return this.sendCommand({ action: "loadStartUrl", params: { url } });
  }

  // ── Motion Sensor (tablet proximity detection) ──
  async enableMotionSensor(): Promise<boolean> {
    return this.sendCommand({ action: "enableMotionDetection" });
  }

  async disableMotionSensor(): Promise<boolean> {
    return this.sendCommand({ action: "disableMotionDetection" });
  }

  async setMotionSensorSensitivity(level: number): Promise<boolean> {
    // Level: 0-100 (sensitivity scale)
    return this.sendCommand({
      action: "setMotionDetectionSensitivity",
      params: { level },
    });
  }

  // ── Device Info Queries ──
  async getBatteryLevel(): Promise<number> {
    const result = await this.sendQuery("getBatteryLevel");
    return Number(result) || 0;
  }

  async getDeviceId(): Promise<string> {
    const result = await this.sendQuery("getDeviceId");
    return String(result);
  }

  async getNetworkInfo(): Promise<string> {
    return (await this.sendQuery("getNetworkInfo")) || "";
  }

  // ── Process DeviceCommands from Backend ──
  async handleCommand(
    commandType: string,
    params: Record<string, unknown>,
  ): Promise<boolean> {
    switch (commandType) {
      case "FORCE_SYNC":
        return true; // Handled by SyncManager, not by kiosk
      case "SCREEN_ON":
        return this.screenOn();
      case "SCREEN_OFF":
        return this.screenOff();
      case "SET_BRIGHTNESS":
        return this.setScreenBrightness(Number(params.level || 128));
      case "SET_VOLUME":
        return this.setVolume(Number(params.level || 10));
      case "MUTE":
        return this.setMute(true);
      case "UNMUTE":
        return this.setMute(false);
      case "LOCK_KIOSK":
        return this.lockKiosk();
      case "UNLOCK_KIOSK":
        return this.unlockKiosk();
      case "REBOOT":
        return this.forceReboot();
      case "RESTART_APP":
        return this.restartApp();
      case "ENABLE_MOTION":
        return this.enableMotionSensor();
      case "DISABLE_MOTION":
        return this.disableMotionSensor();
      default:
        console.warn(`[FullyKiosk] Unknown command type: ${commandType}`);
        return false;
    }
  }

  // ── Internal: Send command to FullyKiosk REST API ──
  private async sendCommand(command: KioskCommand): Promise<boolean> {
    if (!this.isAvailable) return false;

    try {
      const url = new URL(this.baseUrl);
      url.searchParams.set("cmd", command.action);
      if (command.params) {
        for (const [key, value] of Object.entries(command.params)) {
          url.searchParams.set(key, String(value));
        }
      }

      const response = await fetch(url.toString());
      return response.ok;
    } catch {
      return false;
    }
  }

  private async sendQuery(action: string): Promise<string | null> {
    if (!this.isAvailable) return null;

    try {
      const url = new URL(this.baseUrl);
      url.searchParams.set("cmd", action);
      const response = await fetch(url.toString());
      if (response.ok) {
        return await response.text();
      }
      return null;
    } catch {
      return null;
    }
  }

  // ── Detect if FullyKiosk Browser is running ──
  private async detectKiosk(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}?cmd=isKioskLocked`, {
        signal: AbortSignal.timeout(3000),
      });
      this.isAvailable = response.ok;
      if (this.isAvailable) {
        console.log(
          "[FullyKiosk] ✅ Detected — kiosk API available at " + this.baseUrl,
        );
        // Acquire screen wake lock through kiosk
        this.keepScreenOn(true).catch(() => {});
        // Enable motion sensor for proximity-based screen wake
        this.enableMotionSensor().catch(() => {});
      } else {
        console.log("[FullyKiosk] ❌ Not detected — standard browser mode");
      }
    } catch {
      this.isAvailable = false;
      console.log("[FullyKiosk] ❌ Not detected — standard browser mode");
    }
  }

  private startAvailabilityCheck(): void {
    // Re-check every 60 seconds — FullyKiosk API might become available
    // if the tablet was rebooted into kiosk mode
    this.checkTimer = setInterval(() => {
      this.detectKiosk();
    }, 60_000);
  }
}
