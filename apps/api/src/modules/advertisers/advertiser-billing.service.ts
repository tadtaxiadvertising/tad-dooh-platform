import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { InvoiceService } from "../finance/invoice.service";
import { EmailService } from "../notifications/email.service";
import { SupabaseService } from "../supabase/supabase.service";
import { BUSINESS_RULES } from "../../common/constants/business-rules";
import { format } from "date-fns";
import type { AdvertiserSubscription, Invoice, Prisma } from "@prisma/client";

const billingAdvertiserSelect = {
  companyName: true,
  contactName: true,
  email: true,
} as const satisfies Prisma.AdvertiserSelect;

type BillingAdvertiser = Prisma.AdvertiserGetPayload<{
  select: typeof billingAdvertiserSelect;
}>;

@Injectable()
export class AdvertiserBillingService {
  private readonly logger = new Logger(AdvertiserBillingService.name);

  /** Bucket de Storage para facturas — única fuente de PDFs fiscales. */
  private readonly INVOICES_BUCKET = "invoices";

  constructor(
    private readonly prisma: PrismaService,
    private readonly invoiceService: InvoiceService,
    private readonly emailService: EmailService,
    private readonly supabaseService: SupabaseService,
  ) {}

  /**
   * Billing CRON: Runs on the 1st of each month to bill all ACTIVE advertiser subscriptions.
   * Creates Invoice records and sends PDF via email.
   */
  async runMonthlySubscriptionBilling() {
    this.logger.log(
      "🏁 CRON: Iniciando facturación mensual de suscripciones de anunciantes",
    );

    const now = new Date();
    const subscriptions = await this.prisma.advertiserSubscription.findMany({
      where: {
        status: "ACTIVE",
        nextBillingDate: { lte: now },
      },
      include: { advertiser: { select: billingAdvertiserSelect } },
    });

    this.logger.log(
      `📋 Encontradas ${subscriptions.length} suscripciones para facturar`,
    );

    let processed = 0;
    let failed = 0;

    for (const sub of subscriptions) {
      try {
        await this.processSubscriptionBilling(sub);
        processed++;
      } catch (err) {
        failed++;
        this.logger.error(
          `❌ Error facturando suscripción ${sub.id} (advertiser: ${sub.advertiserId}): ${err.message}`,
          err.stack,
        );

        // Log to system_errors for alerting
        await this.prisma.systemError.create({
          data: {
            source: "ADVERTISER_BILLING",
            message: `Failed to bill subscription ${sub.id}: ${err.message}`,
            details: err.stack,
            entityId: sub.id,
            severity: "ERROR",
          },
        });
      }
    }

    this.logger.log(
      `✅ CRON completado: ${processed} procesadas, ${failed} fallidas`,
    );
    return { processed, failed };
  }

