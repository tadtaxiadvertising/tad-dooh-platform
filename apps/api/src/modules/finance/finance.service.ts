import { errorCode } from "../../utils/error.util";
import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { InvoiceService } from "./invoice.service";
import { throttledMap } from "../../utils/throttler.util";
import { WhatsAppService } from "../notifications/whatsapp.service";
import { EmailService } from "../notifications/email.service";
import { NotificationsService } from "../notifications/notifications.service";
import { Cron, CronExpression } from "@nestjs/schedule";
import { BUSINESS_RULES } from "../../common/constants/business-rules";
import * as crypto from "crypto";
import { PayrollAuditService } from "../drivers/payroll-audit.service";

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

@Injectable()
export class FinanceService {
  private readonly logger = new Logger(FinanceService.name);
  private readonly PAY_PER_AD = BUSINESS_RULES.DRIVER_RATE_PER_CAMPAIGN_RD; // RD$500 per active ad

  constructor(
    private readonly prisma: PrismaService,
    private readonly invoiceService: InvoiceService,
    private readonly whatsappService: WhatsAppService,
    private readonly emailService: EmailService,
    private readonly notificationsService: NotificationsService,
    private readonly payrollAudit: PayrollAuditService,
  ) {}

  /**
   * RECOVERY: On module init, check if the system missed any critical delinquency scans
   */
  async onModuleInit() {
    this.logger.log("🔄 [RECOVERY] Checking for missed automated tasks...");
    // Nota: checkHighDelinquency se ejecuta SOLO vía cron de las 3AM.
    // No se ejecuta en cada boot: disparaba envíos duplicados y transacciones
    // REGLA-402 repetidas al reiniciar el contenedor (A1/M23).
  }

  /**
   * Proceso de Notificación Automática por Morosidad (Regla 402)
   *
   * DEDUP (A1/M23): una sola notificación + un solo registro de ledger por
   * dispositivo y día. La referencia `REGLA-402-YYYY-MM-DD-<device>` es @unique
   * en BD; el registro en el ledger actúa como candado antes de enviar WhatsApp,
   * de modo que heartbeats concurrentes del mismo device no dupliquen envíos.
   */
  async notifyMorosidad(deviceId: string) {
    const device = await this.prisma.device.findUnique({
      where: { deviceId },
      include: { driver: true },
    });

    if (!device) return;

    const dateKey = new Date().toISOString().slice(0, 10);
    const reference = `REGLA-402-${dateKey}-${deviceId.substring(0, 8)}`;

    // 0. Dedup gate: si ya existe un registro para este device hoy, salir.
    const existingTx = await this.prisma.financialTransaction.findUnique({
      where: { reference },
    });
    if (existingTx) {
      this.logger.log(
        `⏭️ [DELINQUENCY] Device ${deviceId} ya notificado hoy (${dateKey}). Saltando duplicado.`,
      );
      return { success: false, notified: false, duplicate: true };
    }

    // 1. Registrar el intento de cobro en el Ledger ANTES de notificar
    //    (la referencia @unique impide dobles envíos concurrentes — P2002).
    const amount = BUSINESS_RULES.STARTER_KIT_ANNUAL_FEE_RD;
    const taxAmount =
      (amount / (1 + BUSINESS_RULES.ITBIS_RATE)) * BUSINESS_RULES.ITBIS_RATE;
    const netAmount = amount - taxAmount;

    try {
      await this.prisma.financialTransaction.create({
        data: {
          type: "INCOMING",
          category: "SUSCRIPCION",
          status: "PENDING",
          amount,
          taxAmount,
          netAmount,
          entityId: device.driver?.id,
          reference,
          note: `Factura de morosidad generada automáticamente por Kill-Switch.`,
        },
      });
    } catch (e: unknown) {
      if (errorCode(e) === "P2002") {
        this.logger.log(
          `⏭️ [DELINQUENCY] Device ${deviceId} ya notificado hoy (${dateKey}). Saltando duplicado concurrente.`,
        );
        return { success: false, notified: false, duplicate: true };
      }
      throw e;
    }

    // 2. Generar la Factura SOS (PDF)
    await this.invoiceService.generateDebtInvoicePDF({
      deviceId: device.deviceId,
      chofer: device.driver?.fullName || "Socio TAD",
      placa: device.taxiNumber,
    });

    // 3. Real Notifications (WhatsApp only as Driver lacks email field in current schema)
    const driverPhone = device.driver?.phone;
    const driverName = device.driver?.fullName || "Socio TAD";

    if (driverPhone) {
      await this.whatsappService.sendDelinquencyAlert(
        driverPhone,
        driverName,
        device.deviceId,
      );
      this.logger.log(
        `📱 [WHATSAPP_SENT] Alerta de Morosidad enviada a: ${driverPhone}`,
      );
    }

    return { success: true, notified: !!driverPhone };
  }

