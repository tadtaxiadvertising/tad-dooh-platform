import { Module } from '@nestjs/common';
import { DeviceController } from './device.controller';
import { DeviceService } from './device.service';
import { CampaignModule } from '../campaign/campaign.module';

@Module({
  imports: [CampaignModule],
  controllers: [DeviceController],
  providers: [DeviceService],
})
export class DeviceModule {}
