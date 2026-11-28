import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Res,
  HttpStatus,
  Logger,
  UseInterceptors,
  InternalServerErrorException,
} from "@nestjs/common";
import { FinanceService } from "./finance.service";
import { InvoiceService } from "./invoice.service";
import { WhatsAppService } from "../notifications/whatsapp.service";
import { EmailService } from "../notifications/email.service";
import { PrismaService } from "../prisma/prisma.service";
import { AdvertiserBillingService } from "../advertisers/advertiser-billing.service";
import type { Response } from "express";
import { Roles, UserRole } from "../auth/decorators/roles.decorator";

import { IdempotencyInterceptor } from "../../common/interceptors/idempotency.interceptor";

const mediaSafeSelect = {
  id: true,
  name: true,
  filename: true,
  originalFilename: true,
  mimeType: true,
  durationSeconds: true,
  width: true,
  height: true,
  storageKey: true,
  url: true,
  cdnUrl: true,
  hash: true,
  hashMd5: true,
  hashSha256: true,
  campaign_id: true,
  status: true,
  createdAt: true,
  qrUrl: true,
};

@Controller("finance")
@Roles(UserRole.ADMIN)
export class FinanceController {
  private readonly logger = new Logger(FinanceController.name);

  constructor(
    private readonly financeService: FinanceService,
    private readonly invoiceService: InvoiceService,
    private readonly whatsappService: WhatsAppService,
    private readonly emailService: EmailService,
    private readonly prisma: PrismaService,
    private readonly advertiserBillingService: AdvertiserBillingService,
  ) {}

