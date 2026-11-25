/**
 * TAD DOOH — Calculadora de Impacto Central
 *
 * Única fuente de verdad para TODOS los simuladores (frontend + backend).
 * Cada output incluye: valor, intervalo de confianza, fuentes usadas, status de calibración.
 *
 * Fórmula probabilística (sin caja negra):
 *
 * 1) PLAYS_POR_HORA = 3600 / rotationSeconds
 * 2) PLAYS_DÍA_PANTALLA = playsPorHora × dailyActiveHours
 * 3) IMPRESIONES_BRUTAS_DÍA_PANTALLA = playsDía × attentionRate
 * 4) IMPRESIONES_BRUTAS_MES_PANTALLA = impresionesBrutasDía × 30
 *
 * 5) VIAJES_CON_PASAJERO_MES_PANTALLA = dailyActiveHours × 30 × occupancyRate × tripsPorHora
 *    donde tripsPorHora ≈ 2-3 (velocidad urbana + paradas). Usamos 2.5 default.
 *
 * 6) PASAJEROS_TOTALES_MES_PANTALLA = viajesConPasajero × passengersPerTrip
 *
 * 7) FRECUENCIA_ESTIMADA = IMPRESIONES_BRUTAS_MES / PASAJEROS_TOTALES_MES
 *    (cada pasajero ve múltiplos spots en su viaje)
 *
 * 8) ALCANCE_ÚNICO_MES_PANTALLA = PASAJEROS_TOTALES_MES / monthlyTaxiUsePerCapita
 *    (cada persona usa taxi varias veces al mes → desduplicamos)
 *
 * 9) IMPRESIONES_TOTALES_CAMPAÑA = IMPRESIONES_BRUTAS_MES_PANTALLA × pantallas × meses
 * 10) ALCANCE_TOTAL_CAMPAÑA = ALCANCE_ÚNICO_MES_PANTALLA × pantallas × meses
 */
import { SOURCES, getSource, getActiveSource, isCalibrationStatus, ImpactSource } from "./sources";
export { SOURCES, getSource, getActiveSource, isCalibrationStatus };
export type { ImpactSource };
export type CalculationMode = "conservative" | "expected" | "optimistic";
export interface ImpactInput {
    screens: number;
    months: number;
    frequencySeconds: number;
    includeProduction: boolean;
    /** Permite forzar modo de cálculo para testing/scenarios */
    mode?: CalculationMode;
}
export interface ImpactOutput {
    /** Costos */
    screensCost: number;
    productionFee: number;
    totalCost: number;
    /** Métricas de impacto (punto central + rango) */
    impressionsPerScreenPerMonth: {
        min: number;
        expected: number;
        max: number;
    };
    totalImpressions: {
        min: number;
        expected: number;
        max: number;
    };
    uniqueReachPerScreenPerMonth: {
        min: number;
        expected: number;
        max: number;
    };
    totalUniqueReach: {
        min: number;
        expected: number;
        max: number;
    };
    frequencyOTS: {
        min: number;
        expected: number;
        max: number;
    };
    /** CPM calculado en cada escenario */
    cpm: {
        min: number;
        expected: number;
        max: number;
    };
    costPerReach: {
        min: number;
        expected: number;
        max: number;
    };
    /** Auditoría */
    sourcesUsed: ImpactSource[];
    calibrationStatus: ReturnType<typeof isCalibrationStatus>;
    /** Warnings si hay fuentes vencidas o sin datos propios */
    warnings: string[];
    /** Metadatos del cálculo */
    calculatedAt: string;
    mode: CalculationMode;
}
/** Cálculo principal — pura matemática, sin side effects */
export declare function calculateImpact(input: ImpactInput): ImpactOutput;
/** Wrapper simplificado para compatibilidad con código legacy (point-only) */
export declare function calculateImpactLegacy(screens: number, months: number, frequencySeconds: number, includeProduction: boolean): {
    totalCost: number;
    impressions: number;
    screensCost: number;
    productionFee: number;
};
/** Helper para UI: devuelve string legible "X (Y–Z)" */
export declare function formatRange(r: {
    min: number;
    expected: number;
    max: number;
}): string;
/** Helper para UI: CPM string */
export declare function formatCPM(r: {
    min: number;
    expected: number;
    max: number;
}): string;
/** Helper para UI: badge de fuente principal */
export declare function getPrimarySource(): {
    label: string;
    tier: "A" | "B" | "C" | "D";
    url?: string;
};
/** Helper para UI: status de calibración */
export declare function getCalibrationBadge(): {
    label: string;
    color: "red" | "amber" | "green";
    description: string;
};
/**
 * TAD commercial offer for NEW advertiser onboarding requests only.
 * The base screen rate is RD$2,500/month. A database-verified driver's
 * referral code discounts the SCREEN price by 40% (RD$1,500/month).
 * Optional creative production is separate and is not discounted.
 *
 * "verifiedDriverCode" MUST come from a trusted backend DB lookup, NEVER
 * from a client-supplied boolean. This helper does not issue an invoice.
 */
export declare const DRIVER_CODE_DISCOUNT_PERCENT: 40;
export declare const ADVERTISER_OFFER_VERSION: "TAD-2026-11-18-DRIVER40";
export interface AdvertiserOfferInput {
    screens: number;
    months: number;
    includeProduction: boolean;
    verifiedDriverCode: boolean;
}
export interface AdvertiserOffer {
    pricingVersion: typeof ADVERTISER_OFFER_VERSION;
    currency: "DOP";
    baseMonthlyScreenRate: number;
    effectiveMonthlyScreenRate: number;
    screens: number;
    months: number;
    baseScreensSubtotal: number;
    verifiedDriverCode: boolean;
    discountPercent: number;
    discountAmount: number;
    screensSubtotal: number;
    productionFee: number;
    subtotal: number;
    taxesIncluded: false;
}
export declare function calculateAdvertiserOffer(input: AdvertiserOfferInput): AdvertiserOffer;
//# sourceMappingURL=index.d.ts.map