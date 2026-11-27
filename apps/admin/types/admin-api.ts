export interface AdvertiserRecord {
  id: string;
  companyName: string;
  contactName?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  websiteUrl?: string;
  instagram?: string;
  facebook?: string;
  pedidosYaUrl?: string;
  uberEatsUrl?: string;
  status?: string;
  productsData?: string;
  campaigns?: CampaignRecord[];
}

export interface ProductRecord {
  img?: string;
  name: string;
  price?: string | number;
  link?: string;
}

export interface CampaignRecord {
  id: string;
  name?: string;
  advertiser?: string;
  advertiserEmail?: string;
  description?: string;
  status?: string;
  budget?: number;
  startDate?: string;
  targetImpressions?: number;
  whatsapp?: string;
  media?: { id: string }[];
  metrics?: { impressions?: number; playCount?: number }[];
}

export interface PortalRequestRecord {
  id: string;
  advertiserId?: string;
  driverId?: string;
  campaignId?: string | null;
  adminNotes?: string | null;
  title: string;
  status: string;
  description?: string;
  type?: string;
  createdAt?: string;
  advertiser?: { companyName?: string; email?: string };
  driver?: { fullName?: string };
  data?: unknown;
}

export interface LedgerRecord {
  id: string;
  type: string;
  amount: number;
  category?: string;
  description?: string;
  reference?: string;
  note?: string;
  taxAmount?: number;
  netAmount?: number;
  createdAt: string;
}
