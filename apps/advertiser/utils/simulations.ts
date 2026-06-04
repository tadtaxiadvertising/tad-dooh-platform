export interface SimulationResult {
  estimatedImpacts: number;
  recommendedScreens: number;
  costPerImpact: number;
  estimatedCPM: number;
}

export function simulateImpact(
  budget: number,
  city: string,
  screenCount: number
): SimulationResult {
  // Base rates per city
  const cityMultiplier = city === 'Santo Domingo' ? 1.2 : 0.85;
  const baseCostPerScreenPerMonth = 1500;

  const recommendedScreens = Math.min(
    Math.max(Math.floor(budget / baseCostPerScreenPerMonth), 1),
    screenCount
  );

  // Average daily impressions per screen: ~800
  const dailyImpressionsPerScreen = 800;
  const estimatedImpacts = Math.round(
    recommendedScreens * dailyImpressionsPerScreen * 30 * cityMultiplier
  );

  const costPerImpact = estimatedImpacts > 0 ? budget / estimatedImpacts : 0;
  const estimatedCPM = estimatedImpacts > 0 ? (budget / estimatedImpacts) * 1000 : 0;

  return {
    estimatedImpacts,
    recommendedScreens,
    costPerImpact: Math.round(costPerImpact * 100) / 100,
    estimatedCPM: Math.round(estimatedCPM * 100) / 100,
  };
}