  /**
   * SCANNER CRON: Checks daily for drivers with unpaid subscriptions past due
   * and triggers the delinquency protocol.
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async checkHighDelinquency(targetDate: Date = new Date()) {
    this.logger.log(
      `🛡️ [CRON_DELINQUENCY] Iniciando escaneo de morosidad para fecha: ${targetDate.toDateString()}...`,
    );

    const delinquentDrivers = await this.prisma.driver.findMany({
      where: {
        status: BUSINESS_RULES.STATUS.DRIVER.ACTIVE,
        subscriptionPaid: false,
        subscriptionEnd: { lt: targetDate }, // Past due
      },
      include: { devices: true },
    });

    if (delinquentDrivers.length === 0) {
      this.logger.log(
        `✅ No hay morosos críticos detectados para ${targetDate.toDateString()}.`,
      );
      return;
    }

    this.logger.warn(
      `🛑 Detectados ${delinquentDrivers.length} choferes en mora crítica.`,
    );

    await throttledMap(
      delinquentDrivers,
      async (driver) => {
        for (const device of driver.devices) {
          await this.notifyMorosidad(device.deviceId).catch((err) =>
            this.logger.error(
              `Error notifying morosidad for ${device.deviceId}: ${err.message}`,
            ),
          );
        }
      },
      5,
    );
  }

  /**
   * Calculates the monthly payroll for all drivers.
   * Logic: RD$500 per each ACTIVE campaign assigned to any device of the driver.
   */
  async calculateMonthlyPayroll(month: number, year: number) {
    this.logger.log(`Calculating payroll for ${month}/${year}`);

    // 1. Get all drivers and their associated devices
    await this.prisma.campaign.findMany({
      where: { status: "ACTIVE", active: true },
    });

    const drivers = await this.prisma.driver.findMany({
      select: {
        id: true,
        fullName: true,
        phone: true,
        licensePlate: true,
        taxiNumber: true,
        subscriptionPaid: true,
        subscriptionEnd: true,
        devices: {
          select: {
            deviceId: true,
            city: true,
            taxiNumber: true,
            campaigns: {
              select: { campaign_id: true },
            },
          },
        },
        referrals: { select: { id: true } },
      },
    });

    const periodStart = new Date(year, month - 1, 1);
    const periodEnd = new Date(year, month, 0, 23, 59, 59);

    // OPTIMIZACIÓN: Pre-calcular todos los conteos de GPS y PLAYBACKS en una sola query
    this.logger.log(
      `🔍 [OPTIMIZACIÓN] Pre-calculando conteos GPS y PoP para ${drivers.length} choferes...`,
    );
    const [gpsCountsRaw, playbackEventsRaw] = await Promise.all([
      this.prisma.driverLocation.groupBy({
        by: ["driverId"],
        where: { timestamp: { gte: periodStart, lte: periodEnd } },
        _count: { _all: true },
      }),
      this.prisma.playbackEvent.findMany({
        where: {
          timestamp: { gte: periodStart, lte: periodEnd },
          eventType: "play_confirm",
          verified: true, // REVENUE SHIELD: Only count validated playback events
        },
        select: { deviceId: true, videoId: true },
        distinct: ["deviceId", "videoId"], // ANTIDOTE-OOM: deduplica en DB, evita millones de filas en RAM
      }),
    ]);

    // MAPAS para búsqueda rápida O(1)
    const gpsCountsMap = new Map(
      gpsCountsRaw.map((item) => [item.driverId, item._count._all]),
    );

    // Mapear Playbacks a Driver (PoP - Proof of Play)
    // driverId -> Set of campaignIds played
    const driverPoPMap = new Map<string, Set<string>>();

    // Necesitamos saber qué mediaId (videoId) pertenece a qué campaignId
    const mediaToCampaignRaw = await this.prisma.media.findMany({
      where: { campaign_id: { not: null } },
      select: { id: true, campaign_id: true },
    });
    const mediaToCampaignMap = new Map(
      mediaToCampaignRaw.map((m) => [m.id, m.campaign_id]),
    );

    // Mapear Device a Driver
    const deviceToDriverMap = new Map<string, string>();
    drivers.forEach((d) => {
      d.devices?.forEach((dev) => deviceToDriverMap.set(dev.deviceId, d.id));
    });

    // FASE 3 (Item 11): precargar los payroll del período en UNA query (kill N+1)
    const payrollRecords = await this.prisma.payrollPayment.findMany({
      where: { month, year },
    });
    const payrollByDriver = new Map(payrollRecords.map((p) => [p.driverId, p]));

    playbackEventsRaw.forEach((evt) => {
      const driverId = deviceToDriverMap.get(evt.deviceId);
      const campaignId = mediaToCampaignMap.get(evt.videoId);
      if (driverId && campaignId) {
        const driverPoP = driverPoPMap.get(driverId);
        if (driverPoP) {
          driverPoP.add(campaignId);
        }
      }
    });

    // REGLA PERFORMANCE: Process with throttledMap to avoid DB pool exhaustion
    const payroll = await throttledMap(
      drivers,
      async (driver) => {
        try {
          const gpsPointsCount = gpsCountsMap.get(driver.id) || 0;
          const playedCampaigns = driverPoPMap.get(driver.id) || new Set();

          // 2. PARADIGMA PoP: Solo se paga por anuncios TRANSMITIDOS (confirmados por playback)
          // El driver debe tener suscripción paga para recibir el abono
          const isSubPaid =
            driver.subscriptionPaid &&
            (!driver.subscriptionEnd ||
              new Date(driver.subscriptionEnd) >= new Date());

          const activeAdsCount = isSubPaid ? playedCampaigns.size : 0;
          const baseCommission = 0;

          // Calculate referral commissions
          const referrals = driver.referrals ? driver.referrals.length : 0;
          const driverReferralBonus =
            referrals * BUSINESS_RULES.DRIVER_REFERRAL_BONUS_RD;

          // --- FIX V12: Removed recursive blind advertiser referral payments ---
          // Los bonos de anunciantes ahora se abonan directo a la Wallet en el Referral Loop (CampaignService)
          // en tiempo real como 'OPEX_COMMISSION'. Ya no suman al sueldo base recurrente.
          const advertiserReferralBonus = 0;

          const adTransmissionIncome = activeAdsCount * this.PAY_PER_AD;
          const prePenaltyAmount =
            adTransmissionIncome +
            driverReferralBonus +
            advertiserReferralBonus;

          // Apply penalty logic based on consecutive months under goal
          const penaltyResult = await this.payrollAudit.applyPenaltyLogic(
            driver.id,
            prePenaltyAmount,
          );
          const totalAmount = penaltyResult.amount;
          const penaltyApplied = penaltyResult.penaltyApplied;
          const penaltyPercentage = penaltyApplied
            ? BUSINESS_RULES.LEVELS.BASE.penalty
            : 0;

          // Enhanced: Get the actual taxi number from the assigned devices or driver record
          const actualTaxiNumber =
            driver.devices?.[0]?.taxiNumber || driver.taxiNumber || "S/N";

          // Check if already paid (pre-cargado, sin query por driver)
          const paymentRecord = payrollByDriver.get(driver.id);

          return {
            driverId: driver.id,
            driverName: driver.fullName || "TAD DRIVER",
            driverPhone: driver.phone || "",
            taxiNumber: actualTaxiNumber,
            activeAds:
              paymentRecord?.status === "PAID"
                ? paymentRecord.activeAds
                : activeAdsCount,
            adIncome: adTransmissionIncome,
            baseCommission,
            gpsPoints:
              paymentRecord?.status === "PAID"
                ? paymentRecord.gpsPoints
                : gpsPointsCount,
            referralBonus: driverReferralBonus,
            advertiserReferralBonus,
            totalAmount:
              paymentRecord?.status === "PAID"
                ? paymentRecord.amount
                : totalAmount,
            penaltyApplied:
              paymentRecord?.status === "PAID"
                ? paymentRecord.penaltyApplied
                : penaltyApplied,
            penaltyPercentage:
              paymentRecord?.status === "PAID"
                ? paymentRecord.penaltyPercentage
                : penaltyPercentage,
            currency: "DOP",
            status: paymentRecord?.status || "PENDING",
            paidAt: paymentRecord?.paidAt,
            reference: paymentRecord?.referenceNum,
          };
        } catch (err) {
          this.logger.error(
            `CRITICAL: Failed to calculate payroll for driver ${driver.id}: ${err.message}`,
          );
          return {
            driverId: driver.id,
            driverName: driver.fullName || "ERROR",
            driverPhone: driver.phone || "",
            taxiNumber: "ERR",
            activeAds: 0,
            adIncome: 0,
            baseCommission: 0,
            gpsPoints: 0,
            referralBonus: 0,
            advertiserReferralBonus: 0,
            totalAmount: 0,
            penaltyApplied: false,
            penaltyPercentage: 0,
            currency: "DOP",
            status: "ERROR",
            error: true,
          };
        }
      },
      5,
    );

    return payroll;
  }

