// Ensure to call this before importing any other modules!
import * as Sentry from "@sentry/nestjs";
import { nodeProfilingIntegration } from "@sentry/profiling-node";

export function initializeSentry() {
  const dsn = process.env.SENTRY_DSN;

  if (!dsn) {
    console.warn("⚠️ Sentry DSN not provided. Sentry will NOT be initialized.");
    return;
  }

  // @sentry/core v10.50.0 is missing .d.ts type declarations (packaging bug),
  // causing TypeScript to collapse NodeOptions → BaseNodeOptions (which lacks `dsn`).
  // Cast to `any` to bypass this library-level type defect until Sentry publishes a fix.
  Sentry.init({
    dsn,
    integrations: [nodeProfilingIntegration()],
    // Performance Monitoring
    tracesSampleRate: 1.0, //  Capture 100% of the transactions
    // Set sampling rate for profiling - this is relative to tracesSampleRate
    profilesSampleRate: 1.0,
  } as any);

  console.log("🛡️ Sentry initialized successfully.");
}
