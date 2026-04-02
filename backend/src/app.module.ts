import { Module, MiddlewareConsumer, NestModule, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { SentryInterceptor } from './common/interceptors/sentry.interceptor';
import * as zod from 'zod';
import { DeviceModule } from './modules/device/device.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { CampaignModule } from './modules/campaign/campaign.module';
import { FleetModule } from './modules/fleet/fleet.module';
import { MediaModule } from './modules/media/media.module';
import { AssetsModule } from './modules/assets/assets.module';
import { DriversModule } from './modules/drivers/drivers.module';
import { AdvertisersModule } from './modules/advertisers/advertisers.module';
import { FinanceModule } from './modules/finance/finance.module';
import { SyncModule } from './modules/sync/sync.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { SupabaseModule } from './modules/supabase/supabase.module';
import { SheetsModule } from './modules/sheets/sheets.module';
import { AuthService } from './modules/auth/auth.service';
import { SupabaseAuthGuard } from './modules/auth/guards/supabase-auth.guard';
import { LoggerMiddleware } from './middleware/logger.middleware';
import { AntigravityModule } from './antigravity/antigravity.module';
import { PortalRequestsModule } from './modules/portal-requests/portal-requests.module';
import { BiModule } from './modules/bi/bi.module';

@Module({
  imports: [
    // Configuration with Validation (RELAXED for EasyPanel free tier)
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'production' ? undefined : '.env',
      ignoreEnvFile: process.env.NODE_ENV === 'production',
      validate: (config) => {
        const schema = zod.object({
          DATABASE_URL: zod.string().url().optional(),
          DIRECT_URL: zod.string().url().optional(),
          JWT_SECRET: zod.string().optional(),
          SUPABASE_URL: zod.string().url().optional(),
          SUPABASE_SERVICE_ROLE_KEY: zod.string().optional(),
          PORT: zod.string().regex(/^\d+$/).default('3000'),
          NODE_ENV: zod.string().default('production'),
          CORS_ORIGIN: zod.string().default('*'),
          UMAMI_API_TOKEN: zod.string().optional(),
        });

        const result = schema.safeParse(config);
        if (!result.success) {
          console.warn('⚠️ ADVERTENCIA: Variables de entorno incompletas o inválidas:');
          const errors = result.error.format();
          Object.keys(errors).forEach(key => {
            if (key !== '_errors') console.warn(`   - ${key}: ${JSON.stringify(errors[key])}`);
          });
          // NO lanzamos error para permitir que el contenedor intente arrancar
        }
        return result.data || config;
      },
    }),

    // Rate limiting - DESACTIVADO (causa memory leaks en Free Tier)
    // ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
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
  ],
  providers: [
    // Global JWT guard — protects ALL routes by default
    // Use @Public() decorator on tablet-facing routes to bypass
    {
      provide: APP_GUARD,
      useClass: SupabaseAuthGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: SentryInterceptor,
    },
  ],
})
export class AppModule implements NestModule, OnModuleInit {
  constructor(private readonly authService: AuthService) {}

  configure(consumer: MiddlewareConsumer) {
    // Apply LoggerMiddleware to all routes under /api/
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }

  async onModuleInit() {
    // Seed default admin user if none exist
    try {
      await this.authService.seedAdminUser();
    } catch (e) {
      console.warn('⚠️ No se pudo ejecutar el seed inicial:', e.message);
    }
  }
}
