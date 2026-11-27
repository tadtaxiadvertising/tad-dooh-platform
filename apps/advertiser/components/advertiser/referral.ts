let cachedReferralCode: string | null = null;

const REFERRAL_STORAGE_KEY = "tad_adv_referral_code";
const SAFE_CODE = /^[A-Za-z0-9_-]{1,64}$/;

export function captureReferralCode(): string | null {
  if (typeof window === "undefined") return null;

  try {
    const refs = new URLSearchParams(window.location.search).getAll("ref");
    // A new, well-formed link takes precedence over a stored code. Ambiguous
    // or malformed links must NEVER silently grant a referral discount.
    if (refs.length > 0) {
      if (refs.length !== 1 || !SAFE_CODE.test(refs[0])) {
        clearReferralCode();
        return null;
      }
      cachedReferralCode = refs[0];
      try {
        sessionStorage.setItem(REFERRAL_STORAGE_KEY, refs[0]);
      } catch {
        /* Storage disabled: keep the code for this browser session in memory. */
      }
      return refs[0];
    }
    const candidate =
      cachedReferralCode || sessionStorage.getItem(REFERRAL_STORAGE_KEY);
    if (!candidate || !SAFE_CODE.test(candidate)) return null;
    cachedReferralCode = candidate;
    return candidate;
  } catch {
    return null;
  }
}

export function clearReferralCode(): void {
  cachedReferralCode = null;
  try {
    sessionStorage.removeItem(REFERRAL_STORAGE_KEY);
  } catch {
    /* Storage is optional. */
  }
}
