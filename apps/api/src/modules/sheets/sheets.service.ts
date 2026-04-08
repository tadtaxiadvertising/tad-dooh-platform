import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import { PrismaService } from '../prisma/prisma.service';
import * as path from 'path';

@Injectable()
export class SheetsService implements OnModuleInit {
  private readonly logger = new Logger(SheetsService.name);
  private doc: GoogleSpreadsheet;
  private isConnected = false;
  
  private readonly SHEET_ID = '1x2PQInj1F5CJnotWVNkCuGEKqULeO9Vv7qkUvmtd-LY';
  private readonly CREDENTIALS_PATHS = [
    '../../../../taxi-advertisig-c30861d203c5.json',
    '../../../../../../taxi-advertisig-c30861d203c5.json' // Parent of project root
  ];

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.connectToGoogleSheets();
  }

  private async connectToGoogleSheets() {
    try {
      let creds;
      
      // 1. Intentar cargar desde Variable de Entorno (Prioridad para EasyPanel/Docker)
      const envCreds = process.env.GOOGLE_SHEETS_CREDS_JSON;
      if (envCreds) {
          try {
              // Puede estar en Base64 o JSON plano
              creds = envCreds.startsWith('{') ? JSON.parse(envCreds) : JSON.parse(Buffer.from(envCreds, 'base64').toString());
              this.logger.log('🔐 TAD-SRE: Credenciales cargadas desde Environment Variable.');
          } catch (e) {
              this.logger.error('🚨 Error parseando GOOGLE_SHEETS_CREDS_JSON: ' + e.message);
          }
      }

      // 2. Si no hay env, intentar cargar desde archivo físico (Local fallback)
      if (!creds) {
          for (const credPath of this.CREDENTIALS_PATHS) {
              try {
                  const absolutePath = path.resolve(__dirname, credPath);
                  this.logger.log(`🔍 Intentando cargar credenciales desde: ${absolutePath} (Base: ${__dirname})`);
                  creds = require(absolutePath);
                  this.logger.log(`🔐 TAD-SRE: Credenciales cargadas desde ${absolutePath}`);
                  break;
              } catch (e) {
                  this.logger.warn(`⚠️ No se encontró archivo en: ${credPath}`);
              }
          }
      }

      if (!creds) throw new Error('No se encontraron credenciales de Google Sheets (Service Account).');

      const serviceAccountAuth = new JWT({
        email: creds.client_email,
        key: creds.private_key,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      this.doc = new GoogleSpreadsheet(this.SHEET_ID, serviceAccountAuth);
      await this.doc.loadInfo();
      
      this.isConnected = true;
      this.logger.log(`🔗 TAD-SRE: Google Sheet "${this.doc.title}" conectado exitosamente.`);
    } catch (error) {
      this.isConnected = false;
      this.logger.error(`🚨 TAD-SRE: Fallo al conectar con Google Sheets: ${error.message}`);
    }
  }

  async syncAllTables() {
    if (!this.isConnected) await this.connectToGoogleSheets();
    if (!this.isConnected) return { success: false, error: 'Google Sheets Connection Failed' };

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
    } catch (e) {
      this.logger.error(`❌ TAD-SRE: Error en sincronización: ${e.message}`);
      return { success: false, error: e.message };
    }
  }

  private async syncConductores() {
    const sheet = this.doc.sheetsByTitle['Conductores ']; // Sheet 4 (with space)
    if (!sheet) return;
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

  private async syncPantallas() {
    const sheet = this.doc.sheetsByTitle['Pantallas'];
    if (!sheet) return;
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

  private async syncAnunciantes() {
    const sheet = this.doc.sheetsByTitle['Anunciantes'];
    if (!sheet) return;
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

  private async syncMarcas() {
    const sheet = this.doc.sheetsByTitle['Marcas'];
    if (!sheet) return;
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

  private async syncPagos() {
    const sheet = this.doc.sheetsByTitle['Pagos'];
    if (!sheet) return;
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

  private async syncIngresos() {
    const sheet = this.doc.sheetsByTitle['Ingresos'];
    if (!sheet) return;
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

  private async syncSuscripciones() {
    const sheet = this.doc.sheetsByTitle['Suscripciones'];
    if (!sheet) return;
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

  private async syncConciliacion() {
    const sheet = this.doc.sheetsByTitle['Conciliacion'];
    if (!sheet) return;
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

  private async syncEstadoResultados() {
    const sheet = this.doc.sheetsByTitle['Estado_Resultados'];
    if (!sheet) return;
    
    // Aggregation Logic for P&L
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // 1. Ingresos
    const ingresosAds = await this.prisma.financialTransaction.aggregate({
      where: { category: 'CAMPAIGN', type: 'INCOME', status: 'COMPLETED', createdAt: { gte: startOfMonth } },
      _sum: { amount: true, taxAmount: true }
    });
    
    const ingresosSubs = await this.prisma.subscription.aggregate({
      where: { status: 'PAID', paidAt: { gte: startOfMonth } },
      _sum: { amount: true }
    });

    // 2. Costos de Ventas (COGS)
    const costoNomina = await this.prisma.payrollPayment.aggregate({
      where: { status: 'PAID', paidAt: { gte: startOfMonth } },
      _sum: { amount: true }
    });

    const devicesActivos = await this.prisma.device.count({ where: { status: 'ACTIVE' } });
    const COSTO_HARDWARE_UNITARIO = 1500; // Depreciacion Fija por Tablet
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

  private async syncCuentasPorCobrar() {
    const sheet = this.doc.sheetsByTitle['Cuentas_Por_Cobrar'];
    if (!sheet) return;

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
    if (!this.isConnected) return null;
    try {
      const sheet = this.doc.sheetsByTitle['Ingresos'];
      const rows = await sheet.getRows();
      return rows.map(r => r.toObject());
    } catch (e) {
      return null;
    }
  }
}