  /**
   * Process billing for a single subscription:
   * 1. Calculate amount (screens × monthlyRate + ITBIS 18%)
   * 2. Create Invoice record
   * 3. Generate PDF
   * 4. Send email to advertiser
   * 5. Update nextBillingDate (+1 month)
   */
  async processSubscriptionBilling(
    sub: Prisma.AdvertiserSubscriptionGetPayload<{
      include: { advertiser: { select: typeof billingAdvertiserSelect } };
    }>,
  ) {
    const advertiser = sub.advertiser;

    // 1. Calculate amounts
    const subtotal = sub.numberOfScreens * sub.monthlyRate;
    const taxAmount = subtotal * sub.taxRate; // 18% ITBIS
    const totalAmount = subtotal + taxAmount;

    const issueDate = new Date();
    const dueDate = new Date(issueDate);
    dueDate.setDate(dueDate.getDate() + 30); // Net 30 days

    const invoiceNumber = `INV-${sub.advertiserId.slice(0, 8).toUpperCase()}-${format(issueDate, "yyyyMMdd")}`;

    // 2. Create Invoice record
    const invoice = await this.prisma.invoice.create({
      data: {
        advertiserId: sub.advertiserId,
        issueDate,
        dueDate,
        subtotal,
        taxAmount,
        totalAmount,
        status: "PENDING",
      },
    });

    this.logger.log(
      `📄 Factura creada: ${invoice.id} - RD$ ${totalAmount.toLocaleString()} para ${advertiser.companyName}`,
    );

    // 3. Generate PDF (Proof of Play + Invoice combined)
    const pdf = await this.generateSubscriptionInvoicePDF({
      invoice,
      subscription: sub,
      advertiser,
      subtotal,
      taxAmount,
      totalAmount,
    });

    // 4. Subida del PDF a Supabase Storage + guardar URL pública en Invoice.
    //    Antes se guardaba un base64 truncado (data:...base64,xxx...) como pdfUrl,
    //    lo que producía URLs inválidas/inaccesibles — AMBIGÜEDAD financiera.
    //    Ahora la factura queda en Storage con URL estable y descargable.
    let pdfUrl: string | null = null;
    try {
      const storagePath = `invoices/${invoice.id}-${format(issueDate, "yyyyMMdd")}.pdf`;
      const uploaded = await this.supabaseService.uploadBuffer({
        bucket: this.INVOICES_BUCKET,
        path: storagePath,
        data: pdf,
        contentType: "application/pdf",
      });
      pdfUrl = uploaded.publicUrl;
      this.logger.log(
        `📄 Factura PDF subida a Storage: ${uploaded.publicUrl} (${uploaded.size} bytes)`,
      );
    } catch (err) {
      // El email con el PDF adjunto sigue funcionando; solo fallamos el registro de URL.
      this.logger.error(
        `❌ No se pudo subir PDF a Storage para factura ${invoice.id}: ${err.message}`,
      );
      await this.prisma.systemError.create({
        data: {
          source: "BILLING",
          message: `Failed to upload invoice PDF ${invoice.id}: ${err.message}`,
          details: err.stack,
          entityId: invoice.id,
          severity: "WARNING",
        },
      });
    }

    // Guardamos la URL real si hubo subida; en otro caso dejamos null (mejor
    // que un base64 truncado) y solo email con adjunto.
    const data: Prisma.InvoiceUpdateInput = {};
    if (pdfUrl) data.pdfUrl = pdfUrl;
    await this.prisma.invoice.update({
      where: { id: invoice.id },
      data,
    });

    // 5. Send email with PDF attachment
    await this.emailService.sendEmail({
      to: advertiser.email,
      subject: `Factura Suscripción TAD DOOH - ${invoiceNumber} - RD$ ${totalAmount.toLocaleString()}`,
      html: this.buildSubscriptionEmailHtml(
        advertiser,
        invoice,
        subtotal,
        taxAmount,
        totalAmount,
      ),
      attachments: [
        {
          filename: `Factura_${invoiceNumber}.pdf`,
          content: pdf,
          contentType: "application/pdf",
        },
      ],
    });

    // 6. Update nextBillingDate (+1 month)
    const nextBilling = new Date(sub.nextBillingDate);
    nextBilling.setMonth(nextBilling.getMonth() + 1);
    // Handle month-end edge case (e.g., Jan 31 + 1 month = Feb 28/29)
    if (nextBilling.getDate() !== sub.nextBillingDate.getDate()) {
      nextBilling.setDate(0); // Last day of previous month
    }

    await this.prisma.advertiserSubscription.update({
      where: { id: sub.id },
      data: { nextBillingDate: nextBilling },
    });

    this.logger.log(
      `✅ Suscripción ${sub.id} facturada. Próximo cobro: ${format(nextBilling, "yyyy-MM-dd")}`,
    );
  }

