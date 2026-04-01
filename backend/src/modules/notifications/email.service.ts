import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    this.initTransporter();
  }

  private initTransporter() {
    // Supports SendGrid, Gmail, or any SMTP provider via .env
    // For SendGrid: SMTP_HOST=smtp.sendgrid.net, SMTP_PORT=587, SMTP_USER=apikey, SMTP_PASS=<sendgrid-api-key>
    // For Gmail: SMTP_HOST=smtp.gmail.com, SMTP_PORT=587, SMTP_USER=<gmail>, SMTP_PASS=<app-password>
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = parseInt(process.env.SMTP_PORT || '587');
    const user = process.env.SMTP_USER || '';
    const pass = process.env.SMTP_PASSWORD || '';

    if (!pass) {
      this.logger.warn('⚠️  SMTP_PASSWORD no configurado. Los emails operarán en modo MOCK (solo logs).');
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }

  /**
   * Envía un email genérico con soporte para adjuntos PDF.
   */
  async sendEmail(options: {
    to: string;
    subject: string;
    html: string;
    attachments?: Array<{
      filename: string;
      content: Buffer;
      contentType: string;
    }>;
  }): Promise<{ success: boolean; messageId?: string }> {
    const from = process.env.SMTP_FROM || 'TAD Advertising <no-reply@tad.do>';

    this.logger.log(`📧 EMAIL_OUTGOING → ${options.to} | Asunto: ${options.subject}`);

    // MOCK mode: if no SMTP_PASSWORD, just log and return success
    if (!process.env.SMTP_PASSWORD) {
      this.logger.log(`📧 [MOCK] Email que se enviaría:\n  Para: ${options.to}\n  Asunto: ${options.subject}\n  Adjuntos: ${options.attachments?.length || 0}`);
      return { success: true, messageId: `mock-${Date.now()}` };
    }

    try {
      const info = await this.transporter.sendMail({
        from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        attachments: options.attachments?.map((a) => ({
          filename: a.filename,
          content: a.content,
          contentType: a.contentType,
        })),
      });

      this.logger.log(`✅ Email enviado: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (err) {
      this.logger.error(`❌ Error enviando email a ${options.to}: ${err.message}`);
      return { success: false };
    }
  }

  /**
   * Envía un reporte de campaña (PDF) a un anunciante.
   */
  async sendCampaignReport(
    to: string,
    advertiserName: string,
    campaignName: string,
    pdfBuffer: Buffer,
    reportUrl?: string,
  ): Promise<{ success: boolean }> {
    const html = this.buildCampaignReportHtml(advertiserName, campaignName, reportUrl);
    return this.sendEmail({
      to,
      subject: `📊 Reporte de Campaña: ${campaignName} — TAD DOOH`,
      html,
      attachments: [
        {
          filename: `Reporte_${campaignName.replace(/\s+/g, '_')}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    });
  }

  /**
   * Envía una factura PDF a un anunciante.
   */
  async sendInvoice(
    to: string,
    advertiserName: string,
    campaignName: string,
    invoiceId: string,
    amount: number,
    pdfBuffer: Buffer,
  ): Promise<{ success: boolean }> {
    const html = this.buildInvoiceHtml(advertiserName, campaignName, invoiceId, amount);
    return this.sendEmail({
      to,
      subject: `🧾 Factura ${invoiceId} — ${campaignName} | TAD Advertising`,
      html,
      attachments: [
        {
          filename: `Factura_${invoiceId}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    });
  }

  /**
   * Envía una confirmación de pago a un conductor.
   */
  async sendDriverPaymentConfirmation(
    to: string,
    driverName: string,
    amount: number,
    month: string,
    pdfBuffer?: Buffer,
  ): Promise<{ success: boolean }> {
    const html = this.buildDriverPaymentHtml(driverName, amount, month);
    const attachments = pdfBuffer
      ? [{ filename: `Liquidacion_${driverName}_${month}.pdf`, content: pdfBuffer, contentType: 'application/pdf' }]
      : [];

    return this.sendEmail({
      to,
      subject: `✅ Pago Procesado: RD$ ${amount.toLocaleString()} — ${month} | TAD`,
      html,
      attachments,
    });
  }

  // ─────────────────────────────────────────────────────────────────────
  // EMAIL TEMPLATES
  // ─────────────────────────────────────────────────────────────────────

  private buildCampaignReportHtml(advertiserName: string, campaignName: string, reportUrl?: string): string {
    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reporte TAD</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <!-- Header -->
          <tr>
            <td style="background:#111;border-radius:20px 20px 0 0;padding:40px;border-bottom:2px solid #FFD400;">
              <h1 style="margin:0;color:#FFD400;font-size:28px;font-weight:900;letter-spacing:-1px;text-transform:uppercase;">TADDOOH</h1>
              <p style="margin:4px 0 0;color:#555;font-size:11px;letter-spacing:4px;text-transform:uppercase;">Digital Out Of Home Advertising</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="background:#111;padding:40px;">
              <p style="color:#888;font-size:11px;text-transform:uppercase;letter-spacing:3px;margin:0 0 12px;">Reporte de Campaña</p>
              <h2 style="color:#fff;font-size:22px;font-weight:900;margin:0 0 20px;text-transform:uppercase;">${campaignName}</h2>
              <p style="color:#aaa;font-size:14px;line-height:1.6;margin:0 0 24px;">
                Estimado/a <strong style="color:#fff;">${advertiserName}</strong>,<br><br>
                Adjunto encontrará el reporte actualizado de rendimiento de su campaña en la red TAD DOOH de taxis de Santo Domingo.<br><br>
                Los datos reflejan impactos verificados por telemetría GPS en tiempo real.
              </p>
              ${reportUrl ? `
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:12px;background:#FFD400;">
                    <a href="${reportUrl}" style="display:inline-block;padding:14px 32px;color:#000;font-weight:900;font-size:12px;text-decoration:none;text-transform:uppercase;letter-spacing:2px;">
                      Ver Reporte Online →
                    </a>
                  </td>
                </tr>
              </table>
              ` : ''}
            </td>
          </tr>
          <!-- Stats row -->
          <tr>
            <td style="background:#161616;padding:24px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width:33%;text-align:center;border-right:1px solid #222;">
                    <p style="color:#FFD400;font-size:20px;font-weight:900;margin:0;">GPS</p>
                    <p style="color:#555;font-size:10px;text-transform:uppercase;letter-spacing:2px;margin:4px 0 0;">Verificado</p>
                  </td>
                  <td style="width:33%;text-align:center;border-right:1px solid #222;">
                    <p style="color:#FFD400;font-size:20px;font-weight:900;margin:0;">24/7</p>
                    <p style="color:#555;font-size:10px;text-transform:uppercase;letter-spacing:2px;margin:4px 0 0;">Monitoreo</p>
                  </td>
                  <td style="width:33%;text-align:center;">
                    <p style="color:#FFD400;font-size:20px;font-weight:900;margin:0;">RD</p>
                    <p style="color:#555;font-size:10px;text-transform:uppercase;letter-spacing:2px;margin:4px 0 0;">Santo Domingo</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#0d0d0d;border-radius:0 0 20px 20px;padding:24px 40px;border-top:1px solid #1a1a1a;">
              <p style="color:#444;font-size:11px;margin:0;line-height:1.6;">
                © ${new Date().getFullYear()} TAD Advertising SRL · Calle Central #45, Ensanche Naco, Santo Domingo, RD<br>
                Este correo es generado automáticamente. Por favor no responda a este email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  private buildInvoiceHtml(
    advertiserName: string,
    campaignName: string,
    invoiceId: string,
    amount: number,
  ): string {
    const itbis = amount * 0.18;
    const total = amount + itbis;
    const formattedDate = new Date().toLocaleDateString('es-DO', { day: '2-digit', month: 'long', year: 'numeric' });

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Factura TAD</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:#000;padding:40px;border-bottom:4px solid #FFD400;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <h1 style="margin:0;color:#FFD400;font-size:26px;font-weight:900;text-transform:uppercase;">TADDOOH</h1>
                    <p style="margin:2px 0 0;color:#555;font-size:10px;letter-spacing:3px;text-transform:uppercase;">Comprobante Fiscal</p>
                  </td>
                  <td style="text-align:right;">
                    <p style="margin:0;color:#fff;font-size:14px;font-weight:700;">${invoiceId}</p>
                    <p style="margin:4px 0 0;color:#666;font-size:11px;">${formattedDate}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Client info -->
          <tr>
            <td style="padding:32px 40px 0;">
              <p style="color:#999;font-size:10px;text-transform:uppercase;letter-spacing:2px;margin:0 0 6px;">Receptor</p>
              <p style="color:#000;font-size:18px;font-weight:900;margin:0;">${advertiserName}</p>
              <p style="color:#666;font-size:12px;margin:4px 0 0;">Campaña: <strong>${campaignName}</strong></p>
            </td>
          </tr>
          <!-- Invoice table -->
          <tr>
            <td style="padding:24px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                <tr style="background:#f9f9f9;">
                  <th style="text-align:left;padding:12px;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#888;border-bottom:1px solid #eee;">Concepto</th>
                  <th style="text-align:right;padding:12px;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#888;border-bottom:1px solid #eee;">Monto</th>
                </tr>
                <tr>
                  <td style="padding:16px 12px;font-size:14px;color:#333;border-bottom:1px solid #f0f0f0;">Servicio Publicitario DOOH — ${campaignName}</td>
                  <td style="padding:16px 12px;text-align:right;font-size:14px;font-weight:700;color:#333;border-bottom:1px solid #f0f0f0;">RD$ ${amount.toLocaleString()}</td>
                </tr>
                <tr>
                  <td style="padding:12px;font-size:12px;color:#999;">ITBIS (18%)</td>
                  <td style="padding:12px;text-align:right;font-size:12px;color:#999;">RD$ ${itbis.toLocaleString()}</td>
                </tr>
                <tr style="background:#000;">
                  <td style="padding:16px 12px;font-size:14px;font-weight:900;color:#FFD400;text-transform:uppercase;letter-spacing:1px;">TOTAL DOP</td>
                  <td style="padding:16px 12px;text-align:right;font-size:20px;font-weight:900;color:#FFD400;">RD$ ${total.toLocaleString()}</td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Payment info -->
          <tr>
            <td style="padding:0 40px 24px;">
              <div style="background:#f9f9f9;border-radius:10px;padding:20px;">
                <p style="color:#999;font-size:10px;text-transform:uppercase;letter-spacing:2px;margin:0 0 8px;">Datos de Pago</p>
                <p style="color:#333;font-size:12px;font-weight:700;margin:0;">Banco Popular Dominicano</p>
                <p style="color:#666;font-size:12px;margin:4px 0;">Cuenta Corriente: 802-XXXXXXX</p>
                <p style="color:#666;font-size:12px;margin:0;">Beneficiario: TAD Advertising SRL</p>
              </div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f0f0f0;padding:20px 40px;border-top:1px solid #e0e0e0;">
              <p style="color:#999;font-size:10px;margin:0;line-height:1.6;">
                © ${new Date().getFullYear()} TAD Advertising SRL · Este documento es un comprobante fiscal generado automáticamente por el sistema TAD Intelligence.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  private buildDriverPaymentHtml(driverName: string, amount: number, month: string): string {
    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Pago Procesado TAD</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#111;border-radius:20px;overflow:hidden;">
          <tr>
            <td style="background:#111;padding:40px;border-bottom:2px solid #22c55e;">
              <h1 style="margin:0;color:#22c55e;font-size:24px;font-weight:900;">✅ PAGO PROCESADO</h1>
              <p style="margin:4px 0 0;color:#555;font-size:11px;letter-spacing:3px;text-transform:uppercase;">TAD Advertising SRL</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <p style="color:#aaa;font-size:14px;line-height:1.7;margin:0 0 24px;">
                Hola <strong style="color:#fff;">${driverName}</strong>,<br><br>
                Tu liquidación publicitaria del período <strong style="color:#FFD400;">${month}</strong> ha sido procesada exitosamente.
              </p>
              <div style="background:#1a1a1a;border-radius:14px;padding:24px;text-align:center;margin-bottom:24px;">
                <p style="color:#888;font-size:11px;text-transform:uppercase;letter-spacing:3px;margin:0 0 8px;">Monto Liquidado</p>
                <p style="color:#FFD400;font-size:42px;font-weight:900;margin:0;">RD$ ${amount.toLocaleString()}</p>
              </div>
              <p style="color:#555;font-size:12px;line-height:1.6;margin:0;">
                Recuerda mantener tu tablet encendida y conectada para maximizar tus ingresos diarios.<br>
                El PDF adjunto contiene el detalle completo de tu liquidación.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#0d0d0d;padding:20px 40px;border-top:1px solid #1a1a1a;">
              <p style="color:#333;font-size:11px;margin:0;">© ${new Date().getFullYear()} TAD Advertising SRL · Santo Domingo, RD</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }
}
