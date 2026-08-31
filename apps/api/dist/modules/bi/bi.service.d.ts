import { PrismaService } from '../prisma/prisma.service';
import { BiKpiResponse, TaxiDrillDownResponse } from './interfaces/bi-kpi.interface';
export declare class BiService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    getMasterKpis(): Promise<BiKpiResponse>;
    getTaxiDrillDown(deviceId: string): Promise<TaxiDrillDownResponse>;
    generateReconciliationReport(period: string): Promise<{
        period: string;
        total: number;
    }>;
    getReconciliationReport(period: string, page?: number, pageSize?: number): Promise<{
        period: string;
        data: ({
            driver: {
                phone: string;
                fullName: string;
                taxiPlate: string;
            };
        } & {
            deviceId: string | null;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            driverId: string;
            subscriptionStatus: string;
            period: string;
            subscriptionDueDate: Date | null;
            subscriptionAmount: number;
            totalPlaybacks: number;
            activeCampaigns: number;
            revenueContracted: number;
            revenueReceived: number;
            payrollDue: number;
            payrollPaid: number;
            hasDiscrepancy: boolean;
            discrepancyType: string;
            discrepancyAmount: number;
        })[];
        total: number;
        page: number;
        pageSize: number;
        totalPages: number;
    }>;
    getFleetHealth(take?: number): Promise<{
        id: string;
        deviceId: string;
        taxiNumber: string;
        isOnline: boolean;
        batteryLevel: number;
        driverName: string;
    }[]>;
    getHotspots(): Promise<number[][]>;
}