  /**
   * Generate professional subscription invoice PDF
   */
  private async generateSubscriptionInvoicePDF(data: {
    invoice: Invoice;
    subscription: AdvertiserSubscription;
    advertiser: BillingAdvertiser & { rnc?: string };
    subtotal: number;
    taxAmount: number;
    totalAmount: number;
  }): Promise<Buffer> {
    const {
      invoice,
      subscription,
      advertiser,
      subtotal,
      taxAmount,
      totalAmount,
    } = data;

    const docDefinition = {
      defaultStyle: { font: "Helvetica" },
      content: [
        {
          columns: [
            {
              text: "TAD DOOH NETWORK",
              color: "#FFD400",
              fontSize: 24,
              bold: true,
            },
            {
              text: `Factura N°: ${invoice.id.slice(0, 12).toUpperCase()}\nFecha Emisión: ${format(invoice.issueDate, "dd/MM/yyyy")}\nFecha Vencimiento: ${format(invoice.dueDate, "dd/MM/yyyy")}`,
              alignment: "right",
              fontSize: 10,
              color: "#666",
            },
          ],
        },
        {
          canvas: [
            { type: "line", x1: 0, y1: 5, x2: 515, y2: 5, lineWidth: 1 },
          ],
        },
        { text: "\n" },
        { text: "FACTURA DE SUSCRIPCIÓN MENSUAL", style: "header" },
        { text: "\nDATOS DEL ANUNCIANTE:", style: "subheader" },
        {
          table: {
            widths: ["*", "*"],
            body: [
              [{ text: "Empresa", bold: true }, advertiser.companyName],
              [{ text: "Contacto", bold: true }, advertiser.contactName],
              [{ text: "Email", bold: true }, advertiser.email],
              [
                { text: "RNC/Cédula", bold: true },
                advertiser.rnc || "No proporcionado",
              ],
              [
                { text: "Suscripción", bold: true },
                `${subscription.numberOfScreens} pantalla(s) @ RD$ ${subscription.monthlyRate.toLocaleString()}/mes`,
              ],
            ],
            layout: "lightHorizontalLines",
          },
        },
        { text: "\n\nDETALLE DE FACTURACIÓN:", style: "subheader" },
        {
          table: {
            headerRows: 1,
            widths: ["*", "auto", "auto", "auto"],
            body: [
              [
                { text: "Concepto", bold: true, fillColor: "#f2f2f2" },
                { text: "Cantidad", bold: true, fillColor: "#f2f2f2" },
                { text: "Precio Unit.", bold: true, fillColor: "#f2f2f2" },
                { text: "Total", bold: true, fillColor: "#f2f2f2" },
              ],
              [
                "Suscripción Mensual TAD DOOH (Pantallas Digitales)",
                subscription.numberOfScreens.toString(),
                `RD$ ${subscription.monthlyRate.toLocaleString()}`,
                `RD$ ${subtotal.toLocaleString()}`,
              ],
              [
                {
                  text: "Subtotal",
                  colSpan: 3,
                  alignment: "right",
                  bold: true,
                },
                {},
                {},
                { text: `RD$ ${subtotal.toLocaleString()}`, bold: true },
              ],
              [
                {
                  text: `ITBIS (${(subscription.taxRate * 100).toFixed(0)}%)`,
                  colSpan: 3,
                  alignment: "right",
                  bold: true,
                },
                {},
                {},
                {
                  text: `RD$ ${taxAmount.toLocaleString()}`,
                  bold: true,
                  color: "#E65100",
                },
              ],
              [
                {
                  text: "TOTAL A PAGAR",
                  colSpan: 3,
                  alignment: "right",
                  bold: true,
                  fillColor: "#FFF9C4",
                },
                {},
                {},
                {
                  text: `RD$ ${totalAmount.toLocaleString()}`,
                  bold: true,
                  fillColor: "#FFF9C4",
                  fontSize: 14,
                },
              ],
            ],
          },
        },
        { text: "\n\nCONDICIONES DE PAGO:", style: "subheader" },
        { text: "• Pago neto a 30 días desde fecha de emisión", fontSize: 10 },
        {
          text: "• Transferencia: Banco Popular Dominicano - Cuenta Corriente 802-XXXXXXX",
          fontSize: 10,
        },
        { text: "• Referencia obligatoria: Número de factura", fontSize: 10 },
        {
          text: "• Factura sujeta a retención de ITBIS según normativa DGII",
          fontSize: 10,
        },
        { text: "\n\nNOTA TÉCNICA:", style: "subheader" },
        {
          text: "Esta factura corresponde a la suscripción mensual de pantallas digitales en la red TAD DOOH. El servicio incluye exhibición de contenido publicitario, telemetría GPS, reportes de impacto y certificado de exhibición mensual.",
          fontSize: 9,
          color: "gray",
        },
      ],
      styles: {
        header: {
          fontSize: 14,
          bold: true,
          alignment: "center",
          margin: [0, 10, 0, 10],
        },
        subheader: { fontSize: 12, bold: true, margin: [0, 5, 0, 5] },
      },
    };

    const pdfmake = require("pdfmake");
    const fonts = {
      Helvetica: {
        normal: "Helvetica",
        bold: "Helvetica-Bold",
        italics: "Helvetica-Oblique",
        bolditalics: "Helvetica-BoldOblique",
      },
    };
    pdfmake.setFonts(fonts);

    const pdfDoc = pdfmake.createPdf(docDefinition);
    return await pdfDoc.getBuffer();
  }

