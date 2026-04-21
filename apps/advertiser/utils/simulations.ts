/**
 * TAD ADVERTISER — Impression & Impact Simulation Utility
 * ========================================================
 * v10.1.0: Alcance Único (uniqueReach) + Impresiones Totales (2x frecuencia).
 *
 * Reglas de Negocio:
 * - Costo: RD$1,500 por pantalla/mes (bloque 30s).
 * - Alcance Único por pantalla: ~2,000 personas/mes.
 * - Frecuencia: mínimo 2 visualizaciones por pasajero por viaje.
 * - Densidad: 2-3 pasajeros promedio por viaje (factor informativo).
 */

export interface SimulationResult {
  budget: number;
  city: string;
  recommendedScreens: number;
  uniqueReach: number;
  totalImpressions: number;
  onlineScreensInZone: number;
  cpm: number;
}

/**
 * Simula el impacto de campaña antes de creación (cálculo client-side).
 * El backend en /campaigns/simulate-budget aplica la misma lógica con
 * datos reales de pantallas online.
 */
export const simulateImpact = (
  budgetRD: number,
  city: string,
  onlineScreensCount: number = 50 // Default para simulación UI sin backend
): SimulationResult => {
  const costPerScreen = 1500;
  const uniqueReachPerScreen = 2000; // Personas alcanzadas por pantalla/mes
  const viewFrequency = 2; // Visualizaciones mínimas por pasajero por viaje

  const recommendedScreens = Math.min(
    onlineScreensCount,
    Math.floor(budgetRD / costPerScreen)
  );

  const uniqueReach = recommendedScreens * uniqueReachPerScreen;
  const totalImpressions = uniqueReach * viewFrequency;

  return {
    budget: budgetRD,
    city,
    recommendedScreens,
    uniqueReach,
    totalImpressions,
    onlineScreensInZone: onlineScreensCount,
    cpm: costPerScreen,
  };
};
