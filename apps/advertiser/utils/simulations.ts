import {
  calculateImpact,
  formatRange,
  formatCPM,
  getCalibrationBadge,
  getPrimarySource,
  ImpactOutput,
} from "@tad/impact-calculator";

/**
 * Legacy interface — mantener compatibilidad con planner.tsx
 */
export interface SimulationResult {
  estimatedImpacts: number;
  recommendedScreens: number;
  costPerImpact: number;
  estimatedCPM: number;
}

/**
 * NUEVA interfaz extendida con rango + fuentes
 */
export interface SimulationResultDetailed extends SimulationResult {
  estimatedImpactsRange: { min: number; expected: number; max: number };
  uniqueReach: { min: number; expected: number; max: number };
  frequencyOTS: { min: number; expected: number; max: number };
  cpmRange: { min: number; expected: number; max: number };
  warnings: string[];
  sourceLabel: string;
  sourceTier: "A" | "B" | "C" | "D";
  calibrationLabel: string;
  calibrationColor: "red" | "amber" | "green";
  calibrationDescription: string;
}

/**
 * Mapeo de ciudad a factor de disponibilidad de pantallas
 * (basado en densidad de flota real estimada por ciudad)
 */
const CITY_SCREEN_FACTORS: Record<string, number> = {
  "Santo Domingo": 1.0,
  Santiago: 0.65,
  "Punta Cana": 0.35,
  Global: 0.8,
};

/**
 * Wrapper legacy — mantiene API antigua para planner.tsx
 * Calcula screens recomendados desde presupuesto, luego delega a calculateImpact
 */
export function simulateImpact(
  budget: number,
  city: string,
  screenCount: number,
): SimulationResult {
  const cityFactor = CITY_SCREEN_FACTORS[city] ?? 0.8;
  const baseCostPerScreen = 2500; // Alineado con nuevo tarifario

  const recommendedScreens = Math.min(
    Math.max(Math.floor(budget / baseCostPerScreen), 1),
    Math.floor(screenCount * cityFactor),
  );

  const months = 1; // planner asume 1 mes
  const detailed = calculateImpact({
    screens: recommendedScreens,
    months,
    frequencySeconds: 30,
    includeProduction: false,
    mode: "expected",
  });

  return {
    estimatedImpacts: detailed.totalImpressions.expected,
    recommendedScreens,
    costPerImpact:
      detailed.totalImpressions.expected > 0
        ? Math.round(
            (detailed.totalCost / detailed.totalImpressions.expected) * 100,
          ) / 100
        : 0,
    estimatedCPM: detailed.cpm.expected,
  };
}

/**
 * NUEVA API recomendada — devuelve detalle completo con rangos, fuentes, warnings
 */
export function simulateImpactDetailed(
  budget: number,
  city: string,
  screenCount: number,
): SimulationResultDetailed {
  const cityFactor = CITY_SCREEN_FACTORS[city] ?? 0.8;
  const baseCostPerScreen = 2500;

  const recommendedScreens = Math.min(
    Math.max(Math.floor(budget / baseCostPerScreen), 1),
    Math.floor(screenCount * cityFactor),
  );

  const months = 1;
  const detailed: ImpactOutput = calculateImpact({
    screens: recommendedScreens,
    months,
    frequencySeconds: 30,
    includeProduction: false,
    mode: "expected",
  });

  const badge = getCalibrationBadge();
  const primarySource = getPrimarySource();

  return {
    estimatedImpacts: detailed.totalImpressions.expected,
    recommendedScreens,
    costPerImpact:
      detailed.totalImpressions.expected > 0
        ? Math.round(
            (detailed.totalCost / detailed.totalImpressions.expected) * 100,
          ) / 100
        : 0,
    estimatedCPM: detailed.cpm.expected,
    estimatedImpactsRange: detailed.totalImpressions,
    uniqueReach: detailed.totalUniqueReach,
    frequencyOTS: detailed.frequencyOTS,
    cpmRange: detailed.cpm,
    warnings: detailed.warnings,
    sourceLabel: primarySource.label,
    sourceTier: primarySource.tier,
    calibrationLabel: badge.label,
    calibrationColor: badge.color,
    calibrationDescription: badge.description,
  };
}

/**
 * Helper para UI: badge de incertidumbre
 */
export function getUncertaintyBadge(): {
  label: string;
  color: "red" | "amber" | "green";
  description: string;
} {
  return getCalibrationBadge();
}

/**
 * Helper para UI: fuentes primarias
 */
export function getSources(): {
  label: string;
  tier: "A" | "B" | "C" | "D";
  url?: string;
} {
  return getPrimarySource();
}
