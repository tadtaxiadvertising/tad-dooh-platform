import { Injectable, Logger } from '@nestjs/common';
import { TDocumentDefinitions } from 'pdfmake/interfaces';
const PdfPrinter = require('pdfmake');

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);
  private printer: any;

  constructor() {
    // Fonts configuration para PDFMake (usaremos fuentes estándar del SO o embebidas)
    const fonts = {
      Helvetica: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique'
      }
    };
    this.printer = new PdfPrinter(fonts);
  }

  /**
   * Genera el Factura/Liquidación SRE Oficial para Anunciantes o Choferes.
   * Utiliza la BD secundaria temporal (Sheet) o Prisma si está viva.
   */
  async generateDriverSettlementPDF(driverData: any): Promise<Buffer> {
    
    // Logotipo o Diseño TAD
    const docDefinition: TDocumentDefinitions = {
      defaultStyle: { font: 'Helvetica' },
      content: [
        {
          columns: [
            {
              text: 'TAD DOOH NETWORK',
              color: '#d4af37', // TAD YELLOW
              fontSize: 24,
              bold: true,
            },
            {
              text: `Factura N°: TAD-${Math.floor(Math.random() * 100000)}\nFecha: ${new Date().toLocaleDateString()}`,
              alignment: 'right',
              fontSize: 10,
              color: '#666'
            }
          ]
        },
        { canvas: [{ type: 'line', x1: 0, y1: 5, x2: 515, y2: 5, lineWidth: 1 }] },
        { text: '\n' },
        { text: 'LIQUIDACIÓN DE SERVICIO PUBLICITARIO (GPS TRACKING)', style: 'header' },
        { text: '\nDATOS DEL VEHÍCULO Y CHOFER:', style: 'subheader' },
        {
          table: {
            widths: ['*', '*'],
            body: [
              [{ text: 'Chofer (Socio)', bold: true }, driverData.chofer || driverData.nombre || 'No Registrado'],
              [{ text: 'Placa / Unidad', bold: true }, driverData.placa || driverData.vehiculo || 'No Registrada'],
              [{ text: 'Estatus del Gateway', bold: true }, driverData.estatus || 'Activo']
            ]
          },
          layout: 'lightHorizontalLines'
        },
        { text: '\n\nREPORTE DE IMPACTOS', style: 'subheader' },
        { text: 'Auditoría basada en conectividad de la última semana de operación (Offline/Online Analytics).' },
        { text: '\n' },
        {
          table: {
            headerRows: 1,
            widths: ['*', 'auto', 'auto', 'auto'],
            body: [
              [{ text: 'Concepto Pago', bold: true, fillColor: '#eeeeee' }, { text: 'Impactos', bold: true, fillColor: '#eeeeee' }, { text: 'Tarifa (RD$)', bold: true, fillColor: '#eeeeee' }, { text: 'Total', bold: true, fillColor: '#eeeeee' }],
              ['Anuncios Transitados (Aprobados PWA)', driverData.anuncios || '0', '1.25', `RD$ ${(parseFloat(driverData.ingreso || '0')).toFixed(2)}`],
              ['Penalización (Offline)', '0', '0.00', '0.00'],
              ['Suscripción Plataforma TAD', '1', '-6,000.00 (Anual)', '0.00'], // Assuming paid
              [{ text: 'TOTAL A PAGAR', bold: true, colSpan: 3, alignment: 'right' }, {}, {}, { text: `RD$ ${(parseFloat(driverData.ingreso || '0')).toFixed(2)}`, bold: true }]
            ]
          }
        },
        { text: '\n\nESTADO DE LA RED SRE:', style: 'subheader', color: 'gray' },
        { text: 'Todos los datos provienen de la Telemetría de FullyKiosk procesada por Google Cloud & NestJS. Esta es una factura de carácter informativo sujeta a revisión final de facturación.', fontSize: 8, color: 'gray' }
      ],
      styles: {
        header: { fontSize: 14, bold: true, alignment: 'center', margin: [0, 10, 0, 10] },
        subheader: { fontSize: 12, bold: true, margin: [0, 5, 0, 5] },
      }
    };

    return new Promise((resolve, reject) => {
      try {
        const pdfDoc = this.printer.createPdfKitDocument(docDefinition);
        let chunks: any[] = [];
        
        pdfDoc.on('data', (chunk) => { chunks.push(chunk); });
        pdfDoc.on('end', () => {
          const result = Buffer.concat(chunks);
          this.logger.log(`TAD-SRE: Liquidación PDF generada para chofer ${driverData.chofer}`);
          resolve(result);
        });
        pdfDoc.end();
      } catch (e) {
        this.logger.error('Error al generar PDF de Factura:', e);
        reject(e);
      }
    });
  }
}
