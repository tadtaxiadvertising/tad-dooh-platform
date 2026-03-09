import { Module, MiddlewareConsumer, NestModule, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { DeviceModule } from './modules/device/device.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { CampaignModule } from './modules/campaign/campaign.module';
import { FleetModule } from './modules/fleet/fleet.module';
import { MediaModule } from './modules/media/media.module';
import { AssetsModule } from './modules/assets/assets.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { AuthService } from './modules/auth/auth.service';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { LoggerMiddleware } from './middleware/logger.middleware';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'production' ? undefined : '.env',
      ignoreEnvFile: process.env.NODE_ENV === 'production',
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),

    PrismaModule,
    AuthModule,
    DeviceModule,
    AnalyticsModule,
    CampaignModule,
    FleetModule,
    MediaModule,
    AssetsModule,
  ],
  providers: [
    // Global JWT guard — protects ALL routes by default
    // Use @Public() decorator on tablet-facing routes to bypass
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
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
    await this.authService.seedAdminUser();
  }
}