  /**
   * AUTOMATIC BILLING TRIGGER: Generates payroll records for all drivers for a specific month.
   */
  async triggerMonthlyBilling(month: number, year: number) {
    this.logger.log(`🚀 TRIGGER: Bulk billing generation for ${month}/${year}`);

    // Check if payroll already processed for this period to avoid duplicates
    const existing = await this.prisma.payrollPayment.findFirst({
      where: { month, year },
    });

    if (existing) {
      this.logger.warn(
        `⚠️ Payroll for ${month}/${year} already exists. Aborting bulk trigger.`,
      );
      return {
        success: false,
        message: "La nómina para este periodo ya fue generada.",
        count: 0,
      };
    }

    const payrollData = await this.calculateMonthlyPayroll(month, year);
    const recordsToCreate = payrollData
      .filter((p) => p.totalAmount > 0)
      .map((p) => ({
        driverId: p.driverId,
        month,
        year,
        amount: p.totalAmount,
        status: "PENDING",
        penaltyApplied: p.penaltyApplied || false,
        penaltyPercentage: p.penaltyPercentage || 0,
        activeAds: p.activeAds || 0,
        gpsPoints: p.gpsPoints || 0,
      }));

    if (recordsToCreate.length === 0) {
      return {
        success: true,
        message: "No se encontraron montos a liquidar para este periodo.",
        count: 0,
      };
    }

    // REGLA PERFORMANCE: Process with batch size 5 (Optimized for 512MB-1GB RAM)
    let count = 0;
    await throttledMap(
      recordsToCreate,
      async (record) => {
        await this.prisma.payrollPayment.create({
          data: record,
        });
        count++;
      },
      5,
    );

    this.logger.log(`✅ Bulk billing completed: ${count} drivers credited.`);
    return { success: true, count };
  }

  /**
   * Processes a payment for a driver and records it in the database.
   *
   * FASE 2 (Item 7): transacción atómica (upsert payroll + ledger) + referencia
   * interna `PAY-YYMM-UUID8` generada por el servidor (no controlada por el cliente).
   * El endpoint expuesto aplica IdempotencyInterceptor (Idempotency-Key).
   */
  async processPayment(
    driverId: string,
    month: number,
    year: number,
    _clientReference: string,
  ) {
    this.logger.log(
      `Processing payment for driver ${driverId} - ${month}/${year}`,
    );

    // Re-calculate to get current amount due and metrics
    const payrollData = await this.calculateMonthlyPayroll(month, year);
    const driverEntry = payrollData.find((p) => p.driverId === driverId);

    if (!driverEntry) {
      throw new Error("Driver not found for payroll calculation");
    }

    // Referencia interna generada por el servidor: PAY-<YYMM>-<uuid8>
    const reference = `PAY-${String(year).slice(2)}${String(month).padStart(2, "0")}-${crypto.randomUUID().slice(0, 8)}`;

    return this.prisma
      .$transaction(async (tx) => {
        // Guard de negocio: si el periodo ya fue liquidado, no pagar dos veces
        const existing = await tx.payrollPayment.findUnique({
          where: { driverId_month_year: { driverId, month, year } },
        });
        if (existing?.status === "PAID") {
          this.logger.warn(
            `⏭️ [PAYROLL] Periodo ${month}/${year} de ${driverId} ya fue liquidado. Evitando doble pago.`,
          );
          return existing;
        }

        // 1. Record the payroll payment (Detailed record)
        const payrollRecord = await tx.payrollPayment.upsert({
          where: {
            driverId_month_year: { driverId, month, year },
          },
          update: {
            amount: driverEntry.totalAmount,
            referenceNum: reference,
            status: "PAID",
            paidAt: new Date(),
            activeAds: driverEntry.activeAds,
            gpsPoints: driverEntry.gpsPoints,
            penaltyApplied: driverEntry.penaltyApplied || false,
            penaltyPercentage: driverEntry.penaltyPercentage || 0,
          },
          create: {
            driverId,
            month,
            year,
            amount: driverEntry.totalAmount,
            referenceNum: reference,
            status: "PAID",
            paidAt: new Date(),
            activeAds: driverEntry.activeAds,
            gpsPoints: driverEntry.gpsPoints,
            penaltyApplied: driverEntry.penaltyApplied || false,
            penaltyPercentage: driverEntry.penaltyPercentage || 0,
          },
        });

        // 2. Record in the Financial Ledger (Unified truth)
        await tx.financialTransaction.create({
          data: {
            type: "OUTGOING",
            category: "OPEX_DRIVER_PAYOUT",
            amount: driverEntry.totalAmount,
            netAmount: driverEntry.totalAmount,
            taxAmount: 0,
            entityId: driverId,
            reference,
            note: `Liquidación de ${driverEntry.activeAds} anuncios para ${driverEntry.driverName}. Periodo: ${month}/${year}.`,
            status: "COMPLETED",
          },
        });

        // 3. INCREMENT wallet balance (driver receives payment) - Upsert Wallet model
        await tx.wallet.upsert({
          where: { driverId },
          update: { availableBalance: { increment: driverEntry.totalAmount } },
          create: { driverId, availableBalance: driverEntry.totalAmount },
        });

        return payrollRecord;
      })
      .then(async (payrollRecord) => {
        // 3. Notification unificada al conductor (post-commit, fire-and-forget)
        await this.notificationsService
          .sendDriverNotification(driverId, "PAYMENT_LIQUIDATED", {
            amount: driverEntry.totalAmount,
            currency: driverEntry.currency,
            month,
            year,
            activeAds: driverEntry.activeAds,
            paidAt:
              payrollRecord.paidAt?.toISOString() || new Date().toISOString(),
          })
          .catch((err) =>
            this.logger.warn(
              `[PAYMENT_NOTIFY] No se pudo notificar a ${driverId}: ${err.message}`,
            ),
          );

        return payrollRecord;
      });
  }

