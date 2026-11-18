import {
  Module,
  MiddlewareConsumer,
  NestModule,
  OnModuleInit,
  Logger,
} from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { SentryInterceptor } from "./common/interceptors/sentry.interceptor";
import * as zod from "zod";
import { DeviceModule } from "./modules/device/device.module";
import { AnalyticsModule } from "./modules/analytics/analytics.module";
import { CampaignModule } from "./modules/campaign/campaign.module";
import { FleetModule } from "./modules/fleet/fleet.module";
import { MediaModule } from "./modules/media/media.module";
import { AssetsModule } from "./modules/assets/assets.module";
import { DriversModule } from "./modules/drivers/drivers.module";
import { AdvertisersModule } from "./modules/advertisers/advertisers.module";
import { FinanceModule } from "./modules/finance/finance.module";
import { SyncModule } from "./modules/sync/sync.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { PrismaModule } from "./modules/prisma/prisma.module";
import { AuthModule } from "./modules/auth/auth.module";
import { SupabaseModule } from "./modules/supabase/supabase.module";
import { SheetsModule } from "./modules/sheets/sheets.module";
import { AuthService } from "./modules/auth/auth.service";
import { SupabaseAuthGuard } from "./modules/auth/guards/supabase-auth.guard";
import { AdvertiserAccountStatusGuard } from "./modules/auth/guards/advertiser-account-status.guard";
import { LoggerMiddleware } from "./middleware/logger.middleware";
import { SimulationModule } from "./modules/simulation/simulation.module";
import { AntigravityModule } from "./antigravity/antigravity.module";
import { PortalRequestsModule } from "./modules/portal-requests/portal-requests.module";
import { BiModule } from "./modules/bi/bi.module";
import { MonitoringModule } from "./modules/monitoring/monitoring.module";
import { RolesGuard } from "./modules/auth/guards/roles.guard";
import { AppController } from "./app.controller";
import { WalletModule } from "./modules/wallet/wallet.module";
import { TelemetryModule } from "./modules/telemetry/telemetry.module";
import { ReferralModule } from "./modules/referral/referral.module";
import { SystemSettingsModule } from "./modules/system-settings/system-settings.module";
import { CommissionModule } from "./modules/commission/commission.module";
import { QrScanModule } from "./modules/qr-scan/qr-scan.module";
import { ConversationModule } from "./modules/conversation/conversation.module";
import { VerifiedMetricsModule } from "./modules/verified-metrics/verified-metrics.module";
import { PaymentsModule } from "./modules/payments/payments.module";

import { OnboardingModule } from "./modules/onboarding/onboarding.module";
import { KYCModule } from "./modules/kyc/kyc.module";
import { SocialAgentModule } from "./modules/social-agent/social-agent.module";
import { HealthController } from "./health/health.controller";

@Module({
  imports: [
    // Configuration with Validation (STRICT MODE para Easypanel)
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === "production" ? undefined : ".env",
      ignoreEnvFile: process.env.NODE_ENV === "production",
      validate: (config) => {
        const schema = zod.object({
          DATABASE_URL: zod.string().url().optional(),
          DIRECT_URL: zod.string().url().optional(),
          JWT_SECRET: zod.string().min(32),
          SUPABASE_URL: zod.string().url(),
          SUPABASE_SERVICE_ROLE_KEY: zod.string().min(10),
          SUPABASE_ANON_KEY: zod.string().optional(),
          SUPABASE_PUBLISHABLE_KEY: zod.string().optional(),
          SUPABASE_JWT_SECRET: zod.string().min(32),
          PORT: zod.string().regex(/^\d+$/).default("3000"),
          NODE_ENV: zod.string().default("production"),
          CORS_ORIGIN: zod
            .string()
            .default(
              "https://tad.adm.ibusiness.com.do,https://tad.anunciante.ibusiness.com.do,https://tad.driver.ibusiness.com.do,https://tad.player.ibusiness.com.do,https://tad.simulator.ibusiness.com.do,https://tad.api.ibusiness.com.do",
            ),
          UMAMI_API_TOKEN: zod.string().optional(),
          CDN_URL_PREFIX: zod.string().url().optional(),
        });

        const result = schema.safeParse(config);
        if (!result.success) {
          console.error(
            "🔥 FATAL ERROR: Configuración de entorno inválida en startup",
            result.error.format(),
          );
          throw new Error(
            "Configuración de entorno inválida. Revisar variables en Easypanel.",
          );
        }
        const data = result.data || config;

        // REGLA SRE: secreto JWT obligatorio — nunca arrancar con fallback
        // invisible que perjudique la firma de tokens (SHELTER de seguridad).
        // La config histórica de EasyPanel solo define SUPABASE_JWT_SECRET;
        // se hereda a JWT_SECRET para no invalidar los tokens vigentes.
        if (
          !data.JWT_SECRET &&
          !data.SUPABASE_JWT_SECRET &&
          process.env.NODE_ENV !== "test"
        ) {
          throw new Error(
            "JWT_SECRET/SUPABASE_JWT_SECRET no configurados. Revisar EasyPanel Secrets.",
          );
        }

        // REGLA SRE: Sincronización de secretos para evitar 401 en EasyPanel
        if (!data.JWT_SECRET && data.SUPABASE_JWT_SECRET) {
          data.JWT_SECRET = data.SUPABASE_JWT_SECRET;
        }
        if (!data.SUPABASE_JWT_SECRET && data.JWT_SECRET) {
          data.SUPABASE_JWT_SECRET = data.JWT_SECRET;
        }

        return data;
      },
    }),

    // SHELTER C-AD1: Rate limiting reactivado con límites conservadores para Free Tier
    // 120 req/min global — suficiente para operación normal, bloquea abuso
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 120 }]),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    SupabaseModule,
    DeviceModule,
    AnalyticsModule,
    CampaignModule,
    FleetModule,
    MediaModule,
    AssetsModule,
    DriversModule,
    AdvertisersModule,
    FinanceModule,
    SyncModule,
    NotificationsModule,
    SheetsModule,
    AntigravityModule,
    PortalRequestsModule,
    BiModule,
    MonitoringModule,
    WalletModule,
    TelemetryModule,
    ReferralModule,
    SystemSettingsModule,
    CommissionModule,
    QrScanModule,
    ConversationModule,
    VerifiedMetricsModule,
    PaymentsModule,
    SimulationModule,
    OnboardingModule,
    KYCModule,
    SocialAgentModule,
  ],
  controllers: [AppController, HealthController],
  providers: [
    // Global JWT guard — protects ALL routes by default
    // Use @Public() decorator on tablet-facing routes to bypass
    {
      provide: APP_GUARD,
      useClass: SupabaseAuthGuard,
    },
    // RBAC Guard — checks roles after JWT validation
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    // Enforce current PostgreSQL advertiser status on ALL private API routes.
    // Must run AFTER authentication and RBAC; onboarding exceptions are explicit.
    {
      provide: APP_GUARD,
      useClass: AdvertiserAccountStatusGuard,
    },
    // SHELTER C-AD1: ThrottlerGuard global — aplica rate limiting en todas las rutas
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: SentryInterceptor,
    },
  ],
})
export class AppModule implements NestModule, OnModuleInit {
  private readonly logger = new Logger(AppModule.name);

  constructor(private readonly authService: AuthService) {}

  configure(consumer: MiddlewareConsumer) {
    // Apply LoggerMiddleware to all routes under /api/
    consumer.apply(LoggerMiddleware).forRoutes("*");
  }

  async onModuleInit() {
    this.logger.log("🚀 TAD Backend Iniciado.");
  }
}
