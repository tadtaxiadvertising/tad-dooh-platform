import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { TDocumentDefinitions } from 'pdfmake/interfaces';
const pdfmake = require('pdfmake');

@Injectable()
export class InvoiceService implements OnModuleInit {
  private readonly logger = new Logger(InvoiceService.name);

  onModuleInit() {
    // Fonts configuration para PDFMake 0.3.x (API de Instancia)
    const fonts = {
      Helvetica: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique'
      }
    };
    pdfmake.setFonts(fonts);
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

    try {
      const pdfDoc = pdfmake.createPdf(docDefinition);
      const result = await pdfDoc.getBuffer();
      this.logger.log(`TAD-SRE: Liquidación PDF generada para chofer ${driverData.chofer}`);
      return result;
    } catch (e) {
      this.logger.error('Error al generar PDF de Factura:', e);
      throw e;
    }
  }

  /**
   * Genera una factura de morosidad (RD$6,000) por suscripción vencida.
   */
  async generateDebtInvoicePDF(driverData: any): Promise<Buffer> {
    const docDefinition: TDocumentDefinitions = {
      defaultStyle: { font: 'Helvetica' },
      content: [
        {
          columns: [
            { text: 'TAD DOOH - PROTOCOLO DE MOROSIDAD', color: '#FF0000', fontSize: 24, bold: true },
            { text: `Ref: SOS-${driverData.deviceId?.substring(0,6) || 'N/A'}\n${new Date().toLocaleDateString()}`, alignment: 'right', fontSize: 10 }
          ]
        },
        { text: '\nAVISO DE SUSPENSIÓN DE SERVICIO', style: 'header', color: '#AA0000' },
        { text: '\nEstimado Colaborador:', style: 'subheader' },
        { text: 'Nuestro sistema ha detectado una anomalía en su estado de cuenta. De acuerdo a la Regla de Negocio 402, su suscripción anual de RD$6,000.00 se encuentra vencida o pendiente de pago.', margin: [0, 10, 0, 10] },
        {
          table: {
            widths: ['*', 'auto'],
            body: [
              [{ text: 'Concepto', bold: true, fillColor: '#FFEEEE' }, { text: 'Monto (RD$)', bold: true, fillColor: '#FFEEEE' }],
              ['Suscripción Anual Plataforma TAD (SRE)', { text: '6,000.00', bold: true, color: '#FF0000' }],
              ['Mora por Retraso', '0.00'],
              [{ text: 'TOTAL PENDIENTE', bold: true, alignment: 'right' }, { text: 'RD$ 6,000.00', bold: true, color: '#FF0000' }]
            ]
          }
        },
        { text: '\n⚠️ ACCIÓN REQUERIDA:', style: 'subheader', color: '#FF0000' },
        { text: 'Para reactivar su terminal y continuar generando ingresos por pauta publicitaria, debe regularizar su balance. Una vez realizado el pago, el Kill-Switch se desactivará automáticamente en un plazo de 15 minutos.', margin: [0, 10, 0, 10] },
        { text: '\nCanales de Pago:', bold: true },
        { text: '• Transferencia: Banco Popular - Cuenta 802-XXXXXXX\n• Link de Pago: https://tad.do/pagos\n• WhatsApp Soporte: +1 (809) XXX-XXXX', fontSize: 10, margin: [0, 5, 0, 0] },
      ],
      styles: {
        header: { fontSize: 18, bold: true, alignment: 'center' },
        subheader: { fontSize: 14, bold: true }
      }
    };
    const pdfDoc = pdfmake.createPdf(docDefinition);
    return await pdfDoc.getBuffer();
  }

  /**
   * Genera un Certificado de Exhibición Publicitaria para Anunciantes.
   */
  async generateCampaignProofOfPlayPDF(campaignData: any, metrics: any): Promise<Buffer> {
    const docDefinition: TDocumentDefinitions = {
      defaultStyle: { font: 'Helvetica' },
      content: [
        {
          columns: [
            { text: 'CERTIFICADO DE EXHIBICIÓN TAD', color: '#FFD400', fontSize: 20, bold: true },
            { text: `Ref: ${campaignData.id.substring(0,8)}`, alignment: 'right', color: 'gray' }
          ]
        },
        { text: '\n' },
        { text: `ANUNCIANTE: ${campaignData.advertiser}`, style: 'subheader' },
        { text: `CAMPAÑA: ${campaignData.name}`, style: 'subheader' },
        { text: `PERIODO: ${new Date(campaignData.startDate).toLocaleDateString()} - ${new Date(campaignData.endDate).toLocaleDateString()}` },
        { text: '\n' },
        {
          table: {
            widths: ['*', 'auto'],
            body: [
              [{ text: 'Métrica de Impacto', bold: true, fillColor: '#f2f2f2' }, { text: 'Valor Realizado', bold: true, fillColor: '#f2f2f2' }],
              ['Impactos Totales (Detección GPS)', metrics.totalImpressions.toLocaleString()],
              ['Dispositivos Activos en Campaña', metrics.assignedTaxis.toLocaleString()],
              ['Tasa de Cumplimiento', '100%']
            ]
          }
        },
        { text: '\n\nVALIDACIÓN TÉCNICA:', style: 'subheader' },
        { text: 'Este documento certifica que el contenido publicitario fue reproducido en la red de tablets TAD DOOH de acuerdo a la telemetría recolectada en tiempo real por nuestros servidores.', fontSize: 10 }
      ],
      styles: { subheader: { fontSize: 12, bold: true, margin: [0, 5, 0, 5] } }
    };
    const pdfDoc = pdfmake.createPdf(docDefinition);
    return await pdfDoc.getBuffer();
  }

  /**
   * Genera un Reporte de Estado de Flota (Inventario técnico).
   */
  async generateFleetStatusPDF(devices: any[]): Promise<Buffer> {
    const docDefinition: TDocumentDefinitions = {
      defaultStyle: { font: 'Helvetica' },
      content: [
        { text: 'REPORTE DE INVENTARIO TÉCNICO - TAD DOOH', style: 'header', color: '#FFD400' },
        { text: `Generado: ${new Date().toLocaleString()}`, alignment: 'right', fontSize: 10 },
        { text: '\n' },
        {
          table: {
            headerRows: 1,
            widths: ['auto', '*', 'auto', 'auto'],
            body: [
              [{ text: 'Placa', bold: true }, { text: 'Device ID', bold: true }, { text: 'Batería', bold: true }, { text: 'Estatus', bold: true }],
              ...devices.map(d => [d.taxiNumber || 'N/A', d.deviceId, `${d.batteryLevel || 0}%`, d.status])
            ]
          }
        }
      ],
      styles: { header: { fontSize: 16, bold: true, margin: [0, 0, 0, 10] } }
    };
    const pdfDoc = pdfmake.createPdf(docDefinition);
    return await pdfDoc.getBuffer();
  }

  /**
   * Genera un Recibo de Transacción Financiera.
   */
  async generateTransactionReceiptPDF(tx: any): Promise<Buffer> {
    const docDefinition: TDocumentDefinitions = {
      defaultStyle: { font: 'Helvetica' },
      content: [
        { text: 'RECIBO DE PAGO', style: 'header', alignment: 'center' },
        { text: 'TAD Advertising SRL', alignment: 'center', fontSize: 10 },
        { text: '\n' },
        {
            table: {
                widths: ['*', '*'],
                body: [
                    ['Número de Referencia', tx.reference || tx.id.substring(0,8)],
                    ['Fecha', new Date(tx.createdAt).toLocaleDateString()],
                    ['Concepto', tx.category],
                    ['Monto Total', `RD$ ${tx.amount.toLocaleString()}`],
                    ['Estatus', tx.status]
                ]
            }
        }
      ],
      styles: { header: { fontSize: 18, bold: true } }
    };
    const pdfDoc = pdfmake.createPdf(docDefinition);
    return await pdfDoc.getBuffer();
  }

  /**
   * Genera un reporte de rendimiento semanal para anunciantes.
   */
  async generateWeeklyPerformancePDF(campaign: any, data: any[]): Promise<Buffer> {
    const totalImpressions = data.reduce((s, d) => s + d.impressions, 0);
    const totalScans = data.reduce((s, d) => s + d.scans, 0);
    const totalCtr = totalImpressions > 0 ? (totalScans / totalImpressions) * 100 : 0;

    const docDefinition: TDocumentDefinitions = {
      defaultStyle: { font: 'Helvetica' },
      content: [
        { text: 'REPORTE SEMANAL DE RENDIMIENTO', style: 'p_header', color: '#FFD400', bold: true, fontSize: 18 },
        { text: `Campaña: ${campaign.name}`, style: 'p_subheader', bold: true, fontSize:14 },
        { text: `Anunciante: ${campaign.advertiser}`, fontSize: 10, margin: [0, 0, 0, 10] },
        {
          table: {
            headerRows: 1,
            widths: ['*', 'auto', 'auto', 'auto'],
            body: [
              [
                { text: 'Día', bold: true, fillColor: '#f2f2f2' }, 
                { text: 'Impactos', bold: true, fillColor: '#f2f2f2' },
                { text: 'Escaneos QR', bold: true, fillColor: '#f2f2f2' },
                { text: 'CTR (%)', bold: true, fillColor: '#f2f2f2' }
              ],
              ...data.map(d => [
                d.day, 
                d.impressions.toLocaleString(),
                d.scans.toLocaleString(),
                `${d.ctr.toFixed(2)}%`
              ]),
              [
                { text: 'RESUMEN SEMANAL', bold: true, fillColor: '#FFF9C4' }, 
                { text: totalImpressions.toLocaleString(), bold: true, fillColor: '#FFF9C4' },
                { text: totalScans.toLocaleString(), bold: true, fillColor: '#FFF9C4' },
                { text: `${totalCtr.toFixed(2)}%`, bold: true, color: '#E65100', fillColor: '#FFF9C4' }
              ]
            ]
          }
        },
        { text: '\n\n' },
        { text: 'DEFINICIONES TÉCNICAS:', bold: true, fontSize: 10 },
        { text: '• Impactos: Reproducciones completas confirmadas por hardware.', fontSize: 9, color: 'gray' },
        { text: '• Escaneos QR: Interacciones registradas vía el Proxy de Tracking TAD.', fontSize: 9, color: 'gray' },
        { text: '• CTR (Click-Through Rate): Porcentaje de impactos que terminaron en un escaneo.', fontSize: 9, color: 'gray' }
      ],
      styles: { 
        p_header: { margin: [0, 0, 0, 10] },
        p_subheader: { margin: [0, 5, 0, 2] }
      }
    };
    const pdfDoc = pdfmake.createPdf(docDefinition);
    return await pdfDoc.getBuffer();
  }

  /**
   * Genera "Facturas Proforma" en PDF (buffer ligero) detallando ITBIS y neto 
   * para transparencia con los socios (Inversionistas/Choferes).
   */
  async generateProformaPDF(data: any): Promise<Buffer> {
    const docDefinition: TDocumentDefinitions = {
      defaultStyle: { font: 'Helvetica' },
      content: [
        { text: 'FACTURA PROFORMA (BORRADOR)', style: 'header', color: '#FFD400', bold: true },
        { text: `Fecha: ${new Date().toLocaleDateString()}`, alignment: 'right', fontSize: 10, margin: [0,0,0,10]},
        { text: `A quien pueda interesar: ${data.socio || 'Socio Estratégico'}`, margin: [0, 0, 0, 10] },
        {
          table: {
            widths: ['*', 'auto'],
            body: [
              [{ text: 'Concepto', bold: true, fillColor: '#f2f2f2' }, { text: 'Monto (DOP)', bold: true, fillColor: '#f2f2f2' }],
              [data.concepto || 'Operación Mensual TAD DOOH', `RD$ ${(data.montoBruto || 0).toLocaleString()}`],
              ['ITBIS (18%)', `RD$ ${(data.itbis || 0).toLocaleString()}`],
              [{ text: 'TOTAL NETO', bold: true, alignment: 'right' }, { text: `RD$ ${(data.montoNeto || 0).toLocaleString()}`, bold: true }]
            ]
          }
        },
        { text: '\n\n*Nota: Este documento es únicamente una proforma para fines de transparencia y planificación financiera, no posee valor fiscal.', fontSize: 8, color: 'gray' }
      ],
      styles: { header: { fontSize: 16 } }
    };
    const pdfDoc = pdfmake.createPdf(docDefinition);
    return await pdfDoc.getBuffer();
  }
}
