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

/**
 * Conserva los contadores de ventas y referidos sin un tope comercial.
 * @throws {RangeError} Si un importe o suma excede la capacidad de enteros
 * seguros de JavaScript. Rechaza el ejemplo completo para no mostrar Infinity,
 * importes imprecisos ni sustituir eventos válidos por un saldo aparente.
 */
export function previewDriverEarnings(
  screenAds: number,
  approvedSales: number,
  activatedDrivers: number,
) {
  const ads = eligibleCount(
    screenAds,
    DRIVER_PREVIEW_RATES_RD.maximumScreenAds,
  );
  // SIN TOPE: ventas y referidos no tienen límite contractual
  const sales = eligibleCount(approvedSales);
  const referrals = eligibleCount(activatedDrivers);
  const screenAdsRD = ads * DRIVER_PREVIEW_RATES_RD.screenAdMonthly;
  const salesRD = sales * DRIVER_PREVIEW_RATES_RD.approvedSale;
  const referralsRD = referrals * DRIVER_PREVIEW_RATES_RD.activatedDriver;
  const oneTimeEventsExampleRD = salesRD + referralsRD;
  const illustrativeTotalRD = screenAdsRD + oneTimeEventsExampleRD;
  if (
    ![
      screenAdsRD,
      salesRD,
      referralsRD,
      oneTimeEventsExampleRD,
      illustrativeTotalRD,
    ].every(Number.isSafeInteger)
  ) {
    throw new RangeError("La simulación excede la capacidad numérica segura.");
  }
  return {
    ads,
    sales,
    referrals,
    screenAdsRD,
    salesRD,
    referralsRD,
    recurringMonthlyExampleRD: screenAdsRD,
    oneTimeEventsExampleRD,
    illustrativeTotalRD,
  };
}