  private buildSubscriptionEmailHtml(
    advertiser: BillingAdvertiser,
    invoice: Invoice,
    subtotal: number,
    taxAmount: number,
    totalAmount: number,
  ): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; border-radius: 12px 12px 0 0;">
          <h1 style="color: #FFD400; margin: 0; font-size: 28px;">TAD DOOH NETWORK</h1>
          <p style="color: #888; margin: 10px 0 0;">Factura de Suscripción Mensual</p>
        </div>
        <div style="background: #fafafa; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #eee;">
          <p style="font-size: 16px; color: #333;">Estimado/a <strong>${advertiser.contactName}</strong>,</p>
          <p style="color: #555;">Adjuntamos la factura correspondiente a su suscripción mensual de pantallas digitales en la red TAD DOOH.</p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="background: #f2f2f2;">
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Concepto</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd; text-align: right;"><strong>Monto</strong></td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;">Suscripción Mensual (${advertiser.companyName})</td>
              <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">RD$ ${subtotal.toLocaleString()}</td>
            </tr>
            <tr style="background: #f9f9f9;">
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Subtotal</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd; text-align: right;"><strong>RD$ ${subtotal.toLocaleString()}</strong></td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;">ITBIS (18%)</td>
              <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">RD$ ${taxAmount.toLocaleString()}</td>
            </tr>
            <tr style="background: #FFF9C4;">
              <td style="padding: 12px; border: 1px solid #ddd;"><strong>TOTAL A PAGAR</strong></td>
              <td style="padding: 12px; border: 1px solid #ddd; text-align: right;"><strong style="font-size: 18px; color: #E65100;">RD$ ${totalAmount.toLocaleString()}</strong></td>
            </tr>
          </table>

          <p style="color: #666; font-size: 14px;">
            <strong>Fecha de emisión:</strong> ${format(invoice.issueDate, "dd/MM/yyyy")}<br>
            <strong>Fecha de vencimiento:</strong> ${format(invoice.dueDate, "dd/MM/yyyy")}<br>
            <strong>N° Factura:</strong> ${invoice.id.slice(0, 12).toUpperCase()}
          </p>

