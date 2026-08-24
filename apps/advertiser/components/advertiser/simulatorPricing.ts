export const SCREEN_MONTHLY_RATE = 2500;
export const PRODUCTION_FEE = 2500;
export const DAILY_ACTIVE_HOURS = 10;
export const ATTENTION_RATE = 0.4;
export const FIXED_FREQUENCY_SECONDS = 30;
export const REFERRAL_DRIVER_BONUS = 500;
export const REFERRAL_BUSINESS_BONUS = 1000;

export interface CampaignConfig {
  screens: number;
  months: number;
  frequencySeconds: number;
  includeProduction: boolean;
  invitedDrivers: number;
  referredBusinesses: number;
}

export interface CampaignEstimate {
  screensCost: number;
  frequencyUplift: number;
  productionFee: number;
  referralDriverBonus: number;
  referralBusinessBonus: number;
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
  const productionFee = config.includeProduction ? PRODUCTION_FEE : 0;
  const referralDriverBonus = config.invitedDrivers * REFERRAL_DRIVER_BONUS;
  const referralBusinessBonus = config.referredBusinesses * REFERRAL_BUSINESS_BONUS;
  const total = Math.round(screensCost + productionFee - referralDriverBonus - referralBusinessBonus);
  return {
    screensCost,
    frequencyUplift: 0,
    productionFee,
    referralDriverBonus,
    referralBusinessBonus,
    total: Math.max(0, total),
    impressions: estimateImpressions(config),
  };
}