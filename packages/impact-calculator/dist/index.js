"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ADVERTISER_OFFER_VERSION = exports.DRIVER_CODE_DISCOUNT_PERCENT = exports.isCalibrationStatus = exports.getActiveSource = exports.getSource = exports.SOURCES = void 0;
exports.calculateImpact = calculateImpact;
exports.calculateImpactLegacy = calculateImpactLegacy;
exports.formatRange = formatRange;
exports.formatCPM = formatCPM;
exports.getPrimarySource = getPrimarySource;
exports.getCalibrationBadge = getCalibrationBadge;
exports.calculateAdvertiserOffer = calculateAdvertiserOffer;
const sources_1 = require("./sources");
Object.defineProperty(exports, "SOURCES", { enumerable: true, get: function () { return sources_1.SOURCES; } });
Object.defineProperty(exports, "getSource", { enumerable: true, get: function () { return sources_1.getSource; } });
Object.defineProperty(exports, "getActiveSource", { enumerable: true, get: function () { return sources_1.getActiveSource; } });
Object.defineProperty(exports, "isCalibrationStatus", { enumerable: true, get: function () { return sources_1.isCalibrationStatus; } });
/** Extrae el valor numérico para un modo específico */
function pick(val, mode) {
    if (typeof val === "number")
        return val;
    const [min, expected, max] = val;
    switch (mode) {
        case "conservative":
            return min;
        case "optimistic":
            return max;
        default:
            return expected;
    }
}
/** Fuente por variable (para obtener el rango correcto) */
function sourceValue(id) {
    const s = (0, sources_1.getSource)(id);
    if (!s)
        throw new Error(`Source not found: ${id}`);
    return s.value;
}
/** Cálculo principal — pura matemática, sin side effects */
function calculateImpact(input) {
    const mode = input.mode ?? "expected";
    const { screens, months, includeProduction } = input;
    // --- Constantes desde fuentes ---
    const rotationSeconds = sourceValue("rotation-seconds"); // 30
    const dailyActiveHoursRange = sourceValue("daily-active-hours");
    const attentionRateRange = sourceValue("attention-rate");
    const occupancyRateRange = sourceValue("taxi-occupancy-rate");
    const passengersPerTripRange = sourceValue("passengers-per-trip");
    const taxiUseFrequencyRange = sourceValue("taxi-use-frequency-monthly");
    const screenMonthlyRate = sourceValue("screen-monthly-rate-rd");
    const productionFee = sourceValue("creative-production-fee");
    // Trips por hora operativa (asumido: 2.5 viajes/hora en ciudad)
    const TRIPS_PER_HOUR = 2.5;
    // Helper para modo
    const pickR = (val) => pick(val, mode);
    // --- PASO 1: Impresiones brutas por pantalla/mes ---
    const playsPerHour = 3600 / rotationSeconds; // 120
    const dailyActiveHours = pickR(dailyActiveHoursRange);
    const attentionRate = pickR(attentionRateRange);
    const dailyPlaysPerScreen = playsPerHour * dailyActiveHours; // 120 × 10 = 1200
    const dailyGrossImpressionsPerScreen = dailyPlaysPerScreen * attentionRate; // 1200 × 0.45 = 540
    const monthlyGrossImpressionsPerScreen = dailyGrossImpressionsPerScreen * 30; // 16,200
    // Rango completo
    const minDailyHours = dailyActiveHoursRange[0];
    const maxDailyHours = dailyActiveHoursRange[2];
    const minAttention = attentionRateRange[0];
    const maxAttention = attentionRateRange[2];
    const minMonthlyGross = (3600 / rotationSeconds) * minDailyHours * minAttention * 30;
    const expectedMonthlyGross = monthlyGrossImpressionsPerScreen;
    const maxMonthlyGross = (3600 / rotationSeconds) * maxDailyHours * maxAttention * 30;
    // --- PASO 2: Pasajeros totales por pantalla/mes ---
    const occupancyRate = pickR(occupancyRateRange);
    const passengersPerTrip = pickR(passengersPerTripRange);
    const taxiUseFreq = pickR(taxiUseFrequencyRange);
    const monthlyTripsWithPax = dailyActiveHours * 30 * occupancyRate * TRIPS_PER_HOUR;
    const monthlyTotalPassengers = monthlyTripsWithPax * passengersPerTrip;
    // Rangos
    const minOccupancy = occupancyRateRange[0];
    const maxOccupancy = occupancyRateRange[2];
    const minPaxTrip = passengersPerTripRange[0];
    const maxPaxTrip = passengersPerTripRange[2];
    const minFreq = taxiUseFrequencyRange[0];
    const maxFreq = taxiUseFrequencyRange[2];
    const minMonthlyTrips = minDailyHours * 30 * minOccupancy * TRIPS_PER_HOUR;
    const maxMonthlyTrips = maxDailyHours * 30 * maxOccupancy * TRIPS_PER_HOUR;
    const minMonthlyPassengers = minMonthlyTrips * minPaxTrip;
    const expectedMonthlyPassengers = monthlyTotalPassengers;
    const maxMonthlyPassengers = maxMonthlyTrips * maxPaxTrip;
    // --- PASO 3: Frecuencia OTS (Over-The-Shoulder) ---
    // Cada viaje en taxi = 1 oportunidad de ver la pantalla.
    // Frecuencia OTS = viajes de taxi per cápita / mes → cuántas veces una misma
    // persona es expuesta en el mes. Uso directo de la fuente `taxi-use-frequency-monthly`.
    const expectedFrequency = taxiUseFreq;
    const minFrequency = minFreq;
    const maxFrequency = maxFreq;
    // --- PASO 4: Alcance único (desduplicado por frecuencia de uso) ---
    // Personas únicas = pasajeros totales / exposiciones por persona.
    const expectedReach = expectedMonthlyPassengers / expectedFrequency;
    const minReach = minMonthlyPassengers / maxFrequency; // conservador: menos pax, más frecuencia → menos únicos
    const maxReach = maxMonthlyPassengers / minFrequency; // optimista: más pax, menos frecuencia → más únicos
    // --- PASO 5: Escalar a campaña ---
    const campaignMultiplier = screens * months;
    const totalImpressionsMin = Math.round(minMonthlyGross * campaignMultiplier);
    const totalImpressionsExpected = Math.round(expectedMonthlyGross * campaignMultiplier);
    const totalImpressionsMax = Math.round(maxMonthlyGross * campaignMultiplier);
    const totalReachMin = Math.round(minReach * campaignMultiplier);
    const totalReachExpected = Math.round(expectedReach * campaignMultiplier);
    const totalReachMax = Math.round(maxReach * campaignMultiplier);
    // --- PASO 6: Costos y CPM ---
    const screensCost = screens * months * screenMonthlyRate;
    const prodFee = includeProduction ? productionFee : 0;
    const totalCost = screensCost + prodFee;
    // CPM: menos impresiones = CPM más alto. Ordenar min ≤ expected ≤ max.
    const cpmAt = (imps) => imps > 0
        ? Math.round((totalCost / imps) * 1000)
        : Math.round(totalCost * 1000);
    const cpmLow = cpmAt(totalImpressionsMax); // más imps → CPM más bajo
    const cpmExp = cpmAt(totalImpressionsExpected);
    const cpmHigh = cpmAt(totalImpressionsMin); // menos imps → CPM más alto
    const cprLow = totalReachMax > 0 ? Math.round(totalCost / totalReachMax) : totalCost;
    const cprExp = totalReachExpected > 0
        ? Math.round(totalCost / totalReachExpected)
        : totalCost;
    const cprHigh = totalReachMin > 0 ? Math.round(totalCost / totalReachMin) : totalCost;
    // --- Auditoría ---
    const sourcesUsed = [
        (0, sources_1.getSource)("rotation-seconds"),
        (0, sources_1.getSource)("daily-active-hours"),
        (0, sources_1.getSource)("attention-rate"),
        (0, sources_1.getSource)("taxi-occupancy-rate"),
        (0, sources_1.getSource)("passengers-per-trip"),
        (0, sources_1.getSource)("taxi-use-frequency-monthly"),
        (0, sources_1.getSource)("screen-monthly-rate-rd"),
        (0, sources_1.getSource)("creative-production-fee"),
    ].filter((s) => Boolean(s));
    const calibration = (0, sources_1.isCalibrationStatus)();
    const warnings = [];
    if (!calibration.hasOwnData) {
        warnings.push("Cálculo basado en benchmarks internacionales (sin datos operativos RD propios). Incertidumbre alta: ~±40-60%.");
    }
    // Public warnings must describe the exact sources used by THIS estimate,
    // not deprecated historical entries in the global calibration catalog.
    // A date expires after its final UTC calendar day; never silently renew it.
    const todayUTC = new Date().toISOString().slice(0, 10);
    const expiredUsedSources = sourcesUsed.filter((source) => source.stale === true || source.expiresAt < todayUTC);
    if (expiredUsedSources.length > 0) {
        warnings.push(`${expiredUsedSources.length} fuente(s) utilizada(s) vencida(s) — revisar vigencia de los benchmarks`);
        expiredUsedSources.forEach((source) => {
            warnings.push(`Fuente vencida: ${source.id} (${source.studyName})`);
        });
    }
    return {
        screensCost,
        productionFee: prodFee,
        totalCost,
        impressionsPerScreenPerMonth: {
            min: Math.round(minMonthlyGross),
            expected: Math.round(expectedMonthlyGross),
            max: Math.round(maxMonthlyGross),
        },
        totalImpressions: {
            min: totalImpressionsMin,
            expected: totalImpressionsExpected,
            max: totalImpressionsMax,
        },
        uniqueReachPerScreenPerMonth: {
            min: Math.round(minReach),
            expected: Math.round(expectedReach),
            max: Math.round(maxReach),
        },
        totalUniqueReach: {
            min: totalReachMin,
            expected: totalReachExpected,
            max: totalReachMax,
        },
        frequencyOTS: {
            min: Number(minFrequency.toFixed(1)),
            expected: Number(expectedFrequency.toFixed(1)),
            max: Number(maxFrequency.toFixed(1)),
        },
        cpm: { min: cpmLow, expected: cpmExp, max: cpmHigh },
        costPerReach: { min: cprLow, expected: cprExp, max: cprHigh },
        sourcesUsed,
        calibrationStatus: calibration,
        warnings,
        calculatedAt: new Date().toISOString(),
        mode,
    };
}
/** Wrapper simplificado para compatibilidad con código legacy (point-only) */
function calculateImpactLegacy(screens, months, frequencySeconds, includeProduction) {
    const full = calculateImpact({
        screens,
        months,
        frequencySeconds,
        includeProduction,
        mode: "expected",
    });
    return {
        totalCost: full.totalCost,
        impressions: full.totalImpressions.expected,
        screensCost: full.screensCost,
        productionFee: full.productionFee,
    };
}
/** Helper para UI: devuelve string legible "X (Y–Z)" */
function formatRange(r) {
    if (r.min === r.expected && r.expected === r.max) {
        return r.expected.toLocaleString("es-DO");
    }
    return `${r.expected.toLocaleString("es-DO")} (${r.min.toLocaleString("es-DO")}–${r.max.toLocaleString("es-DO")})`;
}
/** Helper para UI: CPM string */
function formatCPM(r) {
    if (r.min === r.expected && r.expected === r.max) {
        return `RD$ ${r.expected.toLocaleString("es-DO")}/CPM`;
    }
    return `RD$ ${r.expected.toLocaleString("es-DO")}/CPM (${r.min.toLocaleString("es-DO")}–${r.max.toLocaleString("es-DO")})`;
}
/** Helper para UI: badge de fuente principal */
function getPrimarySource() {
    return {
        label: "IAB DOOH Guidelines + Geopath 2024",
        tier: "B",
        url: "https://iabtechlab.com/standards/digital-out-of-home-measurement-guidelines/",
    };
}
/** Helper para UI: status de calibración */
function getCalibrationBadge() {
    return {
        label: "Benchmark internacional (sin datos RD propios)",
        color: "amber",
        description: "Calculado con benchmarks IAB/Geopath/NYC-TLC. Incertidumbre ~±40-60%. Datos propios DIGESETT/ONE/eye-tracking pendientes Q4 2026.",
    };
}
/**
 * TAD commercial offer for NEW advertiser onboarding requests only.
 * The base screen rate is RD$2,500/month. A database-verified driver's
 * referral code discounts the SCREEN price by 40% (RD$1,500/month).
 * Optional creative production is separate and is not discounted.
 *
 * "verifiedDriverCode" MUST come from a trusted backend DB lookup, NEVER
 * from a client-supplied boolean. This helper does not issue an invoice.
 */
