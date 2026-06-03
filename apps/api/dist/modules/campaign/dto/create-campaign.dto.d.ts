export declare class CreateCampaignDto {
    name: string;
    advertiser: string;
    advertiser_id?: string;
    start_date: string;
    end_date: string;
    active?: boolean;
    target_impressions?: number;
    budget?: number;
    target_devices?: string[];
    target_all?: boolean;
    target_city?: string;
    category?: string;
    whatsapp?: string;
    instagram?: string;
    facebook?: string;
    websiteUrl?: string;
    pedidosYaUrl?: string;
    uberEatsUrl?: string;
}
