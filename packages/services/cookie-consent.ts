/** Portal-local preferences; importing this module does not initialize auth. */
export const CONSENT_STORAGE_KEY = 'tad_cookie_preferences';
export const CONSENT_EVENT = 'tad:cookie-preferences';
export const OPEN_COOKIE_SETTINGS_EVENT = 'tad:open-cookie-settings';
export const CONSENT_POLICY_VERSION = '2026-10-30';
export const CONSENT_MAX_AGE_MS = 180 * 24 * 60 * 60 * 1000;
export interface CookieChoices { essential: true; functional: boolean; analytics: boolean; advertisement: boolean; }
export interface CookieConsent extends CookieChoices { version: 2; policyVersion: string; savedAt: number; expiresAt: number; }
export const ESSENTIAL_ONLY: CookieChoices = { essential: true, functional: false, analytics: false, advertisement: false };
let memoryConsent: CookieConsent | null = null;
let memoryOnly = false;

export function privacySignalEnabled(): boolean {
  if (typeof navigator === 'undefined') return false;
  return (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true || navigator.doNotTrack === '1';
}
export function effectiveCookieChoices(choices: CookieChoices): CookieChoices {
  return { essential: true, functional: choices.functional === true,
    analytics: choices.analytics === true && !privacySignalEnabled(),
    advertisement: choices.advertisement === true && !privacySignalEnabled() };
}
export function parseCookieConsent(raw: string | null, now = Date.now()): CookieConsent | null {
  if (!raw) return null;
  try {
    const c = JSON.parse(raw);
    if (c.version !== 2 || c.policyVersion !== CONSENT_POLICY_VERSION || c.essential !== true
      || !['functional', 'analytics', 'advertisement'].every(k => typeof c[k] === 'boolean')
      || !Number.isFinite(c.savedAt) || !Number.isFinite(c.expiresAt)
      || c.savedAt > now || c.expiresAt <= now || c.expiresAt <= c.savedAt
      || c.expiresAt - c.savedAt > CONSENT_MAX_AGE_MS) return null;
    return { ...c, ...effectiveCookieChoices(c) };
  } catch { return null; }
}
export function readCookieConsent(): CookieConsent | null {
  if (typeof window === 'undefined') return null;
  if (memoryOnly) return memoryConsent ? parseCookieConsent(JSON.stringify(memoryConsent)) : null;
  try { return parseCookieConsent(window.localStorage.getItem(CONSENT_STORAGE_KEY)); }
  catch { return memoryConsent ? parseCookieConsent(JSON.stringify(memoryConsent)) : null; }
}
/** One atomic write after a deliberate choice. No identifiers or tokens. */
export function saveCookieConsent(choices: CookieChoices): { consent: CookieConsent; persisted: boolean } {
  const savedAt = Date.now();
  const consent: CookieConsent = { ...effectiveCookieChoices(choices), version: 2,
    policyVersion: CONSENT_POLICY_VERSION, savedAt, expiresAt: savedAt + CONSENT_MAX_AGE_MS };
  let persisted = false;
  if (typeof window !== 'undefined') {
    try { window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consent)); persisted = true; }
    catch {
      // Quota can block writes while still allowing removal of an old opt-in.
      try { window.localStorage.removeItem(CONSENT_STORAGE_KEY); } catch { /* Storage may be entirely blocked. */ }
    }
    memoryConsent = consent;
    memoryOnly = !persisted;
    window.dispatchEvent(new Event(CONSENT_EVENT));
  }
  return { consent, persisted };
}
export function hasCookieConsent(category: Exclude<keyof CookieChoices, 'essential'>): boolean { return readCookieConsent()?.[category] === true; }
export function syncCookieConsentFromStorage(): void { memoryOnly = false; memoryConsent = null; }
export function openCookieSettings(): void { if (typeof window !== 'undefined') window.dispatchEvent(new Event(OPEN_COOKIE_SETTINGS_EVENT)); }
type Umami = { track: (event?: string | ((payload: Record<string, unknown>) => Record<string, unknown>), data?: Record<string, unknown>) => unknown };
export function trackAnalyticsEvent(event: string, data?: Record<string, unknown>): void {
  if (typeof window === 'undefined' || !hasCookieConsent('analytics')) return;
  try { (window as Window & { umami?: Umami }).umami?.track(payload => ({
    ...payload, url: window.location.pathname, referrer: '', title: '', name: event, data,
  })); } catch { /* Optional telemetry never blocks a workflow. */ }
}
export function trackAnalyticsPageview(): void {
  if (typeof window === 'undefined' || !hasCookieConsent('analytics')) return;
  const url = window.location.pathname;
  if (url.includes('/auth/callback')) return;
  try { (window as Window & { umami?: Umami }).umami?.track(payload => ({ ...payload, url, referrer: '', title: '' })); }
  catch { /* Optional telemetry never blocks a workflow. */ }
}
export function isPublicLegalPath(pathname: string): boolean {
  return ['/politica-de-cookies', '/politica-de-privacidad', '/terminos-de-servicio', '/aviso-legal'].includes(pathname);
}
