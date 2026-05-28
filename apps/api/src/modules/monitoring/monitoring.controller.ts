import { Controller, Post, Get, Body, HttpCode, HttpStatus, Logger, UseGuards } from '@nestjs/common';
import { MonitoringService } from './monitoring.service';
import { GpsBatchDto } from './monitoring.dto';
import { Public } from '../auth/decorators/public.decorator';
import { Roles, UserRole } from '../auth/decorators/roles.decorator';

@Controller('monitoring')
export class MonitoringController {
  private readonly logger = new Logger(MonitoringController.name);

  constructor(private readonly monitoringService: MonitoringService) {}

  /**
   * Endpoint para recibir el batch de GPS de las tablets (cada 5 minutos).
   */
  @Public()
  @Post('gps-batch')
  @HttpCode(HttpStatus.OK)
  async saveGpsBatch(@Body() batch: GpsBatchDto) {
    return await this.monitoringService.processGpsBatch(batch);
  }

  /**
   * Endpoint para el dashboard administrativo que solicita el estado de la flota.
   */
  @Public()
  @Get('fleet-status')
  @Roles(UserRole.ADMIN)
  async getFleetStatus() {
    return await this.monitoringService.getFleetStatus();
  }

  /**
   * Endpoint para el estado de campañas activas del piloto.
   */
  @Get('campaigns-status')
  @Roles(UserRole.ADMIN)
  async getCampaignsStatus() {
    return await this.monitoringService.getActiveCampaignsStatus();
  }
}
