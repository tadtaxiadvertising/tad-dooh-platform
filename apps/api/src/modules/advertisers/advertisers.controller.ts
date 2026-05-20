import { Controller, Get, Post, Put, Delete, Param, Body, BadRequestException, Req, UnauthorizedException, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { AdvertisersService } from './advertisers.service';
import { Public } from '../auth/decorators/public.decorator';
import { Roles, UserRole } from '../auth/decorators/roles.decorator';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { Throttle } from '@nestjs/throttler';

@Controller('advertisers')
export class AdvertisersController {
  constructor(private readonly advertisersService: AdvertisersService) {}

  /**
   * Lista todos los anunciantes — Solo ADMIN
   */
  @Get()
  @Roles(UserRole.ADMIN)
  async findAll() {
    return this.advertisersService.findAll();
  }

  /**
   * Login de anunciante — Rate limited: 5 intentos/min para prevenir fuerza bruta
   */
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
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

  @Public()
  @Post('reset-password')
  async resetPassword(@Body() body: { token: string; newPassword?: string }) {
    if (!body.token || !body.newPassword) {
      throw new BadRequestException('Token and newPassword are required');
    }
    return this.advertisersService.resetPassword(body.token, body.newPassword);
  }

  /**
   * SHELTER C-A1: TenantGuard asegura que solo el dueño o un ADMIN puede ver el registro.
   */
  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.ADVERTISER)
  @UseGuards(TenantGuard)
  async findOne(@Param('id') id: string) {
    const adv = await this.advertisersService.findOne(id);
    if (!adv) throw new BadRequestException('Anunciante no encontrado');
    return adv;
  }

  /**
   * Registro de nuevo anunciante — Rate limited: 3 registros/min
   */
  @Public()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post()
  async create(@Body() body: {
    companyName: string;
    contactName: string;
    email: string;
    phone?: string;
    password?: string;
  }) {
    if (!body.companyName || !body.contactName || !body.email) {
      throw new BadRequestException('companyName, contactName, and email are required');
    }
    return this.advertisersService.create(body);
  }

  /**
   * SHELTER C-A1: Solo el dueño o un ADMIN puede modificar el registro.
   */
  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.ADVERTISER)
  @UseGuards(TenantGuard)
  async update(@Param('id') id: string, @Body() body: any) {
    return this.advertisersService.update(id, body);
  }

  /**
   * Solo un ADMIN puede eliminar un anunciante.
   */
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  async delete(@Param('id') id: string) {
    return this.advertisersService.remove(id);
  }

  /**
   * Portal del anunciante — SHELTER C-A1: TenantGuard verifica propiedad del recurso.
   */
  @Get(':id/portal')
  @Roles(UserRole.ADMIN, UserRole.ADVERTISER)
  @UseGuards(TenantGuard)
  async getPortal(@Param('id') id: string) {
    const data = await this.advertisersService.getPortalData(id);
    if (!data) throw new BadRequestException('Anunciante no encontrado');
    return data;
  }
}
