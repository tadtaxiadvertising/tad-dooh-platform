import { Module } from '@nestjs/common';
import { CampaignService } from './campaign.service';
import { CampaignController } from './campaign.controller';

@Module({
  controllers: [CampaignController],
  providers: [CampaignService],
  exports: [CampaignService], // export the service so DeviceModule can use it to fetch sync data
})
export class CampaignModule {}
