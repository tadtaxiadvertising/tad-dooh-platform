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
    getReconciliationReport(period: string): Promise<({
        driver: {
            fullName: string;
            phone: string;
            taxiPlate: string;
        };
    } & {
        id: string;
        deviceId: string | null;
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
    })[]>;
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
