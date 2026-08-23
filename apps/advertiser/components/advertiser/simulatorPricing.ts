export const SCREEN_MONTHLY_RATE = 2500;
export const PRODUCTION_FEE = 2500;
export const DAILY_ACTIVE_HOURS = 10;
export const ATTENTION_RATE = 0.4;
export const FIXED_FREQUENCY_SECONDS = 30;

export interface CampaignConfig {
  screens: number;
  months: number;
  frequencySeconds: number;
}

export interface CampaignEstimate {
  screensCost: number;
  frequencyUplift: number;
  productionFee: number;
  total: number;
  impressions: number;
}

export function estimateImpressions(config: CampaignConfig): number {
  const playsPerHour = 3600 / FIXED_FREQUENCY_SECONDS;
  const dailyPerScreen = playsPerHour * DAILY_ACTIVE_HOURS * ATTENTION_RATE;
  return Math.round(config.screens * config.months * 30 * dailyPerScreen);
}

export function estimateCampaign(config: CampaignConfig): CampaignEstimate {
  const screensCost = config.screens * config.months * SCREEN_MONTHLY_RATE;
  const frequencyUplift = 0;
  const total = Math.round(screensCost + PRODUCTION_FEE);
  return {
    screensCost,
    frequencyUplift,
    productionFee: PRODUCTION_FEE,
    total,
    impressions: estimateImpressions(config),
  };
}