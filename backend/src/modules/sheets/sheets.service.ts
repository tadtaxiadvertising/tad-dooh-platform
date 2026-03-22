import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SheetsService implements OnModuleInit {
  private readonly logger = new Logger(SheetsService.name);
  private doc: GoogleSpreadsheet;
  private isConnected = false;
  
  private readonly SHEET_ID = '1x2PQInj1F5CJnotWVNkCuGEKqULeO9Vv7qkUvmtd-LY';
  private readonly CREDENTIALS_PATH = '../../../../taxi-advertisig-c30861d203c5.json';

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.connectToGoogleSheets();
  }

  private async connectToGoogleSheets() {
    try {
      const creds = require(this.CREDENTIALS_PATH);
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
      
      this.logger.log('✅ TAD-SRE: Sincronización masiva completada.');
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
    const txs = await (this.prisma as any).financialTransaction.findMany();
    await sheet.clearRows();
    await sheet.addRows(txs.map(t => ({
      ID: t.id,
      FECHA: t.createdAt.toISOString(),
      RECEPTOR: t.entityId || 'N/A',
      TIPO_RECEPTOR: t.category,
      MONTO: t.amount,
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
