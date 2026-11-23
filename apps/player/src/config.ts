// ─── TAD DOOH Player — Environment Configuration ───
// Read from Vite env vars injected at build time

import { resolvePlayerApiUrl } from "./api-url";

const env = {
  API_URL: resolvePlayerApiUrl(
    import.meta.env.VITE_API_URL,
    import.meta.env.DEV,
  ),
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || "",
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY || "",
  KIOSK_URL: import.meta.env.VITE_KIOSK_URL || "",
  SENTRY_DSN: import.meta.env.VITE_SENTRY_DSN || "",
  UMAMI_WEBSITE_ID: import.meta.env.VITE_UMAMI_WEBSITE_ID || "",
  HEARTBEAT_INTERVAL_MS:
    Number(import.meta.env.VITE_HEARTBEAT_INTERVAL_MS) || 300_000, // 5 min
  SYNC_INTERVAL_MS: Number(import.meta.env.VITE_SYNC_INTERVAL_MS) || 300_000,
  INTERMISSION_DURATION_MS:
    Number(import.meta.env.VITE_INTERMISSION_DURATION_MS) || 5_000,
  PLAYBACK_FLUSH_INTERVAL_MS:
    Number(import.meta.env.VITE_PLAYBACK_FLUSH_INTERVAL_MS) || 300_000, // 5 min por defecto (audit R2: 30s generaba flooding de telemetría)
  PLAYBACK_QUEUE_MAX_SIZE:
    Number(import.meta.env.VITE_PLAYBACK_QUEUE_MAX_SIZE) || 50,
  MAX_VIDEO_SIZE_BYTES: 57_671_680, // 55 MB — matches BUSINESS_RULES.MAX_VIDEO_SIZE_BYTES
};

export default env;
