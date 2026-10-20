let cachedReferralCode: string | null = null;

const REFERRAL_STORAGE_KEY = "tad_adv_referral_code";

export function captureReferralCode(): string | null {
  if (typeof window === "undefined") return null;
  if (cachedReferralCode) return cachedReferralCode;

  try {
    const urlRef = new URLSearchParams(window.location.search).get("ref");
    const stored = sessionStorage.getItem(REFERRAL_STORAGE_KEY);
    const ref = (urlRef || stored || "").trim();

    if (ref) {
      cachedReferralCode = ref;
      sessionStorage.setItem(REFERRAL_STORAGE_KEY, ref);
    }
    return cachedReferralCode;
  } catch {
    return null;
  }
}

export function clearReferralCode(): void {
  cachedReferralCode = null;
  try {
    sessionStorage.removeItem(REFERRAL_STORAGE_KEY);
  } catch {
    /* noop */
  }
}
