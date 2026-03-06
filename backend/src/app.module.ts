import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { DevicesModule } from './devices/devices.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { MediaModule } from './media/media.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { CommandsModule } from './commands/commands.module';
import { SyncModule } from './sync/sync.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Rate limiting (100 requests per minute per device)
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),

    // Feature modules
    DevicesModule,
    CampaignsModule,
    MediaModule,
    AnalyticsModule,
    CommandsModule,
    SyncModule,
  ],
})
export class AppModule {}
