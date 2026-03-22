import { Controller, Post, Get, Res, Param, Logger } from '@nestjs/common';
import { SheetsService } from './sheets.service';
import { InvoiceService } from '../finance/invoice.service';
import { Response } from 'express';

@Controller('sheets')
export class SheetsController {
  private readonly logger = new Logger(SheetsController.name);

  constructor(
    private readonly sheetsService: SheetsService,
    private readonly invoiceService: InvoiceService
  ) {}

  /**
   * TAD-SRE: Disparador manual de sincronización masiva a la DB secundaria.
   */
  @Post('sync')
  async syncAll() {
    return this.sheetsService.syncAllTables();
  }

  /**
   * TAD-SRE: Fallback Report - Obtiene los datos del Dashboard directo desde Google Sheets.
   */
  @Get('report')
  async getReport() {
    const data = await this.sheetsService.getSecondaryDBData();
    if (!data) return { error: 'Service Unavailable or Sheet Empty' };
    return data;
  }

  /**
   * TAD-SRE: Genera y descarga el PDF técnico de liquidación basado en la telemetría.
   */
  @Get('invoice/:driverId')
  async downloadInvoice(@Param('driverId') driverId: string, @Res() res: Response) {
      this.logger.log(`Solicitud de factura PDF para: ${driverId}`);
      
      try {
        // Obtenemos datos del "Secondary Storage" (Sheets) para validar resiliencia
        const data = await this.sheetsService.getSecondaryDBData() as any[];
        
        // Buscamos al chofer por ID o Nombre (búsqueda flexible en Sheets)
        let row = data?.find(r => 
          r.ID_CHOFER === driverId || 
          (r.CHOFER && r.CHOFER.toLowerCase().includes(driverId.toLowerCase()))
        );

        // Fallback si no está en sheets directo (simulando datos base)
        if (!row) {
            row = { 
                chofer: driverId, 
                placa: 'REVISIÓN PENDIENTE', 
                ingreso: "0.00",
                estatus: 'OFFLINE_REPORT'
            };
        }
        
        const pdfBuffer = await this.invoiceService.generateDriverSettlementPDF(row);
        
        res.set({
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename=TAD_Factura_${driverId}.pdf`,
          'Content-Length': pdfBuffer.length,
        });

        res.end(pdfBuffer);
      } catch (e) {
        this.logger.error(`Error generando PDF: ${e.message}`);
        res.status(500).send({ error: 'Fallo al generar el PDF de facturación' });
      }
  }
}
