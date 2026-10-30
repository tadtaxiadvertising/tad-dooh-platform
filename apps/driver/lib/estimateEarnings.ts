export type EarningsEstimate = { slots: number; daily: number; monthly: number };

export function estimateEarnings(adsPerDay: number, cpm: number): EarningsEstimate {
  const slots = Math.min(15, Math.max(0, Math.floor(Number.isFinite(adsPerDay) ? adsPerDay : 0)));
  const rate = Math.max(0, Number.isFinite(cpm) ? Math.floor(cpm) : 0);
  const daily = slots * rate;
  return { slots, daily, monthly: daily * 30 };
}
