import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { PortalRequestsService } from './portal-requests.service';
import { Public } from '../auth/decorators/public.decorator';

@Controller('portal-requests')
export class PortalRequestsController {
  constructor(private readonly portalRequestsService: PortalRequestsService) {}

  @Post()
  @Public() // Allow advertisers to submit requests (they'll send their advertiserId)
  async create(@Body() body: any) {
    return this.portalRequestsService.create(body);
  }

  @Get()
  async findAll() {
    return this.portalRequestsService.findAll();
  }

  @Get('advertiser/:advertiserId')
  @Public() // Allow advertisers to see their own requests
  async findByAdvertiser(@Param('advertiserId') advertiserId: string) {
    return this.portalRequestsService.findByAdvertiser(advertiserId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.portalRequestsService.findOne(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    return this.portalRequestsService.update(id, body);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.portalRequestsService.remove(id);
  }
}
