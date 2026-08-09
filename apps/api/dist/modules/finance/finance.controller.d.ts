import { FinanceService } from './finance.service';
import { InvoiceService } from './invoice.service';
import { WhatsAppService } from '../notifications/whatsapp.service';
import { EmailService } from '../notifications/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { Response } from 'express';
export declare class FinanceController {
    private readonly financeService;
    private readonly invoiceService;
    private readonly whatsappService;
    private readonly emailService;
    private readonly prisma;
    constructor(financeService: FinanceService, invoiceService: InvoiceService, whatsappService: WhatsAppService, emailService: EmailService, prisma: PrismaService);
    downloadCampaignPdf(id: string, res: Response): Promise<Response<any, Record<string, any>>>;
    downloadFleetPdf(res: Response): Promise<void>;
    downloadTransactionPdf(id: string, res: Response): Promise<Response<any, Record<string, any>>>;
    getPayroll(month?: string, year?: string): Promise<({
        driverId: string;
        driverName: string;
        driverPhone: string;
        taxiNumber: string;
        activeAds: number;
        adIncome: number;
        baseCommission: number;
        gpsPoints: number;
        referralBonus: number;
        advertiserReferralBonus: number;
        totalAmount: number;
        currency: string;
        status: string;
        paidAt: Date;
        reference: string;
        error?: undefined;
    } | {
        driverId: string;
        driverName: any;
        driverPhone: any;
        taxiNumber: string;
        activeAds: number;
        adIncome: number;
        baseCommission: number;
        gpsPoints: number;
        referralBonus: number;
        advertiserReferralBonus: number;
        totalAmount: number;
        currency: string;
        status: string;
        error: boolean;
        paidAt?: undefined;
        reference?: undefined;
    })[] | {
        error: string;
        message: any;
        timestamp: string;
    }>;
    processPayment(data: {
        driverId: string;
        month: number;
        year: number;
        reference: string;
    }): Promise<{
        id: string;
        status: string;
        createdAt: Date;
        activeAds: number;
        driverId: string;
        amount: number;
        month: number;
        year: number;
        referenceNum: string | null;
        paidAt: Date | null;
        penaltyApplied: boolean;
        penaltyPercentage: number;
        transmissionHours: number;
        gpsPoints: number;
    }>;
    sendWhatsAppPaymentConfirm(body: {
        phone: string;
        driverName: string;
        amount: number;
        month: string;
    }): Promise<{
        success: boolean;
        id?: string;
    }>;
    triggerMonthlyBilling(data: {
        month?: number;
        year?: number;
    }): Promise<{
        success: boolean;
        message: string;
        count: number;
    } | {
        success: boolean;
        count: number;
        message?: undefined;
    }>;
    getCampaignBilling(): Promise<{
        campaignId: string;
        campaignName: string;
        totalImpressions: number;
        assignedTaxis: number;
        estimatedRevenue: number;
        status: string;
    }[]>;
    getInvoice(campaignId: string, res: Response): Promise<Response<any, Record<string, any>>>;
    exportPayroll(month: string, year: string, res: Response): Promise<void>;
    exportCampaigns(res: Response): Promise<void>;
    exportSingleCampaign(id: string, res: Response): Promise<void>;
    recordTransaction(data: {
        type: string;
        category: string;
        amount: number;
        entityId?: string;
        reference?: string;
        note?: string;
        status?: string;
    }): Promise<{
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        category: string;
        type: string;
        amount: number;
        netAmount: number;
        taxAmount: number;
        entityId: string | null;
        reference: string | null;
        note: string | null;
    }>;
    getSummary(): Promise<{
        mrr: number;
        campaignRevenue: number;
        burnRate: number;
        activeSubscribers: number;
        netProjection: number;
        currency: string;
        timestamp: Date;
    }>;
    getInvestorMetrics(): Promise<{
        cac: string;
        ltv: string;
        paybackPeriod: string;
        ebitda: string;
        activeTaxis: number;
        monthlyRevPerTaxi: string;
        monthlyOpexPerTaxi: string;
        hardwareCostPerUnit: 6000;
        currency: string;
        generatedAt: Date;
    }>;
    getLedger(): Promise<{
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        category: string;
        type: string;
        amount: number;
        netAmount: number;
        taxAmount: number;
        entityId: string | null;
        reference: string | null;
        note: string | null;
    }[]>;
    emailCampaignReport(id: string, body: {
        email: string;
        advertiserName?: string;
        reportUrl?: string;
    }): Promise<{
        success: boolean;
        message: string;
    }>;
    emailInvoice(campaignId: string, body: {
        email: string;
        amount?: number;
    }): Promise<{
        success: boolean;
        message: string;
    }>;
    emailDriverPaymentConfirm(body: {
        email: string;
        driverName: string;
        amount: number;
        month: string;
        driverId?: string;
    }): Promise<{
        message: string;
        success: boolean;
    }>;
}
