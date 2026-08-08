import { BiService } from './bi.service';
import { BiKpiResponse, TaxiDrillDownResponse } from './interfaces/bi-kpi.interface';
export declare class BiController {
    private readonly biService;
    constructor(biService: BiService);
    getMasterKpis(): Promise<BiKpiResponse>;
    getFleetHealth(): Promise<{
        id: string;
        deviceId: string;
        taxiNumber: string;
        isOnline: boolean;
        batteryLevel: number;
        driverName: string;
    }[]>;
    getTaxiDrillDown(deviceId: string): Promise<TaxiDrillDownResponse>;
    generateReconciliation(dto: {
        period: string;
    }): Promise<{
        period: string;
        total: number;
    }>;
    getReconciliation(period: string): Promise<({
        driver: {
            fullName: string;
            phone: string;
            taxiPlate: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deviceId: string | null;
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
    getHotspots(): Promise<number[][]>;
}