  /**
   * Proof of Performance: Campaign billing report (Impressions based)
   */
  async getCampaignBillingReport() {
    this.logger.log("Generating campaign billing report");

    const campaigns = await this.prisma.campaign.findMany({
      select: {
        id: true,
        name: true,
        status: true,
        startDate: true,
        endDate: true,
        media: { select: { id: true, durationSeconds: true } },
        _count: { select: { devices: true } },
      },
    });

    // OPTIMIZACIÓN: Pre-calcular todas las impresiones en una sola query grupal
    this.logger.log("🔍 [OPTIMIZACIÓN] Pre-calculando impresiones totales...");
    const impressionCountsRaw = await this.prisma.playbackEvent.groupBy({
      by: ["videoId"],
      where: { eventType: "play_confirm", verified: true },
      _count: { _all: true },
    });

    const impressionMap = new Map(
      impressionCountsRaw.map((i) => [i.videoId, i._count._all]),
    );

    // REGLA PERFORMANCE: Process with higher concurrency (Optimized for 8GB RAM)
    const reports = campaigns.map((campaign) => {
      // 1. Obtener impresiones sumando cada media asset ligado a la campaña
      let totalImpressions = 0;
      campaign.media.forEach((m) => {
        totalImpressions += impressionMap.get(m.id) || 0;
      });

      // 2. Pricing model: RD$1,500 per 30-second block per media asset
      let monthlyRevenue = 0;
      campaign.media.forEach((media) => {
        const duration = media.durationSeconds || 30;
        const blocks = Math.ceil(duration / 30);
        monthlyRevenue +=
          blocks * BUSINESS_RULES.ADVERTISER_COST_PER_CAMPAIGN_RD;
      });

      const diffTime = Math.abs(
        campaign.endDate.getTime() - campaign.startDate.getTime(),
      );
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const diffMonths = Math.max(1, Math.round(diffDays / 30.44)); // Usando promedio orbital para mayor precisión financiera
      const totalRevenue = monthlyRevenue * diffMonths;

      return {
        campaignId: campaign.id,
        campaignName: campaign.name,
        totalImpressions,
        assignedTaxis: campaign._count.devices,
        estimatedRevenue: totalRevenue,
        status: campaign.status,
      };
    });

    return reports;
  }

