export const SCREEN_WEEKLY_RATE = 300;
export const PRODUCTION_FEE = 2500;
export const DAILY_ACTIVE_HOURS = 10;
export const ATTENTION_RATE = 0.4;

export interface CampaignConfig {
  screens: number;
  weeks: number;
  frequencySeconds: number;
}

export interface CampaignEstimate {
  screensCost: number;
  frequencyUplift: number;
  productionFee: number;
  total: number;
  impressions: number;
}

export function frequencyMultiplier(intervalSeconds: number): number {
  return 1 + ((300 - intervalSeconds) / 270) * 0.5;
}

export function estimateImpressions(config: CampaignConfig): number {
  const playsPerHour = 3600 / config.frequencySeconds;
  const dailyPerScreen = playsPerHour * DAILY_ACTIVE_HOURS * ATTENTION_RATE;
  return Math.round(config.screens * config.weeks * 7 * dailyPerScreen);
}

export function estimateCampaign(config: CampaignConfig): CampaignEstimate {
  const screensCost = config.screens * config.weeks * SCREEN_WEEKLY_RATE;
  const multiplier = frequencyMultiplier(config.frequencySeconds);
  const frequencyUplift = Math.round(screensCost * (multiplier - 1));
  const total = Math.round(screensCost * multiplier + PRODUCTION_FEE);
  return {
    screensCost,
    frequencyUplift,
    productionFee: PRODUCTION_FEE,
    total,
    impressions: estimateImpressions(config),
  };
}