exports.DRIVER_CODE_DISCOUNT_PERCENT = 40;
exports.ADVERTISER_OFFER_VERSION = "TAD-2026-11-18-DRIVER40";
function calculateAdvertiserOffer(input) {
    if (!Number.isSafeInteger(input.screens) ||
        input.screens < 1 || input.screens > 100 ||
        !Number.isSafeInteger(input.months) ||
        input.months < 1 || input.months > 12 ||
        typeof input.includeProduction !== "boolean" ||
        typeof input.verifiedDriverCode !== "boolean") {
        throw new Error("Invalid advertiser quote configuration");
    }
    const unitPrice = (0, sources_1.getSource)("screen-monthly-rate-rd")?.value;
    const creativePrice = (0, sources_1.getSource)("creative-production-fee")?.value;
    if (typeof unitPrice !== "number" || !Number.isSafeInteger(unitPrice) || unitPrice <= 0 ||
        typeof creativePrice !== "number" || !Number.isSafeInteger(creativePrice) || creativePrice < 0) {
        throw new Error("Missing or invalid advertiser price source");
    }
    const baseScreensSubtotal = input.screens * input.months * unitPrice;
    const discountPercent = input.verifiedDriverCode ? exports.DRIVER_CODE_DISCOUNT_PERCENT : 0;
    const discountAmount = Math.round(baseScreensSubtotal * discountPercent / 100);
    const screensSubtotal = baseScreensSubtotal - discountAmount;
    const productionFee = input.includeProduction ? creativePrice : 0;
    return {
        pricingVersion: exports.ADVERTISER_OFFER_VERSION,
        currency: "DOP",
        baseMonthlyScreenRate: unitPrice,
        effectiveMonthlyScreenRate: Math.round(unitPrice * (100 - discountPercent) / 100),
        screens: input.screens,
        months: input.months,
        baseScreensSubtotal,
        verifiedDriverCode: input.verifiedDriverCode,
        discountPercent,
        discountAmount,
        screensSubtotal,
        productionFee,
        subtotal: screensSubtotal + productionFee,
        taxesIncluded: false,
    };
}
