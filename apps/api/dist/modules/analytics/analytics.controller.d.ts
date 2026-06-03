import { Response } from 'express';
import { AnalyticsService } from './analytics.service';
import { WhatsAppService } from '../notifications/whatsapp.service';
import { InvoiceService } from '../finance/invoice.service';
import { PrismaService } from '../prisma/prisma.service';
export declare class AnalyticsController {
    private readonly analyticsService;
    private readonly whatsappService;
    private readonly prisma;
    private readonly invoiceService;
    constructor(analyticsService: AnalyticsService, whatsappService: WhatsAppService, prisma: PrismaService, invoiceService: InvoiceService);
    shareReportByWhatsApp(id: string, body: {
        phone: string;
        advertiserName: string;
        campaignName: string;
        reportUrl: string;
    }): Promise<{
        success: boolean;
        id?: string;
    }>;
    trackQrScan(campaignId: string, deviceId: string, res: Response): Promise<void>;
    ingestEvent(dto: any): Promise<{
        success: boolean;
    }>;
    ingestBatchEvents(body: any): Promise<{
        success: boolean;
    }>;
    getCampaignAnalytics(campaignId: string, req: any): Promise<{
        campaignId: string;
        totalEvents: number;
    }>;
    getDeviceAnalytics(deviceId: string): Promise<{
        deviceId: string;
        totalEvents: number;
    }>;
    getAnalyticsSummary(req: any): Promise<any>;
    getTotalImpressions(req: any): Promise<any>;
    getAntiFraudMetrics(req: any): Promise<any>;
    getTopTaxis(req: any): Promise<any>;
    getHourlyAnalytics(req: any): Promise<{
        hour: string;
        plays: number;
    }[]>;
    getRecentPlays(req: any): Promise<{
        deviceId: string;
        videoId: string;
        timestamp: Date;
        taxiNumber: string;
    }[]>;
    getHeatmap(advertiserId?: string, req?: any): Promise<{
        lat: number;
        lng: number;
        weight: number;
    }[]>;
    getWeeklyCampaignAnalytics(campaignId: string): Promise<{
        day: string;
        impressions: number;
        scans: number;
        ctr: number;
    }[]>;
    downloadWeeklyPdf(id: string, res: Response): Promise<Response<any, Record<string, any>>>;
    trackExternalGps(data: {
        deviceId: string;
        lat: number;
        lng: number;
        speed?: number;
        driverId?: string;
    }): Promise<{
        success: boolean;
    }>;
}
