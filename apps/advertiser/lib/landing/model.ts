export type LandingRole = "advertiser" | "driver" | "fleet";
export type DemoCity = "sd" | "stgo";

export const ROLES: { id: LandingRole; label: string; detail: string }[] = [
  { id: "advertiser", label: "Anunciante", detail: "Haz visible tu marca" },
  { id: "driver", label: "Conductor", detail: "Explora una oportunidad" },
  { id: "fleet", label: "Flota", detail: "Conoce el control operativo" },
];

export const CITIES: Record<DemoCity, string> = { sd: "Santo Domingo", stgo: "Santiago" };

export function estimateDriverEarnings(slots: number, cpa: number) {
  const safeSlots = Number.isFinite(slots) ? Math.max(0, Math.min(15, Math.trunc(slots))) : 0;
  // Educational gross example; no approval, balance or payroll is inferred here.
  // 100 is a demo bound, not a contractual business limit.
  const safeCpa = Number.isFinite(cpa) ? Math.max(0, Math.min(100, Math.trunc(cpa))) : 0;
  const adsRD = safeSlots * 500;
  const cpaRD = safeCpa * 500;
  return { adsRD, cpaRD, totalRD: adsRD + cpaRD };
}

export function normalizeBudget(value: number): number {
  return Number.isFinite(value) ? Math.max(5000, Math.min(150000, Math.round(value / 5000) * 5000)) : 25000;
}

export function formatRD(value: number): string {
  return `RD$ ${value.toLocaleString("es-DO", { maximumFractionDigits: 0 })}`;
}

/** Marketing referral only: never forward arbitrary query parameters or URLs. */
export function referralCodeFromSearch(search: string): string | null {
  const codes = new URLSearchParams(search).getAll("ref");
  return codes.length === 1 && /^[A-Za-z0-9_-]{1,64}$/.test(codes[0]) ? codes[0] : null;
}

const PORTALS = {
  driver: "https://tad.driver.ibusiness.com.do",
  admin: "https://tad.adm.ibusiness.com.do",
};

/** Build-time public origins only; never accept a redirect query parameter. */
export function portalOrigin(value: string | undefined, portal: keyof typeof PORTALS, allowLocal = false): string {
  try {
    const url = new URL(value || PORTALS[portal]);
    const canonical = url.origin === PORTALS[portal];
    const local = allowLocal && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) && ["http:", "https:"].includes(url.protocol);
    if ((canonical || local) && !url.username && !url.password && url.pathname === "/" && !url.search && !url.hash) return url.origin;
  } catch { /* Invalid configuration uses the known portal origin. */ }
  return PORTALS[portal];
}

export function landingLinks() {
  const local = process.env.NODE_ENV !== "production";
  const driver = portalOrigin(process.env.NEXT_PUBLIC_DRIVER_URL, "driver", local);
  const admin = portalOrigin(process.env.NEXT_PUBLIC_ADMIN_URL, "admin", local);
  return {
    advertiser: "/advertiser/login",
    driver: `${driver}/driver/login`,
    driverLanding: `${driver}/`,
    fleet: `${admin}/admin/login`,
    advertiserSignup: "/advertiser/onboarding",
    driverSignup: `${driver}/driver/onboarding`,
    signupEnabled: process.env.NEXT_PUBLIC_LANDING_SIGNUP_ENABLED === "true",
  };
}

export type DemoStatus = "online" | "recent_offline" | "long_offline";
export function demoConnectionStatus(online: boolean, hoursSinceSignal: number | null): DemoStatus {
  if (online) return "online";
  return hoursSinceSignal !== null && Number.isFinite(hoursSinceSignal) && hoursSinceSignal >= 0 && hoursSinceSignal < 24
    ? "recent_offline" : "long_offline";
}

export const DEMO_VEHICLES = [
  { id: "DEMO-01", x: 22, y: 35, online: true, hours: 0 },
  { id: "DEMO-02", x: 44, y: 62, online: true, hours: 0 },
  { id: "DEMO-03", x: 68, y: 28, online: false, hours: 4 },
  { id: "DEMO-04", x: 78, y: 68, online: false, hours: 25 },
] as const;