  /**
   * PDF: Certificado de Exhibición (Proof of Play) para Anunciantes.
   */
  @Get("report/campaign/:id/pdf")
  async downloadCampaignPdf(@Param("id") id: string, @Res() res: Response) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id },
      include: { media: { select: mediaSafeSelect } },
    });
    if (!campaign) return res.status(404).send("Campaña no encontrada");

    const impressions = await this.prisma.playbackEvent.count({
      where: {
        videoId: { in: campaign.media.map((m) => m.id) },
        eventType: "play_confirm",
        verified: true,
      },
    });

    const pdf = await this.invoiceService.generateCampaignProofOfPlayPDF(
      campaign,
      {
        totalImpressions: impressions,
        assignedTaxis: campaign.media.length, // Using actual media length or we could fetch devices length, keeping it realistic without mock multiplier
      },
    );

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=POP_${campaign.name}.pdf`,
      "Content-Length": pdf.length,
    });
    res.end(pdf);
  }

  /**
   * PDF: Reporte de Inventario Técnico de Flota.
   */
  @Get("report/fleet/pdf")
  async downloadFleetPdf(@Res() res: Response) {
    const devices = await this.prisma.device.findMany();
    const pdf = await this.invoiceService.generateFleetStatusPDF(devices);

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": "attachment; filename=TAD_Inventario_Flota.pdf",
      "Content-Length": pdf.length,
    });
    res.end(pdf);
  }

  /**
   * PDF: Recibo de Transacción.
   */
  @Get("transaction/:id/pdf")
  async downloadTransactionPdf(@Param("id") id: string, @Res() res: Response) {
    const tx = await this.prisma.financialTransaction.findUnique({
      where: { id },
    });
    if (!tx) return res.status(404).send("Transacción no encontrada");

    const pdf = await this.invoiceService.generateTransactionReceiptPDF(tx);
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=Recibo_${tx.id.substring(0, 8)}.pdf`,
      "Content-Length": pdf.length,
    });
    res.end(pdf);
  }

  /**
   * Calculates the payroll for all drivers for a specific month/year.
   */
  @Get("payroll")
  async getPayroll(
    @Query("month") month?: string,
    @Query("year") year?: string,
  ) {
    try {
      const m = month ? parseInt(month) : new Date().getMonth() + 1;
      const y = year ? parseInt(year) : new Date().getFullYear();
      const results = await this.financeService.calculateMonthlyPayroll(m, y);
      return results;
    } catch (error) {
      // M5: responder con 5xx real (antes devolvía HTTP 200 con {error}),
      // para que el cliente no confunda un fallo con un resultado vacío.
      console.error(
        "CRITICAL_FINANCE_ERROR: getPayroll failed",
        (error as Error)?.stack,
      );
      throw new InternalServerErrorException({
        code: "PAYROLL_CALC_FAILED",
        message: "Error al calcular la nómina",
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Processes a payment for a specific driver.
   */
  @Post("payroll/pay")
  @UseInterceptors(IdempotencyInterceptor)
  async processPayment(
    @Body()
    data: {
      driverId: string;
      month: number;
      year: number;
      reference: string;
    },
  ) {
    return this.financeService.processPayment(
      data.driverId,
      data.month || new Date().getMonth() + 1,
      data.year || new Date().getFullYear(),
      data.reference,
    );
  }

  @Post("payroll/whatsapp-confirm")
  async sendWhatsAppPaymentConfirm(
    @Body()
    body: {
      phone: string;
      driverName: string;
      amount: number;
      month: string;
    },
  ) {
    return this.whatsappService.sendDriverPaymentConfirm(
      body.phone,
      body.driverName,
      body.amount,
      body.month,
    );
  }

  /**
   * Triggers the bulk generation of monthly payroll for ALL drivers.
   */
  @Post("payroll/trigger")
  @UseInterceptors(IdempotencyInterceptor)
  async triggerMonthlyBilling(@Body() data: { month?: number; year?: number }) {
    const m = data.month || new Date().getMonth() + 1;
    const y = data.year || new Date().getFullYear();
    return this.financeService.triggerMonthlyBilling(m, y);
  }

  /**
   * Generates a billing report for advertisers based on impressions.
   */
  @Get("report/campaigns")
  async getCampaignBilling() {
    return this.financeService.getCampaignBillingReport();
  }

  /**
   * Generates a professional HTML invoice for a campaign.
   */
  @Get("invoice/:campaignId")
  async getInvoice(
    @Param("campaignId") campaignId: string,
    @Res() res: Response,
  ) {
    const html = await this.financeService.generateInvoiceHtml(campaignId);
    if (!html) {
      return res
        .status(HttpStatus.NOT_FOUND)
        .json({ message: "Campaign not found" });
    }
    res.set("Content-Type", "text/html");
    res.status(HttpStatus.OK).send(html);
  }

  @Get("export/payroll.csv")
  async exportPayroll(
    @Query("month") month: string,
    @Query("year") year: string,
    @Res() res: Response,
  ) {
    const m = month ? parseInt(month) : new Date().getMonth() + 1;
    const y = year ? parseInt(year) : new Date().getFullYear();
    const csv = await this.financeService.exportPayrollCsv(m, y);
    res.set("Content-Type", "text/csv");
    res.set(
      "Content-Disposition",
      `attachment; filename=payroll-${m}-${y}.csv`,
    );
    res.status(HttpStatus.OK).send(csv);
  }

  @Get("export/campaigns.csv")
  async exportCampaigns(@Res() res: Response) {
    const csv = await this.financeService.exportCampaignsCsv();
    res.set("Content-Type", "text/csv");
    res.set(
      "Content-Disposition",
      "attachment; filename=campaigns-billing.csv",
    );
    res.status(HttpStatus.OK).send(csv);
  }

  @Get("export/campaign/:id.csv")
  async exportSingleCampaign(@Param("id") id: string, @Res() res: Response) {
    const csv = await this.financeService.exportCampaignCsv(id);
    res.set("Content-Type", "text/csv");
    res.set("Content-Disposition", `attachment; filename=campaign-${id}.csv`);
    res.status(HttpStatus.OK).send(csv);
  }

  /**
   * Exportación Contable DGII (v12.4.1) — Formatos 606/607/608.
   * GET /finance/export/dgii/606?year=2026
   * GET /finance/export/dgii/607?year=2026
   * GET /finance/export/dgii/608?year=2026
   */
  @Get("export/dgii/:format.csv")
  async exportDgii(
    @Param("format") format: string,
    @Query("year") year: string,
    @Res() res: Response,
  ) {
    if (!["606", "607", "608"].includes(format)) {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .json({ message: "Formato DGII inválido. Use 606, 607 o 608." });
    }
    const y = year ? parseInt(year) : new Date().getFullYear();
    let csv = "";
    const filename = `dgii-${format}-${y}.csv`;
    if (format === "606") {
      csv = await this.financeService.exportDgii606(y);
    } else if (format === "607") {
      csv = await this.financeService.exportDgii607(y);
    } else {
      csv = await this.financeService.exportDgii608(y);
    }
    res.set("Content-Type", "text/csv; charset=utf-8");
    res.set("Content-Disposition", `attachment; filename=${filename}`);
    res.status(HttpStatus.OK).send(csv);
  }
  /**
   * FINANCIAL INTELLIGENCE: Registers a new financial transaction (Income/Expense).
   */
  @Post("transactions")
  @UseInterceptors(IdempotencyInterceptor)
  async recordTransaction(
    @Body()
    data: {
      type: string;
      category: string;
      amount: number;
      entityId?: string;
      reference?: string;
      note?: string;
      status?: string;
      currency?: string;
    },
  ) {
    return this.financeService.recordTransaction(data);
  }

  /**
   * FINANCIAL INTELLIGENCE: Returns MRR, Burn Rate and net projections.
   */
  @Get("summary")
  async getSummary() {
    return this.financeService.getFinancialSummary();
  }

  /**
   * FINANCIAL INTELLIGENCE: Returns investor metrics (Unit Economics).
   */
  @Get("investor-metrics")
  async getInvestorMetrics() {
    return this.financeService.getInvestorMetrics();
  }

  /**
   * FINANCIAL INTELLIGENCE: Returns the general ledger (last 50 transactions).
   */
  @Get("ledger")
  async getLedger() {
    return this.financeService.getLedger();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // EMAIL ENDPOINTS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Envía el Certificado de Exhibición (Proof of Play) de una campaña por email.
   * POST /finance/report/campaign/:id/email
   * Body: { email: string; advertiserName?: string }
   */
  @Post("report/campaign/:id/email")
  async emailCampaignReport(
    @Param("id") id: string,
    @Body()
    body: { email: string; advertiserName?: string; reportUrl?: string },
  ) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id },
      include: { media: { select: mediaSafeSelect } },
    });
    if (!campaign) return { success: false, message: "Campaña no encontrada" };

    const impressions = await this.prisma.playbackEvent.count({
      where: {
        videoId: { in: campaign.media.map((m) => m.id) },
        eventType: "play_confirm",
        verified: true,
      },
    });

    const pdf = await this.invoiceService.generateCampaignProofOfPlayPDF(
      campaign,
      {
        totalImpressions: impressions,
        assignedTaxis: campaign.media.length,
      },
    );

    const result = await this.emailService.sendCampaignReport(
      body.email,
      body.advertiserName || campaign.advertiser,
      campaign.name,
      pdf,
      body.reportUrl,
    );

    return {
      ...result,
      message: result.success
        ? "Reporte enviado correctamente"
        : "Error al enviar el reporte",
    };
  }

  /**
   * Envía la factura HTML + PDF de una campaña por email.
   * POST /finance/invoice/:campaignId/email
   * Body: { email: string; amount?: number }
   */
  @Post("invoice/:campaignId/email")
  async emailInvoice(
    @Param("campaignId") campaignId: string,
    @Body() body: { email: string; amount?: number },
  ) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { media: { select: mediaSafeSelect } },
    });
    if (!campaign) return { success: false, message: "Campaña no encontrada" };

    const invoiceId = `INV-${campaignId.slice(0, 8).toUpperCase()}`;
    const baseAmount = body.amount || 3000;

    // Generate proof-of-play PDF to attach
    const impressions = await this.prisma.playbackEvent.count({
      where: {
        videoId: { in: campaign.media.map((m) => m.id) },
        eventType: "play_confirm",
        verified: true,
      },
    });
    const pdf = await this.invoiceService.generateCampaignProofOfPlayPDF(
      campaign,
      {
        totalImpressions: impressions,
        assignedTaxis: campaign.media.length || 1,
      },
    );

    const result = await this.emailService.sendInvoice(
      body.email,
      campaign.advertiser,
      campaign.name,
      invoiceId,
      baseAmount,
      pdf,
    );

    return {
      ...result,
      message: result.success
        ? "Factura enviada correctamente"
        : "Error al enviar la factura",
    };
  }

  /**
   * Envía la confirmación de pago a un conductor por email.
   * POST /finance/payroll/email-confirm
   * Body: { email: string; driverName: string; amount: number; month: string; driverId?: string }
   */
  @Post("payroll/email-confirm")
  async emailDriverPaymentConfirm(
    @Body()
    body: {
      email: string;
      driverName: string;
      amount: number;
      month: string;
      driverId?: string;
    },
  ) {
    let pdfBuffer: Buffer | undefined;

    // Generate driver settlement PDF if driverId provided
    if (body.driverId) {
      try {
        const driver = await this.prisma.driver.findUnique({
          where: { id: body.driverId },
        });
        if (driver) {
          pdfBuffer = await this.invoiceService.generateDriverSettlementPDF({
            chofer: driver.fullName,
            placa: driver.licensePlate || "N/A",
            ingreso: body.amount.toString(),
            anuncios: "Revisar Detalle",
          });
        }
      } catch (e) {
        // PDF generation is optional; proceed without it
      }
    }

    const result = await this.emailService.sendDriverPaymentConfirmation(
      body.email,
      body.driverName,
      body.amount,
      body.month,
      pdfBuffer,
    );

    return {
      ...result,
      message: result.success
        ? "Email enviado al conductor"
        : "Error al enviar el email",
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ADVERTISER SUBSCRIPTION INVOICE ENDPOINTS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Envía la factura de suscripción de un anunciante por email.
   * POST /finance/advertiser/:advertiserId/invoice/:invoiceId/email
   * Body: { email: string }
   */
  @Post("advertiser/:advertiserId/invoice/:invoiceId/email")
  async emailAdvertiserInvoice(
    @Param("advertiserId") advertiserId: string,
    @Param("invoiceId") invoiceId: string,
    @Body() body: { email: string },
  ) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId, advertiserId },
      include: { advertiser: true },
    });
    if (!invoice) return { success: false, message: "Factura no encontrada" };

    const pdf = await this.invoiceService.generateTransactionReceiptPDF({
      ...invoice,
      amount: invoice.totalAmount,
      category: `Suscripción Mensual - ${invoice.advertiser.companyName}`,
      reference: invoice.id,
    });

    const result = await this.emailService.sendEmail({
      to: body.email,
      subject: `Factura Suscripción TAD DOOH - ${invoice.id.slice(0, 12).toUpperCase()} - RD$ ${invoice.totalAmount.toLocaleString()}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; border-radius: 12px 12px 0 0;">
            <h1 style="color: #FFD400; margin: 0; font-size: 28px;">TAD DOOH NETWORK</h1>
            <p style="color: #888; margin: 10px 0 0;">Factura de Suscripción Mensual</p>
          </div>
          <div style="background: #fafafa; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #eee;">
            <p style="font-size: 16px; color: #333;">Estimado/a <strong>${invoice.advertiser.contactName}</strong>,</p>
            <p style="color: #555;">Adjuntamos la factura correspondiente a su suscripción mensual.</p>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <tr style="background: #FFF9C4;">
                <td style="padding: 12px; border: 1px solid #ddd;"><strong>TOTAL A PAGAR</strong></td>
                <td style="padding: 12px; border: 1px solid #ddd; text-align: right;"><strong style="font-size: 18px; color: #E65100;">RD$ ${invoice.totalAmount.toLocaleString()}</strong></td>
              </tr>
            </table>
            <p style="color: #666; font-size: 14px;">
              <strong>Fecha de emisión:</strong> ${new Date(invoice.issueDate).toLocaleDateString()}<br>
              <strong>Fecha de vencimiento:</strong> ${new Date(invoice.dueDate).toLocaleDateString()}<br>
              <strong>N° Factura:</strong> ${invoice.id.slice(0, 12).toUpperCase()}
            </p>
            <p style="color: #888; font-size: 12px; margin-top: 30px;">El PDF adjunto tiene validez fiscal. Para consultas: facturacion@tad.do</p>
          </div>
        </div>
      `,
      attachments: [
        {
          filename: `Factura_Suscripcion_${invoice.id.slice(0, 8).toUpperCase()}.pdf`,
          content: pdf,
          contentType: "application/pdf",
        },
      ],
    });

    return {
      ...result,
      message: result.success
        ? "Factura de suscripción enviada correctamente"
        : "Error al enviar la factura",
    };
  }

  /**
   * Dispara facturación manual de una suscripción específica (admin).
   * POST /finance/advertiser/subscription/:subscriptionId/bill
   */
  @Post("advertiser/subscription/:subscriptionId/bill")
  async billSubscriptionNow(@Param("subscriptionId") subscriptionId: string) {
    try {
      const result =
        await this.advertiserBillingService.billSubscriptionNow(subscriptionId);
      return result;
    } catch (err) {
      this.logger.error(
        `Error al facturar suscripción ${subscriptionId}`,
        (err as Error)?.stack || err,
      );
      throw new InternalServerErrorException(
        `Error al facturar suscripción ${subscriptionId}`,
      );
    }
  }

  /**
   * Proforma Anunciantes (v12.4.1): genera una factura PROFORMA (pre-billing)
   * ANTES de activar una campaña. Permite al anunciante aprobar el monto
   * estimado antes de comprometer inventario.
   * POST /finance/advertiser/proforma
   * Body: { advertiserId, numberOfScreens, monthlyRate, months?, description?, reference? }
   */
  @Post("advertiser/proforma")
  @UseInterceptors(IdempotencyInterceptor)
  async generateProforma(
    @Body()
    body: {
      advertiserId: string;
      numberOfScreens: number;
      monthlyRate: number;
      months?: number;
      description?: string;
      reference?: string;
    },
  ) {
    try {
      return await this.advertiserBillingService.generateProformaInvoice(body);
    } catch (err) {
      this.logger.error(
        "Error al generar proforma",
        (err as Error)?.stack || err,
      );
      throw new InternalServerErrorException("Error al generar proforma");
    }
  }

  /**
   * Confirma una proforma → la convierte en factura PENDING (lista para cobro).
   * POST /finance/advertiser/proforma/:invoiceId/confirm
   */
  @Post("advertiser/proforma/:invoiceId/confirm")
  @UseInterceptors(IdempotencyInterceptor)
  async confirmProforma(@Param("invoiceId") invoiceId: string) {
    try {
      return await this.advertiserBillingService.confirmProformaInvoice(
        invoiceId,
      );
    } catch (err) {
      this.logger.error(
        `Error al confirmar proforma ${invoiceId}`,
        (err as Error)?.stack || err,
      );
      throw new InternalServerErrorException(
        `Error al confirmar proforma ${invoiceId}`,
      );
    }
  }
}
