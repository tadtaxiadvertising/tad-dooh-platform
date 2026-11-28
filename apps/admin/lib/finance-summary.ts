export interface FinancialSummary {
  mrr: number;
  activeSubscribers: number;
  campaignRevenue: number;
  burnRate: number;
  netProjection: number;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function parseFinancialSummary(value: unknown): FinancialSummary | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  const { mrr, activeSubscribers, campaignRevenue, burnRate, netProjection } =
    value as Record<string, unknown>;

  if (
    !isFiniteNumber(mrr) ||
    !isFiniteNumber(activeSubscribers) ||
    !Number.isInteger(activeSubscribers) ||
    activeSubscribers < 0 ||
    !isFiniteNumber(campaignRevenue) ||
    !isFiniteNumber(burnRate) ||
    !isFiniteNumber(netProjection)
  ) {
    return null;
  }

  return { mrr, activeSubscribers, campaignRevenue, burnRate, netProjection };
}

export function formatFinancialMetric(value: unknown, currency = true): string {
  if (!isFiniteNumber(value)) return "No disponible";
  return `${currency ? "RD$ " : ""}${value.toLocaleString()}`;
}
