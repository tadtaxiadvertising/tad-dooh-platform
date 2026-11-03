"use client";

import { useEffect } from "react";
import {
  CONSENT_EVENT,
  CONSENT_STORAGE_KEY,
  hasCookieConsent,
  readCookieConsent,
  syncCookieConsentFromStorage,
  trackAnalyticsEvent,
} from "@tad/services/cookie-consent";

/** App Router entry: the shared analytics component currently requires Pages Router. */
export default function LandingAnalytics() {
  useEffect(() => {
    const id = process.env.NEXT_PUBLIC_UMAMI_ID;
    if (!id) return;
    let script: HTMLScriptElement | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let viewed = false;
    const sync = () => {
      if (timer) clearTimeout(timer);
      if (!hasCookieConsent("analytics")) {
        script?.remove();
        script = null;
        return;
      }
      if (!script) {
        script = document.createElement("script");
        script.async = true;
        script.src =
          process.env.NEXT_PUBLIC_UMAMI_URL ||
          "https://cloud.umami.is/script.js";
        script.dataset.websiteId = id;
        script.dataset.autoTrack = "false";
        script.dataset.doNotTrack = "true";
        script.onload = () => {
          if (!viewed && hasCookieConsent("analytics")) {
            viewed = true;
            trackAnalyticsEvent("landing_view");
          }
        };
        document.head.appendChild(script);
      }
      const consent = readCookieConsent();
      if (consent)
        timer = setTimeout(
          sync,
          Math.min(consent.expiresAt - Date.now() + 1, 2147483647),
        );
    };
    const storage = (event: StorageEvent) => {
      if (event.key === CONSENT_STORAGE_KEY || event.key === null) {
        syncCookieConsentFromStorage();
        sync();
      }
    };
    sync();
    window.addEventListener(CONSENT_EVENT, sync);
    window.addEventListener("storage", storage);
    window.addEventListener("focus", sync);
    return () => {
      script?.remove();
      if (timer) clearTimeout(timer);
      window.removeEventListener(CONSENT_EVENT, sync);
      window.removeEventListener("storage", storage);
      window.removeEventListener("focus", sync);
    };
  }, []);
  return null;
}
