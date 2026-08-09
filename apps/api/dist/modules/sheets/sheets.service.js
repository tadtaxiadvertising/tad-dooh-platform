"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var SheetsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SheetsService = void 0;
const common_1 = require("@nestjs/common");
const google_auth_library_1 = require("google-auth-library");
const prisma_service_1 = require("../prisma/prisma.service");
const business_rules_1 = require("../../common/constants/business-rules");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
let SheetsService = SheetsService_1 = class SheetsService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(SheetsService_1.name);
        this.isConnected = false;
        this.SHEET_ID = '1x2PQInj1F5CJnotWVNkCuGEKqULeO9Vv7qkUvmtd-LY';
        this.CREDENTIALS_ENV_KEYS = [
            'GOOGLE_SERVICE_ACCOUNT_JSON_BASE64',
            'GOOGLE_SERVICE_ACCOUNT_JSON',
            'GOOGLE_SHEETS_CREDS_JSON',
        ];
        this.CREDENTIALS_PATHS = [
            '../../../../taxi-advertisig-c30861d203c5.json',
            '../../../../../taxi-advertisig-c30861d203c5.json',
            '../../../../../../taxi-advertisig-c30861d203c5.json',
            './taxi-advertisig-c30861d203c5.json',
            '../taxi-advertisig-c30861d203c5.json',
            '../../taxi-advertisig-c30861d203c5.json',
            path.join(process.cwd(), 'taxi-advertisig-c30861d203c5.json'),
            path.join(process.cwd(), 'apps/api', 'taxi-advertisig-c30861d203c5.json'),
        ];
    }
    async onModuleInit() {
        await this.connectToGoogleSheets();
    }
    async connectToGoogleSheets() {
        try {
            const { GoogleSpreadsheet } = await import('google-spreadsheet');
            let creds = this.loadCredentialsFromEnv();
            if (!creds) {
                creds = this.loadCredentialsFromFileSystem();
            }
            if (!creds) {
                this.isConnected = false;
                return;
            }
            const serviceAccountAuth = new google_auth_library_1.JWT({
                email: creds.client_email,
                key: creds.private_key,
                scopes: ['https://www.googleapis.com/auth/spreadsheets'],
            });
            this.doc = new GoogleSpreadsheet(this.SHEET_ID, serviceAccountAuth);
            await this.doc.loadInfo();
            this.isConnected = true;
            this.logger.log(`🔗 TAD-SRE: Google Sheet "${this.doc.title}" conectado exitosamente.`);
        }
        catch (error) {
            this.isConnected = false;
            this.logger.log(`📊 MODO MOCK: Google Sheets no disponible: ${error.message}`);
        }
    }
    normalizePrivateKey(value) {
        return value.replace(/\\n/g, '\n');
    }
    isValidServiceAccount(value) {
        return Boolean(value &&
            typeof value === 'object' &&
            typeof value.client_email === 'string' &&
            typeof value.private_key === 'string');
    }
    parseCredentials(rawValue, source) {
        const candidates = [rawValue];
        if (!rawValue.trim().startsWith('{')) {
            candidates.push(Buffer.from(rawValue, 'base64').toString('utf8'));
        }
        for (const candidate of candidates) {
            try {
                const parsed = JSON.parse(candidate);
                if (this.isValidServiceAccount(parsed)) {
                    parsed.private_key = this.normalizePrivateKey(parsed.private_key);
                    this.logger.log(`🔐 TAD-SRE: Credenciales cargadas desde ${source}.`);
                    return parsed;
                }
            }
            catch {
            }
        }
        return null;
    }
    loadCredentialsFromEnv() {
        for (const envKey of this.CREDENTIALS_ENV_KEYS) {
            const rawValue = process.env[envKey]?.trim();
            if (!rawValue)
                continue;
            const parsed = this.parseCredentials(rawValue, `env:${envKey}`);
            if (parsed)
                return parsed;
            this.logger.error(`🚨 Error parseando credenciales en ${envKey}. Formato esperado: JSON o Base64 válido.`);
        }
        return null;
    }
    loadCredentialsFromFileSystem() {
        const envCredentialPath = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
        const candidatePaths = [
            ...(envCredentialPath ? [envCredentialPath] : []),
            ...this.CREDENTIALS_PATHS,
        ];
        const resolvedPaths = Array.from(new Set(candidatePaths.map((candidate) => path.isAbsolute(candidate) ? candidate : path.resolve(__dirname, candidate))));
        for (const absolutePath of resolvedPaths) {
            if (!fs.existsSync(absolutePath))
                continue;
            try {
                const fileContent = fs.readFileSync(absolutePath, 'utf8');
                const parsed = this.parseCredentials(fileContent, `file:${absolutePath}`);
                if (parsed)
                    return parsed;
            }
            catch (error) {
                this.logger.error(`🚨 Error leyendo credenciales desde ${absolutePath}: ${error.message}`);
            }
        }
        this.logger.warn(`⚠️ No se encontró credencial de Google Sheets por env (${this.CREDENTIALS_ENV_KEYS.join(', ')}) ni en archivos candidateados.`);
        return null;
    }
    async syncAllTables() {
        if (!this.isConnected)
            await this.connectToGoogleSheets();
        if (!this.isConnected)
            return { success: false, error: 'Google Sheets Connection Failed' };
        try {
            await this.syncConductores();
            await this.syncPantallas();
            await this.syncAnunciantes();
            await this.syncMarcas();
            await this.syncPagos();
            await this.syncIngresos();
            await this.syncSuscripciones();
            await this.syncConciliacion();
            await this.syncEstadoResultados();
            await this.syncCuentasPorCobrar();
            this.logger.log('✅ TAD-SRE: Sincronización masiva completada (Registro Contable Completo).');
            return { success: true, timestamp: new Date().toISOString() };
        }
        catch (e) {
            this.logger.error(`❌ TAD-SRE: Error en sincronización: ${e.message}`);
            return { success: false, error: e.message };
        }
    }
    async syncConductores() {
        const sheet = this.doc.sheetsByTitle['Conductores '];
        if (!sheet)
            return;
        const drivers = await this.prisma.driver.findMany();
        await sheet.clearRows();
        await sheet.addRows(drivers.map(d => ({
            ID_CHOFER: d.id,
            NOMBRE_COMPLETO: d.fullName,
            TELEFONO: d.phone,
            PLACA: d.licensePlate || 'N/A',
            LICENCIA: d.cedula || 'N/A',
            ESTATUS: d.status,
            SUSCRIPCION_PAGA: d.subscriptionPaid ? 'SI' : 'NO'
        })));
    }
    async syncPantallas() {
        const sheet = this.doc.sheetsByTitle['Pantallas'];
        if (!sheet)
            return;
        const devices = await this.prisma.device.findMany();
        await sheet.clearRows();
        await sheet.addRows(devices.map(d => ({
            DEVICE_ID: d.deviceId,
            PLACA_ASIGNADA: d.taxiNumber || 'SIN ASIGNAR',
            ESTATUS: d.status,
            ULTIMA_SEÑAL: d.lastSync?.toISOString() || 'N/A',
            BATERIA: d.batteryLevel || 0,
            STORAGE_FREE: d.storageFree || 'N/A',
            APP_VERSION: d.appVersion || 'Unknown'
        })));
    }
    async syncAnunciantes() {
        const sheet = this.doc.sheetsByTitle['Anunciantes'];
        if (!sheet)
            return;
        const advertisers = await this.prisma.advertiser.findMany();
        await sheet.clearRows();
        await sheet.addRows(advertisers.map(a => ({
            ID_ANUNCIANTE: a.id,
            NOMBRE: a.companyName,
            RNC: 'N/A',
            TELEFONO: a.phone || 'N/A',
            NIVEL_ACCESO: 'STANDARD',
            ESTATUS: a.status
        })));
    }
    async syncMarcas() {
        const sheet = this.doc.sheetsByTitle['Marcas'];
        if (!sheet)
            return;
        const campaigns = await this.prisma.campaign.findMany();
        await sheet.clearRows();
        await sheet.addRows(campaigns.map(c => ({
            ID_MARCA: c.id,
            NOMBRE_COMERCIAL: c.name,
            CONTACTO: c.advertiser,
            EMAIL: 'N/A',
            PRESUPUESTO_MENSUAL: c.budget,
            LIMITE_PANTALLAS: c.targetImpressions
        })));
    }
    async syncPagos() {
        const sheet = this.doc.sheetsByTitle['Pagos'];
        if (!sheet)
            return;
        const txs = await this.prisma.financialTransaction.findMany();
        await sheet.clearRows();
        await sheet.addRows(txs.map(t => ({
            ID: t.id,
            FECHA: t.createdAt.toISOString(),
            RECEPTOR: t.entityId || 'N/A',
            TIPO_RECEPTOR: t.category,
            MONTO_BRUTO: t.amount,
            NET_AMOUNT: t.netAmount,
            TAX_AMOUNT: t.taxAmount,
            REFERENCIA: t.reference || 'N/A',
            ESTATUS: t.status
        })));
    }
    async syncIngresos() {
        const sheet = this.doc.sheetsByTitle['Ingresos'];
        if (!sheet)
            return;
        const payrolls = await this.prisma.payrollPayment.findMany({ include: { driver: true } });
        await sheet.clearRows();
        await sheet.addRows(payrolls.map(p => ({
            ID_PAGO: p.id,
            CHOFER: p.driver.fullName,
            PLACA: p.driver.licensePlate || 'N/A',
            MES: p.month,
            ANUNCIOS_PLAYBACK: 0,
            ESTATUS_SISTEMA: p.status,
            TARIFA_UNITARIA: 1.25,
            INGRESO_BRUTO: p.amount,
            FEE_PLATAFORMA: 0,
            TOTAL_PAGAR: p.amount
        })));
    }
    async syncSuscripciones() {
        const sheet = this.doc.sheetsByTitle['Suscripciones'];
        if (!sheet)
            return;
        const subs = await this.prisma.subscription.findMany({ include: { driver: true } });
        await sheet.clearRows();
        await sheet.addRows(subs.map(s => ({
            ID: s.id,
            CHOFER: s.driver.fullName,
            PLAN: s.plan,
            MONTO: s.amount,
            INICIO: s.startDate.toISOString(),
            VENCIMIENTO: s.dueDate.toISOString(),
            PAGADO_EN: s.paidAt?.toISOString() || 'PENDIENTE',
            METODO_PAGO: s.paymentMethod || 'N/A',
            ESTATUS: s.status
        })));
    }
    async syncConciliacion() {
        const sheet = this.doc.sheetsByTitle['Conciliacion'];
        if (!sheet)
            return;
        const reports = await this.prisma.reconciliationReport.findMany();
        await sheet.clearRows();
        await sheet.addRows(reports.map(r => ({
            PERIODO: r.period,
            ID_CHOFER: r.driverId,
            SUSCRIPCION_ESTATUS: r.subscriptionStatus,
            SUSCRIPCION_MONTO: r.subscriptionAmount,
            INGRESOS_REPRODUCCIONES: r.revenueReceived,
            PAGOS_NOMINA_DEBIDO: r.payrollDue,
            PAGOS_NOMINA_PAGADOS: r.payrollPaid,
            DISCREPANCIA_TOTAL: r.discrepancyAmount,
            TIPO_DISCREPANCIA: r.discrepancyType
        })));
    }
    async syncEstadoResultados() {
        const sheet = this.doc.sheetsByTitle['Estado_Resultados'];
        if (!sheet)
            return;
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const ingresosAds = await this.prisma.financialTransaction.aggregate({
            where: { category: 'CAMPAIGN', type: 'INCOME', status: 'COMPLETED', createdAt: { gte: startOfMonth } },
            _sum: { amount: true, taxAmount: true }
        });
        const ingresosSubs = await this.prisma.subscription.aggregate({
            where: { status: 'PAID', paidAt: { gte: startOfMonth } },
            _sum: { amount: true }
        });
        const costoNomina = await this.prisma.payrollPayment.aggregate({
            where: { status: 'PAID', paidAt: { gte: startOfMonth } },
            _sum: { amount: true }
        });
        const devicesActivos = await this.prisma.device.count({ where: { status: business_rules_1.BUSINESS_RULES.STATUS.DEVICE.ACTIVE } });
        const COSTO_HARDWARE_UNITARIO = 1500;
        const costoHardware = devicesActivos * COSTO_HARDWARE_UNITARIO;
        const totalIngresos = (ingresosAds._sum.amount || 0) + (ingresosSubs._sum.amount || 0);
        const totalCogs = (costoNomina._sum.amount || 0) + costoHardware;
        const taxes = ingresosAds._sum.taxAmount || 0;
        await sheet.clearRows();
        await sheet.addRow({
            MES_AÑO: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
            INGRESOS_ADS: ingresosAds._sum.amount || 0,
            INGRESOS_SUBS: ingresosSubs._sum.amount || 0,
            TOTAL_INGRESOS: totalIngresos,
            COSTO_NOMINA: costoNomina._sum.amount || 0,
            COSTO_HARDWARE: costoHardware,
            GROSS_MARGIN: totalIngresos - totalCogs,
            IMPUESTOS_DGII: taxes,
            NET_PROFIT: totalIngresos - totalCogs - taxes
        });
    }
    async syncCuentasPorCobrar() {
        const sheet = this.doc.sheetsByTitle['Cuentas_Por_Cobrar'];
        if (!sheet)
            return;
        const subsVencidas = await this.prisma.subscription.findMany({
            where: { status: { in: ['PENDING', 'OVERDUE'] } },
            include: { driver: true }
        });
        await sheet.clearRows();
        await sheet.addRows(subsVencidas.map(s => {
            const diasAtraso = Math.floor((new Date().getTime() - s.dueDate.getTime()) / (1000 * 3600 * 24));
            return {
                ID_CLIENTE: s.driver.id,
                TIPO_DEUDOR: 'CONDUCTOR',
                MONTO_ADEUDADO: s.amount,
                DIAS_ATRASO: diasAtraso,
                ESTADO_RIESGO: diasAtraso > 60 ? 'DEFAULT' : diasAtraso > 30 ? 'WARNING' : 'NORMAL'
            };
        }));
    }
    async getSecondaryDBData() {
        if (!this.isConnected)
            return null;
        try {
            const sheet = this.doc.sheetsByTitle['Ingresos'];
            const rows = await sheet.getRows();
            return rows.map(r => r.toObject());
        }
        catch (e) {
            return null;
        }
    }
};
exports.SheetsService = SheetsService;
exports.SheetsService = SheetsService = SheetsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SheetsService);
//# sourceMappingURL=sheets.service.js.map