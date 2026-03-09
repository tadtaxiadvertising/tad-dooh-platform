import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { CampaignService } from './campaign.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { AddMediaAssetDto } from './dto/add-media-asset.dto';

@Controller('campaigns')
export class CampaignController {
  constructor(private readonly campaignService: CampaignService) {}

  @Post()
  async createCampaign(@Body() dto: CreateCampaignDto) {
    return this.campaignService.createCampaign(dto);
  }

  @Post(':id/assets')
  async addMediaAsset(@Param('id') id: string, @Body() dto: AddMediaAssetDto) {
    return this.campaignService.addMediaAsset(id, dto);
  }

  @Get()
  async getAllCampaigns() {
    return this.campaignService.getAllCampaigns();
  }

  @Get(':id')
  async getCampaignById(@Param('id') id: string) {
    return this.campaignService.getCampaignById(id);
  }

  @Post(':id/assign')
  async assignToDevices(@Param('id') id: string, @Body('deviceIds') deviceIds: string[]) {
    return this.campaignService.assignCampaignToDevices(id, deviceIds);
  }
}
