// backend/src/campaigns/campaigns.controller.ts
import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignIntentDto } from './dto/create-campaign-intent.dto';

@Controller('api/campaigns')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Post('intent')
  @HttpCode(HttpStatus.CREATED)
  async createIntent(@Body() createCampaignIntentDto: CreateCampaignIntentDto) {
    return this.campaignsService.createIntent(createCampaignIntentDto);
  }
}
