import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
export interface AuthUser {
    id: string;
    email: string;
    role: string;
    entityId?: string;
}
interface UpdateAdvertiserDto {
    companyName?: string;
    contactName?: string;
    phone?: string;
    category?: string;
    password?: string;
}
export declare class AdvertisersService {
    private prisma;
    private configService;
    private readonly logger;
    constructor(prisma: PrismaService, configService: ConfigService);
    findAll(): Promise<({
        _count: {
            campaigns: number;
        };
    } & {
        id: string;
        email: string;
        password: string | null;
        createdAt: Date;
        updatedAt: Date;
        companyName: string;
        contactName: string;
        phone: string | null;
        status: string;
        facebook: string | null;
        instagram: string | null;
        productsData: string | null;
        websiteUrl: string | null;
        whatsapp: string | null;
        category: string | null;
        pedidosYaUrl: string | null;
        uberEatsUrl: string | null;
        referredBy: string | null;
    })[]>;
    findOne(id: string): Promise<{
        campaigns: ({
            metrics: {
                id: bigint;
                createdAt: Date;
                deviceId: string | null;
                city: string | null;
                campaignId: string;
                date: Date;
                totalImpressions: number;
                totalCompletions: number;
                totalErrors: number;
                uniqueDevices: number;
                avgCompletionRate: number | null;
            }[];
            media: {
                url: string | null;
                id: string;
                name: string | null;
                createdAt: Date;
                status: string;
                filename: string | null;
                fileSize: bigint | null;
                qrUrl: string | null;
                originalFilename: string | null;
                mime_type: string | null;
                mimeType: string | null;
                size: bigint | null;
                durationSeconds: number | null;
                width: number | null;
                height: number | null;
                storageKey: string | null;
                cdnUrl: string | null;
                hash: string | null;
                hashMd5: string | null;
                hashSha256: string | null;
                campaign_id: string | null;
            }[];
            targetDrivers: {
                id: string;
                password: string | null;
                createdAt: Date;
                updatedAt: Date;
                phone: string;
                status: import(".prisma/client").$Enums.SystemStatus;
                referredBy: string | null;
                fullName: string;
                cedula: string | null;
                licensePlate: string | null;
                taxiPlate: string | null;
                taxiNumber: string | null;
                subscriptionPaid: boolean;
                subscriptionEnd: Date | null;
                onboardingStatus: string;
                onboardedAt: Date;
                blockedAt: Date | null;
                level: string;
                consecutiveMonthsUnderGoal: number;
                identidadVehicular: import("@prisma/client/runtime/library").JsonValue | null;
                hardwareConfig: import("@prisma/client/runtime/library").JsonValue | null;
                insuranceAccepted: boolean;
                insuranceAcceptedAt: Date | null;
                contractAccepted: boolean;
                contractAcceptedAt: Date | null;
                agreementVersion: string | null;
                isSimulated: boolean;
                walletBalance: number;
                referralCode: string | null;
                bankAccount: import("@prisma/client/runtime/library").JsonValue | null;
            }[];
        } & {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            advertiser: string;
            status: string;
            facebook: string | null;
            instagram: string | null;
            websiteUrl: string | null;
            whatsapp: string | null;
            category: string | null;
            pedidosYaUrl: string | null;
            uberEatsUrl: string | null;
            advertiserId: string | null;
            description: string | null;
            active: boolean;
            startDate: Date;
            endDate: Date;
            version: number;
            isGlobal: boolean;
            targetAll: boolean;
            targetCities: string;
            targetCity: string;
            targetFleets: string;
            priority: number;
            targetImpressions: number;
            budget: number;
            targetUrl: string | null;
            createdById: string | null;
            hasSeenTutorial: boolean;
            scheduleDays: string | null;
            scheduleHours: string | null;
            frequencyCap: number;
        })[];
    } & {
        id: string;
        email: string;
        password: string | null;
        createdAt: Date;
        updatedAt: Date;
        companyName: string;
        contactName: string;
        phone: string | null;
        status: string;
        facebook: string | null;
        instagram: string | null;
        productsData: string | null;
        websiteUrl: string | null;
        whatsapp: string | null;
        category: string | null;
        pedidosYaUrl: string | null;
        uberEatsUrl: string | null;
        referredBy: string | null;
    }>;
    create(data: {
        companyName: string;
        contactName: string;
        email: string;
        phone?: string;
        password?: string;
        referralCode?: string;
    }): Promise<{
        id: string;
        email: string;
        password: string | null;
        createdAt: Date;
        updatedAt: Date;
        companyName: string;
        contactName: string;
        phone: string | null;
        status: string;
        facebook: string | null;
        instagram: string | null;
        productsData: string | null;
        websiteUrl: string | null;
        whatsapp: string | null;
        category: string | null;
        pedidosYaUrl: string | null;
        uberEatsUrl: string | null;
        referredBy: string | null;
    }>;
    update(id: string, data: UpdateAdvertiserDto): Promise<{
        id: string;
        email: string;
        password: string | null;
        createdAt: Date;
        updatedAt: Date;
        companyName: string;
        contactName: string;
        phone: string | null;
        status: string;
        facebook: string | null;
        instagram: string | null;
        productsData: string | null;
        websiteUrl: string | null;
        whatsapp: string | null;
        category: string | null;
        pedidosYaUrl: string | null;
        uberEatsUrl: string | null;
        referredBy: string | null;
    }>;
    remove(id: string): Promise<{
        id: string;
        email: string;
        password: string | null;
        createdAt: Date;
        updatedAt: Date;
        companyName: string;
        contactName: string;
        phone: string | null;
        status: string;
        facebook: string | null;
        instagram: string | null;
        productsData: string | null;
        websiteUrl: string | null;
        whatsapp: string | null;
        category: string | null;
        pedidosYaUrl: string | null;
        uberEatsUrl: string | null;
        referredBy: string | null;
    }>;
    getPortalData(id: string): Promise<{
        brand: {
            id: string;
            name: string;
            category: string;
            contact: string;
            email: string;
            phone: string;
            status: string;
        };
        summary: {
            promocionesContratadas: number;
            impressions: number;
            completions: number;
            scans: number;
            activeCampaigns: number;
            contractedScreens: number;
            activeContractedScreens: number;
        };
        telemetry: {
            contractedScreens: any[];
            contractedScreensTotal: number;
            activeContractedScreens: number;
            driverIds: string[];
            deviceIds: string[];
        };
        contractedScreens: any[];
        driverIds: string[];
        deviceIds: string[];
        activeDriverIds: string[];
        stats: {
            totalImpressions: number;
            totalCompletions: number;
            totalScans: number;
            activeCampaigns: number;
            activeNodes: number;
            avgFrequency: number;
            geoDistribution: {
                name: any;
                value: number;
            }[];
        };
        financials: {
            subtotal: number;
            taxAmount: number;
            totalCost: number;
            costPerAd: 1500;
            taxRate: 0.18;
            balanceRD: number;
            invoices: {
                id: string;
                issueDate: string;
                dueDate: string;
                subtotal: number;
                taxAmount: number;
                amount: number;
                totalAmount: number;
                status: string;
                pdfUrl: string;
            }[];
            invoiceStatusSummary: {
                pending: number;
                paid: number;
                overdue: number;
            };
            latestInvoice: {
                id: string;
                date: string;
                status: string;
                amount: number;
            };
        };
        campaigns: {
            id: string;
            name: string;
            status: string;
            start: Date;
            end: Date;
            targetUrl: string;
            promocionesContratadas: number;
            impressions: any;
            completions: any;
            scans: any;
            syncProgress: number;
            totalDevices: number;
            media: {
                id: string;
                url: string;
                type: string;
                name: string;
                category: string;
            }[];
        }[];
        timeSeries: {
            date: string;
            impressions: number;
            completions: number;
        }[];
    }>;
    login(email: string, pass: string): Promise<{
        access_token: string;
        advertiserId: string;
        name: string;
        role: string;
        entityId: string;
    }>;
    recoverPassword(email: string): Promise<{
        success: boolean;
        message: string;
    }>;
    resetPassword(token: string, newPass: string): Promise<{
        success: boolean;
        message: string;
    }>;
    getInvoices(advertiserId: string): Promise<{
        invoices: any[];
        balanceRD: number;
        invoiceStatusSummary: {
            pending: number;
            paid: number;
            overdue: number;
        };
    }>;
    private getAdvertiserVideoIds;
    private getLiveImpressionsForCampaigns;
}
export {};
