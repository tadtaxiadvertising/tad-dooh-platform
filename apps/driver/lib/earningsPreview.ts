/**
 * Simulación educativa: NO es wallet, liquidación ni pago confirmado.
 * Los contadores de venta y referidos representan eventos que cumplen
 * los requisitos de aprobación, nunca registros o clics pendientes.
 */
export const DRIVER_PREVIEW_RATES_RD = {
  screenAdMonthly: 500,
  approvedSale: 500,
  activatedDriver: 500,
  maximumScreenAds: 15,
} as const;

function eligibleCount(value: number, max: number): number {
  return Number.isFinite(value)
    ? Math.min(max, Math.max(0, Math.trunc(value)))
    : 0;
}

export function previewDriverEarnings(
  screenAds: number,
  approvedSales: number,
  activatedDrivers: number,
) {
  const ads = eligibleCount(screenAds, DRIVER_PREVIEW_RATES_RD.maximumScreenAds);
  // 100 es un límite de interacción del simulador, no una regla contractual.
  const sales = eligibleCount(approvedSales, 100);
  const referrals = eligibleCount(activatedDrivers, 100);
  const screenAdsRD = ads * DRIVER_PREVIEW_RATES_RD.screenAdMonthly;
  const salesRD = sales * DRIVER_PREVIEW_RATES_RD.approvedSale;
  const referralsRD = referrals * DRIVER_PREVIEW_RATES_RD.activatedDriver;
  return {
    ads, sales, referrals,
    screenAdsRD, salesRD, referralsRD,
    recurringMonthlyExampleRD: screenAdsRD,
    oneTimeEventsExampleRD: salesRD + referralsRD,
    illustrativeTotalRD: screenAdsRD + salesRD + referralsRD,
  };
}
