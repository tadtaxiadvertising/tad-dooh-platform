import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    Sentry.init({
      dsn:
        process.env.NEXT_PUBLIC_SENTRY_DSN ||
        "https://b786a0fa94eec198afb9e35ce84d16ea@o4511114332143616.ingest.us.sentry.io/4511114334633984",
      tracesSampleRate: 1,
      debug: false,
    });
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    Sentry.init({
      dsn:
        process.env.NEXT_PUBLIC_SENTRY_DSN ||
        "https://b786a0fa94eec198afb9e35ce84d16ea@o4511114332143616.ingest.us.sentry.io/4511114334633984",
      tracesSampleRate: 1,
      debug: false,
    });
  }
}

export const onRequestError = Sentry.captureRequestError;