          <p style="color: #888; font-size: 12px; margin-top: 30px;">
            El PDF adjunto tiene validez fiscal. Para consultas: facturacion@tad.do | +1 (809) XXX-XXXX
          </p>
        </div>
      </div>
    `;
  }

  /**
   * Manual trigger: Bill a specific subscription now (admin use)
   */
  async billSubscriptionNow(subscriptionId: string) {
    const sub = await this.prisma.advertiserSubscription.findUnique({
      where: { id: subscriptionId },
      include: { advertiser: { select: billingAdvertiserSelect } },
    });
    if (!sub) throw new Error("Suscripción no encontrada");
    await this.processSubscriptionBilling(sub);
    return { success: true, message: "Suscripción facturada manualmente" };
  }

  /**
   * Get all invoices for an advertiser (for portal)
   */
  async getAdvertiserInvoices(advertiserId: string) {
    return this.prisma.invoice.findMany({
      where: { advertiserId },
      orderBy: { issueDate: "desc" },
    });
  }

  /**
   * Mark invoice as PAID (manual or webhook from payment gateway)
   */
  async markInvoicePaid(invoiceId: string, paymentReference?: string) {
    return this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: "PAID",
        pdfUrl: paymentReference ? `PAID-${paymentReference}` : undefined,
      },
    });
  }

  /**
   * PROFORMA ANUNCIANTES (v12.4.1) — pre-billing antes de activar una campaña.
   *
   * Genera una factura en estado PROFORMA (sin cobro real) que estima el costo
   * de una campaña o suscripción propuesta, para que el anunciante la apruebe
   * ANTES de activar inventario. Una vez aprobada, la proforma se confirma y
   * pasa a PENDING (factura definitiva pendiente de pago) vía
   * `confirmProformaInvoice(id: invoiceId)`.
   *
   * Cálculo: numberOfScreens × monthlyRate × months (proyección). Los montos
   * se guardan sin ITBIS en subtotal y con ITBIS en taxAmount/totalAmount.
   */
  async generateProformaInvoice(data: {
    advertiserId: string;
    numberOfScreens: number;
    monthlyRate: number;
    months?: number;
    description?: string;
    reference?: string;
  }) {
    const { advertiserId, numberOfScreens, monthlyRate } = data;
    const months = data.months && data.months > 0 ? data.months : 1;

    if (!advertiserId || !numberOfScreens || numberOfScreens <= 0) {
      throw new Error(
        "Proforma inválida: advertiserId y numberOfScreens > 0 son requeridos.",
      );
    }

    const advertiser = await this.prisma.advertiser.findUnique({
      where: { id: advertiserId },
      select: { companyName: true },
    });
    if (!advertiser) throw new Error("Anunciante no encontrado");

    const subtotal = numberOfScreens * monthlyRate * months;
    const taxAmount = subtotal * BUSINESS_RULES.ITBIS_RATE;
    const totalAmount = subtotal + taxAmount;

    const issueDate = new Date();

    // Proforma no vence como factura: dueDate = issueDate + 15 días (referencial)
    const dueDate = new Date(issueDate);
    dueDate.setDate(dueDate.getDate() + 15);

    const proforma = await this.prisma.invoice.create({
      data: {
        advertiserId,
        issueDate,
        dueDate,
        subtotal,
        taxAmount,
        totalAmount,
        status: "PROFORMA",
        pdfUrl: data.reference,
      },
    });

    this.logger.log(
      `📋 Proforma generada para ${advertiser.companyName}: ${proforma.id} — RD$ ${totalAmount.toLocaleString()} (${numberOfScreens} pantallas × ${months} mes/es)`,
    );

    return {
      ...proforma,
      months,
      numberOfScreens,
      description:
        data.description ||
        `Proforma suscripción: ${numberOfScreens} pantalla(s) × RD$ ${monthlyRate}/mes`,
    };
  }

  /**
   * Confirma una PROFORMA → la transforma en factura PENDING (lista para cobro).
   * Es el paso posterior a la aprobación del anunciante. Idempotente.
   */
  async confirmProformaInvoice(invoiceId: string) {
    const inv = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
    });
    if (!inv) throw new Error("Proforma no encontrada");

    if (inv.status !== "PROFORMA") {
      return {
        success: true,
        idempotent: true,
        status: inv.status,
        message: `La factura ${invoiceId} ya no es PROFORMA (status=${inv.status}).`,
      };
    }

    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: "PENDING" },
    });
    this.logger.log(
      `✅ Proforma ${invoiceId} confirmada → PENDING (lista para cobro)`,
    );
    return { success: true, idempotent: false, status: "PENDING" };
  }
}
