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

function eligibleCount(value: number, max?: number): number {
  if (!Number.isFinite(value)) return 0;
  const v = Math.trunc(value) > 0 ? Math.trunc(value) : 0;
  return max != null ? Math.min(max, v) : v;
}

export function previewDriverEarnings(
  screenAds: number,
  approvedSales: number,
  activatedDrivers: number,
) {
  const ads = eligibleCount(screenAds, DRIVER_PREVIEW_RATES_RD.maximumScreenAds);
  // SIN TOPE: ventas y referidos no tienen límite contractual
  const sales = eligibleCount(approvedSales);
  const referrals = eligibleCount(activatedDrivers);
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
