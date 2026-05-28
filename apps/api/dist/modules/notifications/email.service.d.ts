import { OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
export declare class EmailService implements OnModuleInit {
    private readonly prisma;
    private readonly logger;
    private transporter;
    private isLive;
    private readonly MAX_RETRIES;
    private readonly BASE_DELAY_MS;
    constructor(prisma: PrismaService);
    onModuleInit(): void;
    private initTransporter;
    sendEmail(options: {
        to: string;
        subject: string;
        html: string;
        attachments?: Array<{
            filename: string;
            content: Buffer;
            contentType: string;
        }>;
    }): Promise<{
        success: boolean;
        messageId?: string;
    }>;
    sendEmailAsync(options: Parameters<typeof this.sendEmail>[0]): void;
    private logSystemError;
    sendCampaignReport(to: string, advertiserName: string, campaignName: string, pdfBuffer: Buffer, reportUrl?: string): Promise<{
        success: boolean;
    }>;
    sendInvoice(to: string, advertiserName: string, campaignName: string, invoiceId: string, amount: number, pdfBuffer: Buffer): Promise<{
        success: boolean;
    }>;
    sendDriverPaymentConfirmation(to: string, driverName: string, amount: number, month: string, pdfBuffer?: Buffer): Promise<{
        success: boolean;
    }>;
    sendDelinquencyAlert(to: string, driverName: string, deviceId: string, pdfBuffer: Buffer): Promise<{
        success: boolean;
    }>;
    private buildCampaignReportHtml;
    private buildInvoiceHtml;
    private buildDriverPaymentHtml;
    private buildDelinquencyHtml;
}
