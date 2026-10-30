import * as Sentry from "@sentry/nextjs";
import { hasCookieConsent } from "@tad/services/cookie-consent";

Sentry.init({
  dsn:
    process.env.NEXT_PUBLIC_SENTRY_DSN ||
    "https://b786a0fa94eec198afb9e35ce84d16ea@o4511114332143616.ingest.us.sentry.io/4511114334633984",
  tracesSampleRate: 0,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  defaultIntegrations: false,
  sendClientReports: false,
  sendDefaultPii: false,
  beforeSend: event => hasCookieConsent('analytics') ? event : null,
  // 🔇 Deshabilitar en producción si está dando 403 Forbidden para no saturar consola
  enabled: process.env.NODE_ENV !== "production",
  integrations: [],
  debug: false,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
