import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { DeviceModule } from './modules/device/device.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { CampaignModule } from './modules/campaign/campaign.module';
import { FleetModule } from './modules/fleet/fleet.module';
import { MediaModule } from './modules/media/media.module';
import { AssetsModule } from './modules/assets/assets.module';
import { PrismaModule } from './modules/prisma/prisma.module';
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
    DeviceModule,
    AnalyticsModule,
    CampaignModule,
    FleetModule,
    MediaModule,
    AssetsModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply LoggerMiddleware to all routes under /api/
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
