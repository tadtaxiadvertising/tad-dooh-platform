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
    getReconciliation(period: string, page?: string, pageSize?: string): Promise<{
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
    getHotspots(): Promise<number[][]>;
}