  /**
   * Generates invoice HTML for a campaign
   */
  async generateInvoiceHtml(campaignId: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        advertiserRef: { select: { companyName: true, email: true } },
        media: { select: mediaSafeSelect },
      },
    });

    if (!campaign) return null;

    const impressions = await this.prisma.playbackEvent.count({
      where: {
        videoId: { in: campaign.media.map((m) => m.id) },
        eventType: "play_confirm",
        verified: true,
      },
    });

    // RD$1,500 per 30-second block per media asset
    let monthlyBase = 0;
    campaign.media.forEach((m) => {
      const dur = m.durationSeconds || 30;
      const blocks = Math.ceil(dur / 30);
      monthlyBase += blocks * BUSINESS_RULES.ADVERTISER_COST_PER_CAMPAIGN_RD;
    });

    const diffTime = Math.abs(
      campaign.endDate.getTime() - campaign.startDate.getTime(),
    );
    const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30)) || 1;

    const subtotal = monthlyBase * diffMonths;
    const taxes = subtotal * BUSINESS_RULES.ITBIS_RATE;
    const total = subtotal + taxes;

    const invoiceData = {
      invoiceNumber: `INV-${campaign.id.substring(0, 8).toUpperCase()}`,
      date: new Date().toLocaleDateString("es-DO"),
      client: campaign.advertiserRef?.companyName || campaign.advertiser,
      email: campaign.advertiserRef?.email || "N/A",
      campaign: campaign.name,
      period: `${campaign.startDate.toLocaleDateString("es-DO")} - ${campaign.endDate.toLocaleDateString("es-DO")}`,
      impressions,
      qty: diffMonths,
      unitPrice: monthlyBase,
      subtotal,
      taxes,
      total,
    };

    return this.generateInvoiceTemplate(invoiceData);
  }

  /**
   * Helper to prevent CSV injection (Formula Injection)
   */
  private sanitizeCsvField(field: string | number | null | undefined): string {
    if (field == null) return "";
    let str = String(field);
    if (/^[=+\-@\t\r]/.test(str)) {
      str = "'" + str;
    }
    str = str.replace(/"/g, '""');
    if (/[",\n\r]/.test(str)) {
      str = `"${str}"`;
    }
    return str;
  }

  /**
   * Generates a CSV export for payroll
   */
  async exportPayrollCsv(month: number, year: number) {
    const data = await this.calculateMonthlyPayroll(month, year);
    let csv =
      "ID Socio/TAD DRIVER,Nombre TAD DRIVER,Taxi,GPS Points,Referidos,Ads Activos,Ingresos Ads,Penalización (%),Monto Liquidar\n";
    data.forEach((d) => {
      const row = [
        d.driverId,
        d.driverName,
        d.taxiNumber || "N/A",
        d.gpsPoints,
        `RD$ ${d.referralBonus}`,
        d.activeAds,
        `RD$ ${d.adIncome}`,
        d.penaltyPercentage
          ? `${(d.penaltyPercentage * 100).toFixed(1)}%`
          : "0%",
        `RD$ ${d.totalAmount}`,
      ]
        .map((f) => this.sanitizeCsvField(f))
        .join(",");
      csv += `${row}\n`;
    });
    return csv;
  }

  /**
   * Generates a CSV export for a single campaign's billing & performance
   */
  async exportCampaignCsv(campaignId: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        media: { select: mediaSafeSelect },
        _count: { select: { devices: true } },
      },
    });

    if (!campaign) return "Campaña no encontrada";

    const impressions = await this.prisma.playbackEvent.count({
      where: {
        videoId: { in: campaign.media.map((m) => m.id) },
        eventType: "play_confirm",
        verified: true,
      },
    });

    let monthlyBase = 0;
    campaign.media.forEach((m) => {
      const dur = m.durationSeconds || 30;
      const blocks = Math.ceil(dur / 30);
      monthlyBase += blocks * BUSINESS_RULES.ADVERTISER_COST_PER_CAMPAIGN_RD;
    });

    const diffTime = Math.abs(
      campaign.endDate.getTime() - campaign.startDate.getTime(),
    );
    const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30)) || 1;
    const total = monthlyBase * diffMonths;

    let csv = "Detalle de Facturación - TAD DOOH\n";
    csv += `Campaña,${this.sanitizeCsvField(campaign.name)}\n`;
    csv += `Cliente,${this.sanitizeCsvField(campaign.advertiser)}\n`;
    csv += `Periodo,${this.sanitizeCsvField(campaign.startDate.toLocaleDateString())} - ${this.sanitizeCsvField(campaign.endDate.toLocaleDateString())}\n`;
    csv += `Meses,${this.sanitizeCsvField(diffMonths)}\n`;
    csv += `Impactos Totales,${this.sanitizeCsvField(impressions)}\n`;
    csv += `Monto Total,${this.sanitizeCsvField(`RD$ ${total}`)}\n\n`;

    const mediaRows = campaign.media.map((m) => {
      const dur = m.durationSeconds || 30;
      const blocks = Math.ceil(dur / 30);
      return [
        m.id,
        m.originalFilename || m.filename || "N/A",
        dur,
        blocks,
        `RD$ ${blocks * BUSINESS_RULES.ADVERTISER_COST_PER_CAMPAIGN_RD}`,
      ]
        .map((f) => this.sanitizeCsvField(f))
        .join(",");
    });
    csv += "ID Media,Nombre Media,Duración (s),Bloques 30s,Costo Mensual\n";
    mediaRows.forEach((row) => {
      csv += `${row}\n`;
    });

    return csv;
  }

  async exportCampaignsCsv() {
    const data = await this.getCampaignBillingReport();
    let csv =
      "ID Campaña,Nombre Campaña,Estado,Taxis Asignados,Impactos Reales,Ingreso Proyectado (RD$)\n";
    data.forEach((c) => {
      const row = [
        c.campaignId,
        c.campaignName,
        c.status,
        c.assignedTaxis,
        c.totalImpressions,
        c.estimatedRevenue,
      ]
        .map((f) => this.sanitizeCsvField(f))
        .join(",");
      csv += `${row}\n`;
    });
    return csv;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // EXPORTACIÓN CONTABLE DGII (v12.4.1) — Formatos 606 / 607 / 608
  // ─────────────────────────────────────────────────────────────────────────────
  // Layouts según la Dirección General de Impuestos Internos (DGII-RD).
  // NOTA DE HONESTIDAD: estos exportadores emiten los campos/esquema compatibles
  // con el formato DGII y los datos que el sistema realmente persiste. El RNC
  // del emisor (TAD) y el NCF efectivo del proveedor/cliente deben completarse
  // desde la configuración fiscal de la empresa antes de una presentación formal
  // ante la DGII; aquí se mapean desde datos existentes cuando están disponibles.

  /**
   * DGII 606 — Declaración de Compras y Gastos (reporta las compras recibidas que
   * generan ITBIS pagado). Se alimenta de FinancialTransactions de tipo gasto/compra
   * y de facturas de proveedores (categories de compra).
   */
  async exportDgii606(year: number): Promise<string> {
    const start = new Date(year, 0, 1);
    const end = new Date(year + 1, 0, 1);

    const txs = await this.prisma.financialTransaction.findMany({
      where: {
        type: { in: ["EXPENSE", "OUTGOING", "COMPRA", "GASTO"] },
        createdAt: { gte: start, lt: end },
      },
      orderBy: { createdAt: "asc" },
    });

    // Cabecera DGII 606 (fila 1: RNC emisor, periodo, formato, nro lote)
    const rncEmisor = BUSINESS_RULES.DGII_RNC_EMISOR ?? "";
    let csv = "";
    csv += `RNC Emisor,Periodo,Formato,Secuencia,Total Registros\n`;
    csv += `${this.sanitizeCsvField(rncEmisor)},${year},606,1,${txs.length}\n`;
    csv += `Registro,Comprobante,NCF,Número de Coordinación,Fecha de Emisión,RNC/Tipo ID,Proveedor,Tipo Bien/Servicio,Base Imponible,Costo,ITBIS 18%,Monto Total\n`;

    txs.forEach((tx, i) => {
      csv += `${i + 1},${this.sanitizeCsvField(tx.reference || tx.id)},,${this.sanitizeCsvField(
        tx.createdAt.toISOString().slice(0, 10),
      )},${this.sanitizeCsvField(tx.entityId || "")},${this.sanitizeCsvField(
        tx.note || tx.category,
      )},${this.sanitizeCsvField(tx.category)},${this.sanitizeCsvField(
        tx.netAmount,
      )},,${this.sanitizeCsvField(tx.taxAmount)},${this.sanitizeCsvField(
        tx.amount,
      )}\n`;
    });
    return csv;
  }

  /**
   * DGII 607 — Declaración de Ventas y Servicios (reporta las ventas facturadas,
   * incluye ITBIS cobrado). Se alimenta de Invoices (facturas a anunciantes) y de
   * FinancialTransactions de venta/ingreso.
   */
  async exportDgii607(year: number): Promise<string> {
    const start = new Date(year, 0, 1);
    const end = new Date(year + 1, 0, 1);

    // Facturas emitidas a anunciantes (fuente primaria de ventas)
    const invoices = await this.prisma.invoice.findMany({
      where: { issueDate: { gte: start, lt: end } },
      include: { advertiser: { select: { companyName: true } } },
      orderBy: { issueDate: "asc" },
    });

    // Transacciones de venta que no tienen Invoice asociada
    const salesTxs = await this.prisma.financialTransaction.findMany({
      where: {
        type: { in: ["INCOME", "INCOMING", "VENTA", "INGRESO"] },
        createdAt: { gte: start, lt: end },
      },
      orderBy: { createdAt: "asc" },
    });

    let csv = "";
    csv += `RNC Emisor,Periodo,Formato,Secuencia,Total Registros\n`;
    csv += `${this.sanitizeCsvField(BUSINESS_RULES.DGII_RNC_EMISOR ?? "")},${year},607,1,${invoices.length + salesTxs.length}\n`;
    csv += `Registro,Comprobante,NCF Tipo,Fecha de Emisión,RNC Cliente,Razón Social Cliente,Tipo Bien/Servicio,Exento No Gravado,Gravado 18%,ITBIS,Fecha Pago\n`;

    invoices.forEach((inv, i) => {
      const ncf = inv.id ? `B{$year}${inv.id.slice(0, 20).toUpperCase()}` : "";
      csv += `${i + 1},,${this.sanitizeCsvField(ncf)},${inv.issueDate
        .toISOString()
        .slice(0, 10)},${this.sanitizeCsvField(
        inv.advertiserId,
      )},${this.sanitizeCsvField(inv.advertiser.companyName)},0,${this.sanitizeCsvField(
        inv.subtotal,
      )},${this.sanitizeCsvField(inv.taxAmount)},${this.sanitizeCsvField(
        inv.totalAmount ?? inv.subtotal + (inv.taxAmount || 0),
      )}\n`;
    });

    salesTxs.forEach((tx, i) => {
      csv += `${invoices.length + i + 1},,${this.sanitizeCsvField(
        tx.reference || "",
      )},${tx.createdAt.toISOString().slice(0, 10)},${this.sanitizeCsvField(
        tx.entityId || "",
      )},${this.sanitizeCsvField(tx.note || tx.category)},${this.sanitizeCsvField(
        tx.category,
      )},0,${this.sanitizeCsvField(tx.netAmount)},${this.sanitizeCsvField(
        tx.taxAmount,
      )},${this.sanitizeCsvField(tx.amount)}\n`;
    });
    return csv;
  }

  /**
   * DGII 608 — Declaración de Retenciones y Pagos de Nómina (reporta las retenciones
   * de honorarios/sueldos a terceros). Se alimenta de PayrollPayments (pagos a
   * conductores) con su monto e ITBIS retenido.
   */
  async exportDgii608(year: number): Promise<string> {
    const records = await this.prisma.payrollPayment.findMany({
      where: { year },
      include: { driver: true },
      orderBy: { createdAt: "asc" },
    });

    let csv = "";
    csv += `RNC Emisor,Periodo,Formato,Secuencia,Total Registros\n`;
    csv += `${this.sanitizeCsvField(BUSINESS_RULES.DGII_RNC_EMISOR ?? "")},${year},608,1,${records.length}\n`;
    csv += `Registro,RNC/Tipo ID Beneficiario,Beneficiario,RNC/Tipo ID Persona Retenida,Persona Retenida,Monto Sujeto Retención,Monto Retenido,Tipo Retención,Fecha de Pago\n`;

    records.forEach((r, i) => {
      csv += `${i + 1},,${this.sanitizeCsvField(r.driver.fullName)},${
        r.amount
      },0.00,ISR,${r.createdAt.toISOString().slice(0, 10)}\n`;
    });
    return csv;
  }

  private readonly ITBIS_RATE = BUSINESS_RULES.ITBIS_RATE;
  private readonly RECURRING_SUB_BASE =
    BUSINESS_RULES.STARTER_KIT_ANNUAL_FEE_RD;
  private readonly REFERRAL_RETENTION_RATE =
    BUSINESS_RULES.REFERRAL_RETENTION_RATE;

  /**
   * FINANCIAL INTELLIGENCE: Registers a new transaction with automatic tax & referral logic.
   */
  async recordTransaction(data: {
    type: string;
    category: string;
    amount: number;
    entityId?: string;
    reference?: string;
    note?: string;
    status?: string;
    currency?: string;
  }) {
    const currency = (data.currency || "DOP") as "DOP" | "USD" | "EUR";
    this.logger.log(
      `Recording ${data.type} transaction for category: ${data.category} (${currency})`,
    );

    let taxAmount = 0;
    let netAmount = data.amount;

    // Apply ITBIS 18% automatically for relevant categories
    if (data.category === "SUSCRIPCION" || data.category === "PUBLICIDAD") {
      taxAmount = (data.amount / (1 + this.ITBIS_RATE)) * this.ITBIS_RATE;
      netAmount = data.amount - taxAmount;
    }

    // Advanced Business Rule: If it's a subscription payment, check for referral retention
    if (data.category === "SUSCRIPCION" && data.entityId) {
      const driver = await this.prisma.driver.findUnique({
        where: { id: data.entityId },
        select: { referredBy: true },
      });

      if (driver?.referredBy) {
        this.logger.log(
          `Referral detected for driver ${data.entityId}. Applying retention logic.`,
        );
        const referralBonus = netAmount * this.REFERRAL_RETENTION_RATE;
        netAmount -= referralBonus; // Retain bonus for the referrer

        // Bonus transaction for the referrer could be recorded here as OUTGOING or a PENDING balance
      }
    }

    return this.prisma.financialTransaction.create({
      data: {
        type: data.type,
        category: data.category,
        amount: data.amount,
        taxAmount,
        netAmount,
        currency,
        entityId: data.entityId,
        reference: data.reference,
        note: data.note,
        status: data.status || "COMPLETED",
      },
    });
  }

  /**
   * FINANCIAL INTELLIGENCE: Returns the MRR and Burn Rate projections.
   */
  async getFinancialSummary() {
    this.logger.log("Generating financial summary and projections");

    // 1. MRR Calculation: Number of active drivers * Subscription Base
    const activeSubscribedDrivers = await this.prisma.driver.count({
      where: {
        status: BUSINESS_RULES.STATUS.DRIVER.ACTIVE,
        subscriptionPaid: true,
      },
    });

    const mrr = activeSubscribedDrivers * this.RECURRING_SUB_BASE;

    // 2. Campaign Revenue Calculation (Projected)
    const activeCampaigns = await this.prisma.campaign.findMany({
      where: { status: "ACTIVE" },
      include: { media: { select: mediaSafeSelect } },
    });

    let campaignRevenue = 0;
    activeCampaigns.forEach((campaign) => {
      let monthlyBase = 0;
      campaign.media.forEach((m) => {
        const dur = m.durationSeconds || 30;
        const blocks = Math.ceil(dur / 30);
        monthlyBase += blocks * BUSINESS_RULES.ADVERTISER_COST_PER_CAMPAIGN_RD;
      });

      const diffTime = Math.abs(
        campaign.endDate.getTime() - campaign.startDate.getTime(),
      );
      const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30)) || 1;
      campaignRevenue += monthlyBase * diffMonths;
    });

    // 3. Burn Rate Calculation: Fixed costs from transactions (VPS, Maps, etc.)
    const monthStart = new Date();
    monthStart.setDate(1);

    const monthlyExpenses = await this.prisma.financialTransaction.aggregate({
      where: {
        type: "OUTGOING",
        createdAt: { gte: monthStart },
      },
      _sum: { amount: true },
    });

    const burnRate = monthlyExpenses._sum.amount || 0;

    return {
      mrr,
      campaignRevenue,
      burnRate,
      activeSubscribers: activeSubscribedDrivers,
      netProjection: mrr + campaignRevenue - burnRate,
      currency: "DOP",
      timestamp: new Date(),
    };
  }

  /**
   * FINANCIAL INTELLIGENCE: getInvestorMetrics
   * Unit Economics & Escalabilidad
   */
  async getInvestorMetrics() {
    this.logger.log("Generating investor metrics (Unit Economics)");

    // 1. CAC (Customer Acquisition Cost) = Total OPEX_MARKETING / Total Advertisers
    const totalMarketing = await this.prisma.financialTransaction.aggregate({
      where: { category: "OPEX_MARKETING" },
      _sum: { amount: true },
    });
    const totalAdvertisers = await this.prisma.advertiser.count();
    const marketingSpend = totalMarketing._sum.amount || 0;
    const cac = totalAdvertisers > 0 ? marketingSpend / totalAdvertisers : 0;

    // 2. EBITDA Operativo = Revenue (AD + SUB) - OPEX (PAYOUT + COMM + MKT) (Sin CAPEX, TAX_ITBIS)
    const revenues = await this.prisma.financialTransaction.aggregate({
      where: { category: { in: ["REVENUE_AD", "REVENUE_SUBSCRIPTION"] } },
      _sum: { amount: true },
    });
    const opex = await this.prisma.financialTransaction.aggregate({
      where: {
        category: {
          in: ["OPEX_DRIVER_PAYOUT", "OPEX_COMMISSION", "OPEX_MARKETING"],
        },
      },
      _sum: { amount: true },
    });
    const totalRev = revenues._sum.amount || 0;
    const totalOpex = opex._sum.amount || 0;
    const ebitda = totalRev - totalOpex;

    // 3. Promedio Mensual por Taxi (Para LTV y Payback)
    const activeTaxis = await this.prisma.device.count({
      where: { status: BUSINESS_RULES.STATUS.DEVICE.ACTIVE },
    });

    // Ingresos promedio mensual (simplificado)
    const monthsActive = 12; // Suponemos 12 meses o calculamos base en oldest transaction
    const monthlyRevPerTaxi =
      activeTaxis > 0 ? totalRev / monthsActive / activeTaxis : 0;
    const monthlyOpexPerTaxi =
      activeTaxis > 0 ? totalOpex / monthsActive / activeTaxis : 0;

    // LTV: Ingreso proyectado por taxi a 24 meses
    const ltv = monthlyRevPerTaxi * 24;

    // Payback Period (Meses para recuperar inversión inicial)
    const netMonthlyPerTaxi = monthlyRevPerTaxi - monthlyOpexPerTaxi;
    const paybackPeriod =
      netMonthlyPerTaxi > 0
        ? BUSINESS_RULES.STARTER_KIT_ANNUAL_FEE_RD / netMonthlyPerTaxi
        : 999; // 999 if never

    return {
      cac: cac.toFixed(2),
      ltv: ltv.toFixed(2),
      paybackPeriod: paybackPeriod.toFixed(1),
      ebitda: ebitda.toFixed(2),
      activeTaxis,
      monthlyRevPerTaxi: monthlyRevPerTaxi.toFixed(2),
      monthlyOpexPerTaxi: monthlyOpexPerTaxi.toFixed(2),
      hardwareCostPerUnit: BUSINESS_RULES.STARTER_KIT_ANNUAL_FEE_RD,
      currency: "DOP",
      generatedAt: new Date(),
    };
  }

  /**
   * Returns the ledger (historical transactions)
   */
  async getLedger() {
    return this.prisma.financialTransaction.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  private generateInvoiceTemplate(data: {
    invoiceNumber: string;
    date: string;
    client: string;
    email: string;
    campaign: string;
    period: string;
    impressions: number;
    qty: number;
    unitPrice: number;
    subtotal: number;
    taxes: number;
    total: number;
  }) {
    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Factura ${data.invoiceNumber} - TAD DOOH</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;900&display=swap" rel="stylesheet">
    <style>
        :root { --tad-yellow: #FFD400; --bg: #0a0a0a; --card: #141414; }
        body { font-family: 'Outfit', sans-serif; background: var(--bg); color: #fff; margin: 0; padding: 40px; line-height: 1.6; }
        .invoice-box { max-width: 900px; margin: auto; padding: 50px; background: var(--card); border: 1px solid #222; border-radius: 32px; box-shadow: 0 40px 100px rgba(0,0,0,0.8); position: relative; overflow: hidden; }
        .invoice-box::before { content: ''; position: absolute; top: 0; right: 0; width: 300px; h-8; background: var(--tad-yellow); clip-path: polygon(100% 0, 0 0, 100% 100%); opacity: 0.1; }
        
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 60px; position: relative; z-index: 10; }
        .logo-section h1 { font-size: 48px; font-weight: 900; margin: 0; letter-spacing: -2px; color: var(--tad-yellow); line-height: 1; }
        .logo-section h1 span { color: #fff; }
        .logo-section p { margin: 10px 0 0 0; color: #666; font-weight: 700; letter-spacing: 2px; font-size: 10px; text-transform: uppercase; }

        .meta-section { text-align: right; }
        .meta-section h2 { font-size: 24px; font-weight: 900; margin: 0; color: #fff; }
        .meta-section p { margin: 5px 0; color: #888; font-size: 14px; font-weight: 700; }
        .status-badge { display: inline-block; padding: 8px 16px; background: #FFD4001a; color: var(--tad-yellow); border: 1px solid #FFD40033; border-radius: 12px; font-size: 10px; font-weight: 800; text-transform: uppercase; margin-top: 15px; }

        .client-grid { display: grid; grid-template-cols: 1fr 1fr; gap: 40px; margin-bottom: 60px; }
        .client-block h3 { font-size: 12px; color: #444; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 15px; border-bottom: 1px solid #222; padding-bottom: 5px; }
        .client-block p { margin: 0; font-size: 18px; font-weight: 700; color: #eee; }
        .client-block .small { font-size: 14px; color: #777; font-weight: 400; margin-top: 5px; }

        table { width: 100%; border-collapse: separate; border-spacing: 0 10px; margin-bottom: 60px; }
        th { text-align: left; padding: 15px 20px; color: #444; text-transform: uppercase; font-size: 11px; font-weight: 800; border-bottom: 1px solid #222; }
        td { padding: 25px 20px; background: #1a1a1a; font-size: 16px; border-top: 1px solid #222; border-bottom: 1px solid #222; }
        td:first-child { border-left: 1px solid #222; border-radius: 16px 0 0 16px; font-weight: 700; }
        td:last-child { border-right: 1px solid #222; border-radius: 0 16px 16px 0; text-align: right; font-weight: 900; color: var(--tad-yellow); }
        .description-sub { font-size: 12px; color: #555; display: block; margin-top: 5px; }

        .bottom-section { display: flex; justify-content: space-between; align-items: flex-end; }
        .payment-info { color: #555; font-size: 12px; max-width: 400px; }
        .payment-info h4 { color: #888; margin-bottom: 10px; font-size: 14px; }

        .totals { width: 350px; background: #1a1a1a; padding: 30px; border-radius: 24px; border: 1px solid #222; }
        .total-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; color: #888; }
        .total-row.grand { margin-top: 20px; padding-top: 20px; border-top: 1px solid #333; font-size: 32px; font-weight: 900; color: var(--tad-yellow); }

        .footer { margin-top: 80px; text-align: center; color: #333; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 3px; }

        @media print {
            body { padding: 0; background: #fff; color: #000; }
            .invoice-box { box-shadow: none; border: none; padding: 20px; background: #fff; }
            td, .totals { background: #f9f9f9; color: #000; border-color: #eee; }
            .total-row.grand, .logo-section h1 { color: #000 !important; }
            th { color: #888; }
        }
    </style>
</head>
<body>
    <div class="invoice-box">
        <div class="header">
            <div class="logo-section">
                <h1>TAD<span>DOOH</span></h1>
                <p>Digital Out Of Home Advertising</p>
            </div>
            <div class="meta-section">
                <h2>Comprobante Fiscal</h2>
                <p>ID: ${data.invoiceNumber}</p>
                <p>Emitido: ${data.date}</p>
                <div class="status-badge">Auditoría Aprobada</div>
            </div>
        </div>

        <div class="client-grid">
            <div class="client-block">
                <h3>Prestador</h3>
                <p>TAD Advertising SRL</p>
                <p class="small">RNC: 132-45678-9<br>Calle Central #45, Santo Domingo, RD</p>
            </div>
            <div class="client-block" style="text-align: right">
                <h3>Receptor</h3>
                <p>${data.client}</p>
                <p class="small">${data.email || "contacto@cliente.com"}<br>Periodo: ${data.period}</p>
            </div>
        </div>

        <table>
            <thead>
                <tr>
                    <th>Concepto de Pauta</th>
                    <th style="text-align: center">Ciclos</th>
                    <th style="text-align: right">Impactos</th>
                    <th style="text-align: right">Total (DOP)</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>
                        ${data.campaign}
                        <span class="description-sub">Servicio de exhibición publicitaria en flota TAD taxis</span>
                    </td>
                    <td style="text-align: center">${data.qty} Mes(es)</td>
                    <td style="text-align: right">${data.impressions.toLocaleString()}</td>
                    <td style="text-align: right">RD$ ${data.total.toLocaleString()}</td>
                </tr>
            </tbody>
        </table>

        <div class="bottom-section">
            <div class="payment-info">
                <h4>Detalles de Transferencia</h4>
                <p>Banco Popular Dominicano<br>Cuenta Corriente: 802-XXXXXXX<br>Beneficiario: TAD Advertising SRL</p>
                <p style="margin-top: 20px">* Este documento es un reporte de auditoría fiscal generado automáticamente por el sistema de inteligencia financiera de TAD.</p>
            </div>
            <div class="totals">
                <div class="total-row">
                    <span>Monto Base</span>
                    <span>RD$ ${data.subtotal.toLocaleString()}</span>
                </div>
                <div class="total-row">
                    <span>ITBIS (18%)</span>
                    <span>RD$ ${data.taxes.toLocaleString()}</span>
                </div>
                <div class="total-row grand">
                    <span>RD$ ${data.total.toLocaleString()}</span>
                </div>
            </div>
        </div>

        <div class="footer">
            TAD Platform v5.2 - Intelligence & Performance Reporting
        </div>
    </div>
</body>
</html>
    `;
  }
}
