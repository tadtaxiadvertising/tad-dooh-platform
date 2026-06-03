import { Module } from '@nestjs/common';
import { CampaignService } from './campaign.service';
import { CampaignController } from './campaign.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { MediaModule } from '../media/media.module';
import { ReferralModule } from '../referral/referral.module';
import { VideoGeneratorService } from './video-generator.service';

@Module({
  imports: [PrismaModule, MediaModule, ReferralModule],
  controllers: [CampaignController],
  providers: [CampaignService, VideoGeneratorService],
  exports: [CampaignService, VideoGeneratorService],
})
export class CampaignModule { }