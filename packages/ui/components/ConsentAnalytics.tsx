'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { CONSENT_EVENT, CONSENT_STORAGE_KEY, hasCookieConsent, readCookieConsent, syncCookieConsentFromStorage, trackAnalyticsPageview } from '@tad/services/cookie-consent';

/** No auto-tracking: every page/event is gated at send time. */
export function ConsentAnalytics() {
  const router = useRouter();
  useEffect(() => {
    const websiteId = process.env.NEXT_PUBLIC_UMAMI_ID;
    if (!websiteId) return;
    let script: HTMLScriptElement | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const sync = () => {
      if (timer) clearTimeout(timer);
      if (!hasCookieConsent('analytics')) { script?.remove(); script = null; return; }
      if (!script) {
        script = document.createElement('script'); script.async = true;
        script.src = process.env.NEXT_PUBLIC_UMAMI_URL || 'https://cloud.umami.is/script.js';
        script.dataset.websiteId = websiteId; script.dataset.autoTrack = 'false'; script.dataset.doNotTrack = 'true';
        script.onload = () => trackAnalyticsPageview(); document.head.appendChild(script);
      }
      const saved = readCookieConsent();
      if (saved) timer = setTimeout(sync, Math.min(saved.expiresAt - Date.now() + 1, 2147483647));
    };
    const storage = (event: StorageEvent) => {
      if (event.key === CONSENT_STORAGE_KEY || event.key === null) { syncCookieConsentFromStorage(); sync(); }
    };
    const pageview = () => { sync(); trackAnalyticsPageview(); };
    sync(); window.addEventListener(CONSENT_EVENT, sync); window.addEventListener('storage', storage); window.addEventListener('focus', sync);
    router.events.on('routeChangeComplete', pageview);
    return () => {
      script?.remove(); if (timer) clearTimeout(timer);
      window.removeEventListener(CONSENT_EVENT, sync); window.removeEventListener('storage', storage); window.removeEventListener('focus', sync);
      router.events.off('routeChangeComplete', pageview);
    };
  }, [router.events]);
  return null;
}
