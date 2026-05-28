import { Controller, Get } from '@nestjs/common';
import { Public } from '../modules/auth/decorators/public.decorator';

@Controller('health')
export class HealthController {
  @Get()
  @Public()
  check() {
    // Retornamos 200 OK para el orquestador de Easypanel
    return {
      status: 'up',
      timestamp: new Date().toISOString(),
      service: 'tad-backend-api',
      node_env: process.env.NODE_ENV
    };
  }
}
