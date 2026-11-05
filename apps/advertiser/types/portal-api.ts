export interface PublicProduct {
  name: string;
  img?: string;
  price?: string | number;
  link?: string;
}

export interface PublicAdvertiser {
  id: string;
  companyName: string;
  productsData?: string;
  whatsapp?: string;
  instagram?: string;
  facebook?: string;
  websiteUrl?: string;
  pedidosYaUrl?: string;
  uberEatsUrl?: string;
}

export interface AdvertiserCampaign {
  id: string;
  name: string;
  status?: string;
  startDate: string;
  endDate: string;
  whatsapp?: string;
  instagram?: string;
  facebook?: string;
  websiteUrl?: string;
  pedidosYaUrl?: string;
  uberEatsUrl?: string;
}

export interface CampaignReports {
  summary?: { impressions?: number; completions?: number };
  timeSeries?: { date: string; impressions: number; completions?: number }[];
  geographic?: { city: string; impressions: number }[];
}
