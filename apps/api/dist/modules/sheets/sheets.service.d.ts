import { OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
export declare class SheetsService implements OnModuleInit {
    private readonly prisma;
    private readonly logger;
    private doc;
    private isConnected;
    private readonly SHEET_ID;
    private readonly CREDENTIALS_ENV_KEYS;
    private readonly CREDENTIALS_PATHS;
    constructor(prisma: PrismaService);
    onModuleInit(): Promise<void>;
    private connectToGoogleSheets;
    private normalizePrivateKey;
    private isValidServiceAccount;
    private parseCredentials;
    private loadCredentialsFromEnv;
    private loadCredentialsFromFileSystem;
    syncAllTables(): Promise<{
        success: boolean;
        timestamp: string;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        timestamp?: undefined;
    }>;
    private syncConductores;
    private syncPantallas;
    private syncAnunciantes;
    private syncMarcas;
    private syncPagos;
    private syncIngresos;
    private syncSuscripciones;
    private syncConciliacion;
    private syncEstadoResultados;
    private syncCuentasPorCobrar;
    getSecondaryDBData(): Promise<Partial<Record<string, any>>[]>;
}
