import { Module } from '@nestjs/common';
import { DeviceController } from './device.controller';
import { DeviceService } from './device.service';
import { CampaignModule } from '../campaign/campaign.module';
import { FinanceModule } from '../finance/finance.module';
import { DeviceAdminController } from './device-admin.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [CampaignModule, FinanceModule, PrismaModule],
  controllers: [DeviceController, DeviceAdminController],
  providers: [DeviceService],
})
export class DeviceModule {}
