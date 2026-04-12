/**
 * TAD ADVERTISER — Impression & Impact Simulation Utility
 * ========================================================
 * Implements deterministic algorithms to estimate reach based on traffic density.
 */

export interface SimulationResult {
  budget: number;
  city: string;
  recommendedScreens: number;
  estimatedImpacts: number;
  onlineScreensInZone: number;
  cpm: number;
}

/**
 * Simulates campaign impact for an advertiser before creation.
 * Rules:
 * - AVG CPM: RD$ 1,500 per month per screen (Base)
 * - Impacts: ~10,000 monthly verified impressions per screen in Santo Domingo.
 * - Multiplier: Santiago +15% density, Others -20%.
 */
export const simulateImpact = (
  budgetRD: number, 
  city: string, 
  onlineScreensCount: number = 50 // Default for UI simulation if no backend value
): SimulationResult => {
  const avgCpm = 1500;
  let estimatedImpactsPerScreen = 10000;

  // Regional adjustments
  if (city === 'Santiago') estimatedImpactsPerScreen *= 1.15;
  if (city === 'Otro') estimatedImpactsPerScreen *= 0.8;

  const recommendedScreens = Math.min(
    onlineScreensCount,
    Math.floor(budgetRD / avgCpm)
  );

  const totalEstimatedImpacts = recommendedScreens * estimatedImpactsPerScreen;

  return {
    budget: budgetRD,
    city,
    recommendedScreens,
    estimatedImpacts: totalEstimatedImpacts,
    onlineScreensInZone: onlineScreensCount,
    cpm: avgCpm
  };
};
