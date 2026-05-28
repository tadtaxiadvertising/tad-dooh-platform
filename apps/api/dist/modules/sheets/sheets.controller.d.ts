import { SheetsService } from './sheets.service';
import { InvoiceService } from '../finance/invoice.service';
import { Response } from 'express';
export declare class SheetsController {
    private readonly sheetsService;
    private readonly invoiceService;
    private readonly logger;
    constructor(sheetsService: SheetsService, invoiceService: InvoiceService);
    syncAll(): Promise<{
        success: boolean;
        timestamp: string;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        timestamp?: undefined;
    }>;
    getReport(): Promise<Partial<Record<string, any>>[] | {
        error: string;
    }>;
    downloadInvoice(driverId: string, res: Response): Promise<void>;
}
