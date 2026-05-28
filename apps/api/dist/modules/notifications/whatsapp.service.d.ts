export declare class WhatsAppService {
    private readonly logger;
    private readonly INSTANCE_ID;
    private readonly TOKEN;
    private readonly API_URL;
    sendMessage(to: string, message: string): Promise<{
        success: boolean;
        id?: string;
    }>;
    sendImpactReport(to: string, advertiserName: string, campaignName: string, reportUrl: string): Promise<{
        success: boolean;
        id?: string;
    }>;
    sendDriverPaymentConfirm(to: string, driverName: string, amount: number, month: string): Promise<{
        success: boolean;
        id?: string;
    }>;
    sendDelinquencyAlert(to: string, driverName: string, deviceId: string): Promise<{
        success: boolean;
        id?: string;
    }>;
}
