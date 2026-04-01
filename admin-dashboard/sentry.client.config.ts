import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || "https://b786a0fa94eec198afb9e35ce84d16ea@o4511114332143616.ingest.us.sentry.io/4511114334633984",
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  // 🔇 Deshabilitar en producción si está dando 403 Forbidden para no saturar consola
  enabled: process.env.NODE_ENV !== 'production',
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  debug: false,
});
