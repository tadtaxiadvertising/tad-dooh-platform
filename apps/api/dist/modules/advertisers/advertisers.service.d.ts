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
        status: string;
        createdAt: Date;
        updatedAt: Date;
        phone: string | null;
        referredBy: string | null;
        password: string | null;
        category: string | null;
        whatsapp: string | null;
        instagram: string | null;
        facebook: string | null;
        websiteUrl: string | null;
        pedidosYaUrl: string | null;
        uberEatsUrl: string | null;
        companyName: string;
        contactName: string;
        email: string;
        productsData: string | null;
    })[]>;
    findOne(id: string): Promise<{
        campaigns: ({
            media: {
                id: string;
                name: string | null;
                status: string;
                createdAt: Date;
                url: string | null;
                campaign_id: string | null;
                filename: string | null;
                originalFilename: string | null;
                mime_type: string | null;
                mimeType: string | null;
                size: bigint | null;
                fileSize: bigint | null;
                durationSeconds: number | null;
                width: number | null;
                height: number | null;
                storageKey: string | null;
                cdnUrl: string | null;
                hash: string | null;
                hashMd5: string | null;
                hashSha256: string | null;
                qrUrl: string | null;
            }[];
            metrics: {
                id: bigint;
                deviceId: string | null;
                city: string | null;
                createdAt: Date;
                campaignId: string;
                date: Date;
                totalImpressions: number;
                totalCompletions: number;
                totalErrors: number;
                uniqueDevices: number;
                avgCompletionRate: number | null;
            }[];
            targetDrivers: {
                id: string;
                taxiNumber: string | null;
                status: import(".prisma/client").$Enums.SystemStatus;
                createdAt: Date;
                updatedAt: Date;
                isSimulated: boolean;
                fullName: string;
                cedula: string | null;
                phone: string;
                licensePlate: string | null;
                taxiPlate: string | null;
                subscriptionPaid: boolean;
                subscriptionEnd: Date | null;
                onboardingStatus: string;
                onboardedAt: Date;
                blockedAt: Date | null;
                referredBy: string | null;
                password: string | null;
                level: string;
                consecutiveMonthsUnderGoal: number;
                identidadVehicular: import("@prisma/client/runtime/library").JsonValue | null;
                hardwareConfig: import("@prisma/client/runtime/library").JsonValue | null;
                insuranceAccepted: boolean;
                insuranceAcceptedAt: Date | null;
                contractAccepted: boolean;
                contractAcceptedAt: Date | null;
                agreementVersion: string | null;
                walletBalance: number;
                referralCode: string | null;
                bankAccount: import("@prisma/client/runtime/library").JsonValue | null;
            }[];
        } & {
            id: string;
            name: string;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            category: string | null;
            advertiser: string;
            active: boolean;
            budget: number;
            whatsapp: string | null;
            instagram: string | null;
            facebook: string | null;
            websiteUrl: string | null;
            pedidosYaUrl: string | null;
            uberEatsUrl: string | null;
            advertiserId: string | null;
            startDate: Date;
            endDate: Date;
            targetAll: boolean;
            targetCity: string;
            targetImpressions: number;
            description: string | null;
            version: number;
            isGlobal: boolean;
            targetCities: string;
            targetFleets: string;
            priority: number;
            targetUrl: string | null;
            createdById: string | null;
            hasSeenTutorial: boolean;
            scheduleDays: string | null;
            scheduleHours: string | null;
            frequencyCap: number;
        })[];
    } & {
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        phone: string | null;
        referredBy: string | null;
        password: string | null;
        category: string | null;
        whatsapp: string | null;
        instagram: string | null;
        facebook: string | null;
        websiteUrl: string | null;
        pedidosYaUrl: string | null;
        uberEatsUrl: string | null;
        companyName: string;
        contactName: string;
        email: string;
        productsData: string | null;
    }>;
    create(data: {
        companyName: string;
        contactName: string;
        email: string;
        phone?: string;
        password?: string;
    }): Promise<{
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        phone: string | null;
        referredBy: string | null;
        password: string | null;
        category: string | null;
        whatsapp: string | null;
        instagram: string | null;
        facebook: string | null;
        websiteUrl: string | null;
        pedidosYaUrl: string | null;
        uberEatsUrl: string | null;
        companyName: string;
        contactName: string;
        email: string;
        productsData: string | null;
    }>;
    update(id: string, data: UpdateAdvertiserDto): Promise<{
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        phone: string | null;
        referredBy: string | null;
        password: string | null;
        category: string | null;
        whatsapp: string | null;
        instagram: string | null;
        facebook: string | null;
        websiteUrl: string | null;
        pedidosYaUrl: string | null;
        uberEatsUrl: string | null;
        companyName: string;
        contactName: string;
        email: string;
        productsData: string | null;
    }>;
    remove(id: string): Promise<{
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        phone: string | null;
        referredBy: string | null;
        password: string | null;
        category: string | null;
        whatsapp: string | null;
        instagram: string | null;
        facebook: string | null;
        websiteUrl: string | null;
        pedidosYaUrl: string | null;
        uberEatsUrl: string | null;
        companyName: string;
        contactName: string;
        email: string;
        productsData: string | null;
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
