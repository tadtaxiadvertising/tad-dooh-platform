import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

/**
 * Supabase's shared pooler requires `postgres.<project-ref>` as the database
 * user. Direct database connections use just `postgres`, so normalize only
 * that exact, known pooler misconfiguration and leave every other URL intact.
 */
export function normalizeSupabasePoolerUsername(
  databaseUrl: string | undefined,
  supabaseUrl: string | undefined,
): { url: string | undefined; normalized: boolean } {
  if (!databaseUrl || !supabaseUrl) {
    return { url: databaseUrl, normalized: false };
  }

  try {
    const database = new URL(databaseUrl);
    const supabase = new URL(supabaseUrl);
    const projectRef = supabase.hostname.match(
      /^([a-z0-9-]+)\.supabase\.co$/i,
    )?.[1];

    if (
      !projectRef ||
      !database.hostname.endsWith(".pooler.supabase.com") ||
      database.username !== "postgres"
    ) {
      return { url: databaseUrl, normalized: false };
    }

    database.username = `postgres.${projectRef}`;
    return { url: database.toString(), normalized: true };
  } catch {
    return { url: databaseUrl, normalized: false };
  }
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private databaseAvailable = false;
  private masterSyncViewReady = false;
  private masterSyncNextCheckAt = 0;
  private masterSyncWarningEmitted = false;

  /**
   * Indicates whether the initial database connection completed successfully.
   * Startup initializers use this to avoid generating extra connection attempts
   * when the pooler has rejected the configured credentials.
   */
  get isDatabaseAvailable(): boolean {
    return this.databaseAvailable;
  }

  constructor() {
    const normalizedDatabase = normalizeSupabasePoolerUsername(
      process.env.DATABASE_URL,
      process.env.SUPABASE_URL,
    );
    let url = normalizedDatabase.url;
    let warnMsg: string | undefined;
    // SRE v12.1.1: Default 5 connections para Supabase Free Tier en EasyPanel.
    // 20 conexiones puede agotar el pool durante CRON bursts + heartbeat storms.
    if (url && !url.includes("connection_limit=")) {
      const separator = url.includes("?") ? "&" : "?";
      url = `${url}${separator}connection_limit=5`;
    } else if (url && url.includes("connection_limit=")) {
      const match = url.match(/connection_limit=(\d+)/);
      if (match && parseInt(match[1]) > 10) {
        warnMsg = `⚠️ [SRE] connection_limit=${match[1]} detectado en DATABASE_URL. Recomendado: 5 para EasyPanel Free Tier.`;
      }
    }

    // SRE v12.2.5: pool_timeout=10s — evita que queries lentas bloqueen el pool durante spikes de telemetría
    if (url && !url.includes("pool_timeout=")) {
      const separator = url.includes("?") ? "&" : "?";
      url = `${url}${separator}pool_timeout=10`;
    }

    // SRE: Forzar sslmode=require para Supabase Pooler (puerto 6543)
    // Sin esto, Prisma 5.x no puede conectarse al pooler transaccional de Supabase
    if (url && !url.includes("sslmode=")) {
      const separator = url.includes("?") ? "&" : "?";
      url = `${url}${separator}sslmode=require`;
    }

    super({
      datasources: {
        db: {
          // REGLA SRE: Forzar el uso del Pooler de Supabase (Puerto 6543)
          // DATABASE_URL debe incluir ?connection_limit=5 en EasyPanel
          url,
        },
      },
      // Solo loguear errores en producción para no saturar el log de EasyPanel
      log:
        process.env.NODE_ENV === "development"
          ? ["query", "info", "warn", "error"]
          : ["error"],
    });

    if (warnMsg) {
      this.logger.warn(warnMsg);
    }
    if (normalizedDatabase.normalized) {
      this.logger.warn(
        "DATABASE_URL usaba el usuario `postgres` con el pooler de Supabase; se corrigió a `postgres.<project-ref>`.",
      );
    }
  }

  async onModuleInit() {
    this.logger.log("🔌 Inicializando conexión al Pooler de Supabase...");

    const MAX_RETRIES = 5;
    let attempts = 0;

    while (attempts < MAX_RETRIES) {
      try {
        await this.$connect();
        this.databaseAvailable = true;
        this.logger.log(
          `✅ Conexión establecida con éxito en el intento ${attempts + 1}`,
        );

        // DDL belongs in versioned migrations, NEVER during API bootstrap.
        // Verify the runtime contract read-only and surface one clear error.
        await this.checkMasterSyncViewReady();

        return;
      } catch (e) {
        this.databaseAvailable = false;
        attempts++;
        const delay = attempts * 2000;
        const errMsg = e instanceof Error ? e.message : String(e);
        this.logger.error(
          `❌ Intento ${attempts}/${MAX_RETRIES} fallido: ${errMsg}`,
        );
        if (this.isDatabaseAuthenticationError(errMsg)) {
          this.logger.error(
            "🚨 Credenciales de DATABASE_URL rechazadas. No se reintentará para evitar bloquear el pooler de Supabase.",
          );
          return;
        }
        if (attempts >= MAX_RETRIES) {
          this.logger.error(
            "🚨 ERROR FATAL: No se pudo conectar a la base de datos tras 5 intentos.",
          );
          this.logger.error(`Último error: ${errMsg}`);
          // Don't exit immediately, let Nest trial continue if possible, or use a health check
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  private isDatabaseAuthenticationError(message: string): boolean {
    const normalized = message.toLowerCase();
    return (
      normalized.includes("authentication failed") ||
      normalized.includes("password authentication failed") ||
      normalized.includes("too many authentication failures")
    );
  }

  /**
   * Read-only preflight: no DROP/CREATE/REFRESH runs during NestJS startup.
   * Keep the result briefly cached to avoid overloading the Supabase pooler
   * when many campaigns/devices trigger refresh requests.
   *
   * The view is provisioned explicitly via versioned Prisma migrations.
   * An absent or unpopulated view is an operational fault, never a success.
   */
  private async checkMasterSyncViewReady(): Promise<boolean> {
    const now = Date.now();
    if (now < this.masterSyncNextCheckAt) {
      return this.masterSyncViewReady;
    }
    this.masterSyncNextCheckAt = now + 60_000;

    try {
      const views = await this.$queryRaw<{ ispopulated: boolean }[]>`
        SELECT ispopulated
        FROM pg_catalog.pg_matviews
        WHERE schemaname = 'public'
          AND matviewname = 'mv_active_campaigns'
      `;
      this.masterSyncViewReady = views[0]?.ispopulated === true;

      if (!this.masterSyncViewReady && !this.masterSyncWarningEmitted) {
        this.logger.error(
          "[MASTER_SYNC_VIEW_UNAVAILABLE] public.mv_active_campaigns " +
            "is missing or unpopulated. Restore via reviewed migration; " +
            "do not drop/recreate it during startup.",
        );
        this.masterSyncWarningEmitted = true;
      } else if (this.masterSyncViewReady && this.masterSyncWarningEmitted) {
        this.logger.log(
          "[MASTER_SYNC_VIEW_READY] Materialized view available.",
        );
        this.masterSyncWarningEmitted = false;
      }
      return this.masterSyncViewReady;
    } catch {
      this.masterSyncViewReady = false;
      if (!this.masterSyncWarningEmitted) {
        this.logger.error(
          "[MASTER_SYNC_VIEW_CHECK_FAILED] Could not verify " +
            "public.mv_active_campaigns. Check PostgreSQL access and migration state.",
        );
        this.masterSyncWarningEmitted = true;
      }
      return false;
    }
  }

  // REGLA SRE: Cerrar conexiones zombie al re-desplegar en EasyPanel
  async onModuleDestroy() {
    this.logger.log(
      "🔌 Cierre de conexiones al Pooler solicitado (Shutdown/Redeploy)...",
    );
    await this.$disconnect();
  }

  /**
   * Refresca la vista materializada para el "Master Sync".
   * Se debe llamar cada vez que una campaña sea aprobada o modificada.
   */
  async refreshActiveCampaignsView() {
    if (!(await this.checkMasterSyncViewReady())) {
      // Never attempt a refresh against a missing MV or pretend success.
      // Device sync still receives its explicit failure from the sync service.
      return;
    }
    this.logger.log("🔄 Refrescando Materialized View (Master Sync)...");
    try {
      await this.$executeRawUnsafe(
        "REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_active_campaigns;",
      );
      this.logger.log("✅ mv_active_campaigns actualizada con éxito.");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unknown refresh error";
      if (message.includes("not been populated")) {
        // Initial/non-concurrent refresh is only valid for an existing view.
        await this.$executeRawUnsafe(
          "REFRESH MATERIALIZED VIEW public.mv_active_campaigns;",
        );
      } else {
        this.logger.error(`❌ Error al refrescar vista: ${message}`);
      }
    }
  }

  /**
   * Expose Prisma connectivity metrics for health monitoring.
   */
  async getHealthMetrics(): Promise<{
    connected: boolean;
    activeConnections?: number;
    masterSyncViewReady: boolean;
  }> {
    try {
      const result = await this.$queryRaw<{ active_connections: bigint }[]>`
        SELECT count(*) as active_connections FROM pg_stat_activity WHERE datname = current_database()
      `;
      return {
        connected: true,
        activeConnections: Number(result[0]?.active_connections ?? 0),
        masterSyncViewReady: await this.checkMasterSyncViewReady(),
      };
    } catch {
      return { connected: false, masterSyncViewReady: false };
    }
  }
}
