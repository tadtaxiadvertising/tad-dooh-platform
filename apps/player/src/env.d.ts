// Vite / Player environment declarations — ambient module
// Required by apps/player/src/config.ts for `import.meta.env.VITE_*` access.
// When Vite is installed (npm install --prefix apps/player), the standard
// /// <reference types="vite/client" /> directive can replace this file.

declare global {
  interface ImportMetaEnv {
    readonly DEV: boolean;
    readonly VITE_API_URL: string;
    readonly VITE_SUPABASE_URL: string;
    readonly VITE_SUPABASE_ANON_KEY: string;
    readonly VITE_KIOSK_URL: string;
    readonly VITE_SENTRY_DSN: string;
    readonly VITE_UMAMI_WEBSITE_ID: string;
    readonly VITE_HEARTBEAT_INTERVAL_MS: string;
    readonly VITE_SYNC_INTERVAL_MS: string;
    readonly VITE_INTERMISSION_DURATION_MS: string;
    readonly VITE_PLAYBACK_FLUSH_INTERVAL_MS: string;
    readonly VITE_PLAYBACK_QUEUE_MAX_SIZE: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }

  interface Window {
    tadKillSwitchActive: boolean;
  }
}

export {};
