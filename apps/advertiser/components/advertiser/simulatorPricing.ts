import {
  calculateAdvertiserOffer,
  calculateImpactLegacy,
  calculateImpact,
  type AdvertiserOffer,
  type AdvertiserOfferInput,
  getSource,
  ImpactOutput,
} from "@tad/impact-calculator";

/**
 * @deprecated Legacy interface — mantener compatibilidad mientras migramos UI
 * Usar `calculateImpact` + `ImpactOutput` para nuevos componentes.
 */
export interface CampaignConfig {
  screens: number;
  months: number;
  frequencySeconds: number;
  includeProduction: boolean;
}

export interface CampaignEstimate {
  screensCost: number;
  frequencyUplift: number;
  productionFee: number;
  total: number;
  impressions: number;
}

/**
 * Reference prices displayed by the illustrative onboarding simulator.
 * Must match calculateImpact() (packages/impact-calculator/sources.ts).
 * These values are NOT contractual rates: the backend currently has a
 * separate BUSINESS_RULES tariff pending commercial reconciliation.
 */
function requireIllustrativeRate(sourceId: string): number {
  const value = getSource(sourceId)?.value;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`Invalid illustrative pricing source: ${sourceId}`);
  }
  return value;
}
export const SCREEN_MONTHLY_RATE = requireIllustrativeRate(
  "screen-monthly-rate-rd",
);
export const PRODUCTION_FEE = requireIllustrativeRate(
  "creative-production-fee",
);
export const DAILY_ACTIVE_HOURS = 10;
export const ATTENTION_RATE = 0.4;
export const FIXED_FREQUENCY_SECONDS = 30;

/**
 * Wrapper legacy — mantiene API antigua para SimulatorStep.tsx
 * Devuelve solo los campos que el componente espera.
 */
export function estimateCampaign(config: CampaignConfig): CampaignEstimate {
  const legacy = calculateImpactLegacy(
    config.screens,
    config.months,
    config.frequencySeconds,
    config.includeProduction,
  );
  return {
    screensCost: legacy.screensCost,
    frequencyUplift: 0,
    productionFee: legacy.productionFee,
    total: legacy.totalCost,
    impressions: legacy.impressions,
  };
}

/**
 * NUEVA API recomendada — devuelve rango completo + fuentes + warnings
 * Usar en componentes nuevos o al migrar SimulatorStep.
 */
export function estimateCampaignDetailed(config: CampaignConfig): ImpactOutput {
  return calculateImpact({
    screens: config.screens,
    months: config.months,
    frequencySeconds: config.frequencySeconds,
    includeProduction: config.includeProduction,
    mode: "expected",
  });
}

/**
 * Check the server response against the shared versioned offer contract.
 * This is a consistency check, never evidence of referral eligibility.
 */
export function matchesAdvertiserOffer(
  offer: unknown,
  config: AdvertiserOfferInput,
): offer is AdvertiserOffer {
  if (!offer || typeof offer !== "object" || Array.isArray(offer)) return false;
  try {
    const expected = calculateAdvertiserOffer(config);
    const received = offer as Record<string, unknown>;
    return Object.entries(expected).every(
      ([key, value]) => received[key] === value,
    );
  } catch {
    return false;
  }
}

/**
 * Helper para UI: formatea rango "X (Y–Z)"
 */
export function formatRange(r: {
  min: number;
  expected: number;
  max: number;
}): string {
  if (r.min === r.expected && r.expected === r.max) {
    return r.expected.toLocaleString("es-DO");
  }
  return `${r.expected.toLocaleString("es-DO")} (${r.min.toLocaleString("es-DO")}–${r.max.toLocaleString("es-DO")})`;
}

/**
 * Helper para UI: CPM string
 */
export function formatCPM(r: {
  min: number;
  expected: number;
  max: number;
}): string {
  if (r.min === r.expected && r.expected === r.max) {
    return `RD$ ${r.expected.toLocaleString("es-DO")}/CPM`;
  }
  return `RD$ ${r.expected.toLocaleString("es-DO")}/CPM (${r.min.toLocaleString("es-DO")}–${r.max.toLocaleString("es-DO")})`;
}

/**
 * Helper para UI: badge de fuente principal
 */
export function getPrimarySource(): {
  label: string;
  tier: "A" | "B" | "C" | "D";
  url?: string;
} {
  return {
    label: "IAB DOOH Guidelines + Geopath 2024",
    tier: "B",
    url: "https://iabtechlab.com/standards/digital-out-of-home-measurement-guidelines/",
  };
}

/**
 * Helper para UI: status de calibración
 */
export function getCalibrationBadge(): {
  label: string;
  color: "red" | "amber" | "green";
  description: string;
} {
  return {
    label: "Benchmark internacional (sin datos RD propios)",
    color: "amber",
    description:
      "Calculado con benchmarks IAB/Geopath/NYC-TLC. Incertidumbre ~±40-60%. Datos propios DIGESETT/ONE/eye-tracking pendientes Q4 2026.",
  };
}
