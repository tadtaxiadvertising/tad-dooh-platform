import { Controller, Get, Post, Put, Delete, Param, Body, BadRequestException, Req, UnauthorizedException } from '@nestjs/common';
import { AdvertisersService } from './advertisers.service';
import { Public } from '../auth/decorators/public.decorator';
import { Roles, UserRole } from '../auth/decorators/roles.decorator';

@Controller('advertisers')
@Roles(UserRole.ADMIN)
export class AdvertisersController {
  constructor(private readonly advertisersService: AdvertisersService) {}

  @Get()
  async findAll() {
    return this.advertisersService.findAll();
  }

  @Public()
  @Post('login')
  async login(@Body() body: { email: string; password?: string }) {
    if (!body.email || !body.password) {
      throw new BadRequestException('email and password are required');
    }
    return this.advertisersService.login(body.email, body.password);
  }

  @Public()
  @Post('recover-password')
  async recoverPassword(@Body() body: { email: string }) {
    if (!body.email) {
      throw new BadRequestException('Email is required for password recovery');
    }
    return this.advertisersService.recoverPassword(body.email);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const adv = await this.advertisersService.findOne(id);
    if (!adv) throw new BadRequestException('Anunciante no encontrado');
    return adv;
  }

  @Public()
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
  @Roles(UserRole.ADMIN, UserRole.ADVERTISER)
  async getPortal(@Param('id') id: string, @Req() req: any) {
    const user = req.user;
    
    // RBAC: Solo el anunciante dueño del ID o un ADMIN pueden ver el portal
    if (user.role !== UserRole.ADMIN && user.entityId !== id) {
      throw new UnauthorizedException('No tienes permiso para acceder a este portal de anunciante.');
    }

    const data = await this.advertisersService.getPortalData(id);
    if (!data) throw new BadRequestException('Anunciante no encontrado');
    return data;
  }
}
