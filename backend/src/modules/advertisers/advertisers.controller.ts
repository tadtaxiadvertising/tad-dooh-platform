import { Controller, Get, Post, Put, Delete, Param, Body, BadRequestException } from '@nestjs/common';
import { AdvertisersService } from './advertisers.service';

@Controller('advertisers')
export class AdvertisersController {
  constructor(private readonly advertisersService: AdvertisersService) {}

  @Get()
  async findAll() {
    return this.advertisersService.findAll();
  }

  @Post('login')
  async login(@Body() body: { email: string; password?: string }) {
    if (!body.email || !body.password) {
      throw new BadRequestException('email and password are required');
    }
    return this.advertisersService.login(body.email, body.password);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const adv = await this.advertisersService.findOne(id);
    if (!adv) throw new BadRequestException('Anunciante no encontrado');
    return adv;
  }

  @Post()
  async create(@Body() body: {
    companyName: string;
    contactName: string;
    email: string;
    phone?: string;
  }) {
    if (!body.companyName || !body.contactName || !body.email) {
      throw new BadRequestException('companyName, contactName, and email are required');
    }
    return this.advertisersService.create(body);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    return this.advertisersService.update(id, body);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.advertisersService.remove(id);
  }

  @Get(':id/portal')
  async getPortal(@Param('id') id: string) {
    const data = await this.advertisersService.getPortalData(id);
    if (!data) throw new BadRequestException('Anunciante no encontrado');
    return data;
  }
}
