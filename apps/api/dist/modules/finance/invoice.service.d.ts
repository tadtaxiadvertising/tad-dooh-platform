import { OnModuleInit } from '@nestjs/common';
export declare class InvoiceService implements OnModuleInit {
    private readonly logger;
    onModuleInit(): void;
    generateDriverSettlementPDF(driverData: any): Promise<Buffer>;
    generateDebtInvoicePDF(driverData: any): Promise<Buffer>;
    generateCampaignProofOfPlayPDF(campaignData: any, metrics: any): Promise<Buffer>;
    generateFleetStatusPDF(devices: any[]): Promise<Buffer>;
    generateTransactionReceiptPDF(tx: any): Promise<Buffer>;
    generateWeeklyPerformancePDF(campaign: any, data: any[]): Promise<Buffer>;
    generateProformaPDF(data: any): Promise<Buffer>;
    private refId;
}
