import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { BiService } from "./bi.service";
import { PrismaService } from "../prisma/prisma.service";
import { AdvertiserBillingService } from "../advertisers/advertiser-billing.service";
import { CampaignExpirationService } from "../campaign-expiration/campaign-expiration.service";

@Injectable()
export class BiScheduler {
  private readonly logger = new Logger(BiScheduler.name);

  constructor(
    private readonly biService: BiService,
    private readonly prisma: PrismaService,
    private readonly advertiserBilling: AdvertiserBillingService,
    private readonly campaignExpiration: CampaignExpirationService,
  ) {}

  /**
   * Generar snapshot de BI cada medianoche (00:00 AST).
   * Los snapshots permiten comparar rendimiento histórico sin queries pesadas en runtime.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailySnapshot() {
    this.logger.log("🚀 Iniciando generación de snapshot diario de BI...");
    try {
      await this.biService.getMasterKpis(true);
      this.logger.log("✅ Snapshot diario generado con éxito.");
    } catch (error) {
      this.logger.error("❌ Error al generar snapshot de BI:", error.message);
    }
  }

  /**
   * Conciliación financiera proactiva a las 02:00 AM AST.
   * Analiza suscripciones, impresiones y pagos del periodo actual.
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleReconciliation() {
    const now = new Date();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    this.logger.log(
      `🌙 Iniciando conciliación automática para el periodo ${period}...`,
    );
    try {
      const result = await this.biService.generateReconciliationReport(period);
      this.logger.log(
        `✅ Conciliación completada: ${result.total} registros procesados.`,
      );
    } catch (error) {
      this.logger.error("❌ Falla en conciliación automática:", error.message);
    }
  }

  /**
   * CONCILIACIÓN MENSUAL OFICIAL — Día 2, 08:00 AST (America/Santo_Domingo).
   *
   * Truth Bridge del mes ANTERIOR. A diferencia de handleReconciliation()
   * (conciliación proactiva diaria del mes en curso, que se hace incremental),
   * este cron ejecuta el cierre oficial del mes ya terminado para detectar
   * fugas y discrepancias antes del corte contable.
   *
   * Ejecuta para el mes previo porque el día 2 el mes anterior está cerrado
   * (todos los playbacks, GPS, nóminas y pagos del mes ya se registraron),
   * garantizando un snapshot completo y estable.
   *
   * Con timeZone explícito para que no dependa de la zona del contenedor.
   */
  @Cron("0 8 2 * *", {
    name: "monthly-reconciliation-previous-month",
    timeZone: "America/Santo_Domingo",
  })
  async handleMonthlyReconciliation() {
    const now = new Date();
    // Mes anterior: si estamos en enero (0), retroceder a diciembre del año previo.
    const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth();
    const prevYear =
      now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const period = `${prevYear}-${String(prevMonth).padStart(2, "0")}`;
    this.logger.log(
      `📼 Iniciando conciliación mensual oficial para el periodo cerrado ${period}...`,
    );
    try {
      const result = await this.biService.generateReconciliationReport(period);
      this.logger.log(
        `✅ Conciliación mensual ${period} completada: ${result.total} registros procesados.`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Falla en conciliación mensual ${period}:`,
        error.message,
      );
      await this.prisma.systemError.create({
        data: {
          source: "BI",
          message: `Monthly reconciliation failed for ${period}: ${error.message}`,
          details: error.stack,
          entityId: period,
          severity: "ERROR",
        },
      });
    }
  }

  /**
   * VULN #4 PATCH (v12.1.2): IdempotencyKey TTL Cleanup at 04:00 AM AST.
   * Purges expired idempotency records from the DB-backed store to prevent
   * unbounded table growth. Scheduled after the 03:00 AM maintenance jobs
   * to avoid any overlap with delinquency/orphan cleanup processing.
   */
  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async handleIdempotencyCleanup() {
    this.logger.log(
      "🔎 [IDEMPOTENCY_RETENTION] Checking records for reconciliation/archival...",
    );
    try {
      // An old lock may represent a payment that committed just before
      // an API crash. Never release it based on age alone.
      const uncertain = await this.prisma.idempotencyKey.count({
        where: {
          isLocked: true,
          createdAt: { lt: new Date(Date.now() - 3_600_000) },
        },
      });
      if (uncertain > 0) {
        this.logger.warn(
          `[IDEMPOTENCY_RECONCILIATION_REQUIRED] ${uncertain} aged in-flight ` +
            "records remain locked; investigate before retrying.",
        );
      }

      // A completed payment can be retried after long offline periods.
      // Never delete its deduplication key based on age alone. Inspect the
      // expiry horizon cheaply via the index; archival requires permanent
      // key tombstones + an approved retention/reconciliation plan.
      const archiveCandidate = await this.prisma.idempotencyKey.findFirst({
        where: {
          expiresAt: { lt: new Date() },
          isLocked: false,
        },
        select: { id: true },
      });
      if (archiveCandidate) {
        this.logger.warn(
          "[IDEMPOTENCY_ARCHIVE_REQUIRED] Completed keys older than " +
            "the review horizon are retained to prevent duplicate payments.",
        );
      }
    } catch (error) {
      this.logger.error("❌ Error in idempotency cleanup:", error.message);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ADVERTISER SUBSCRIPTION BILLING — 1st of each month at 02:30 AM AST
  // ─────────────────────────────────────────────────────────────────────────────
  @Cron("30 2 1 * *", {
    name: "advertiser-subscription-billing",
    timeZone: "America/Santo_Domingo",
  })
  async handleAdvertiserSubscriptionBilling() {
    this.logger.log(
      "🧾 CRON: Ejecutando facturación de suscripciones de anunciantes (día 1, 02:30)",
    );
    try {
      const result =
        await this.advertiserBilling.runMonthlySubscriptionBilling();
      this.logger.log(
        `✅ Facturación suscripciones completada: ${result.processed} procesadas, ${result.failed} fallidas`,
      );
    } catch (err) {
      this.logger.error(
        `❌ Error en facturación suscripciones: ${err.message}`,
        err.stack,
      );
      await this.prisma.systemError.create({
        data: {
          source: "ADVERTISER_BILLING",
          message: `Cron advertiser billing failed: ${err.message}`,
          details: err.stack,
          entityId: "monthly-advertiser-billing",
          severity: "ERROR",
        },
      });
    }
  }

  /**
   * CADUCIDAD DE CAMPañAS: Verificar campañas que expiran (7 días) y notificar.
   * Ejecuta a las 19:00 AST para dar margen al anunciante antes del cierre.
   */
  @Cron("0 19 * * *", {
    name: "campaign-expiration-notification",
    timeZone: "America/Santo_Domingo",
  })
  async handleCampaignExpirationNotification() {
    this.logger.log(
      "📅 CRON: Verificando campañas que expiran en próximos 7 días...",
    );
    try {
      const result =
        await this.campaignExpiration.checkAndNotifyExpiringCampaigns(7);
      this.logger.log(
        `✅ Caducidad de campañas completada: ${result.campaignsChecked} verificadas, ${result.notificationsSent} notificaciones enviadas`,
      );
    } catch (err) {
      this.logger.error(
        `❌ Error en notificación de caducidad de campañas: ${err.message}`,
        err.stack,
      );
      await this.prisma.systemError.create({
        data: {
          source: "CAMPAIGN_EXPIRATION",
          message: `Campaign expiration check failed: ${err.message}`,
          details: err.stack,
          entityId: "campaign-expiration",
          severity: "ERROR",
        },
      });
    }
  }

  /**
   * PROCESAMIENTO DE COLA: Enviar notificaciones de caducidad desde la cola.
   * Ejecuta a las 20:00 AST.
   */
  @Cron("0 20 * * *", {
    name: "campaign-expiration-queue-process",
    timeZone: "America/Santo_Domingo",
  })
  async handleCampaignExpirationQueueProcess() {
    this.logger.log(
      "📤 CRON: Procesando cola de notificaciones de caducidad...",
    );
    try {
      const result = await this.campaignExpiration.processExpirationQueue();
      this.logger.log(
        `✅ Procesamiento de cola completado: ${result.notificationsSent} notificaciones enviadas`,
      );
    } catch (err) {
      this.logger.error(
        `❌ Error en procesamiento de cola: ${err.message}`,
        err.stack,
      );
      await this.prisma.systemError.create({
        data: {
          source: "CAMPAIGN_EXPIRATION_QUEUE",
          message: `Campaign expiration queue processing failed: ${err.message}`,
          details: err.stack,
          entityId: "campaign-expiration-queue",
          severity: "ERROR",
        },
      });
    }
  }
}
