import { Controller, Get } from '@nestjs/common';
import { Public } from './modules/auth/decorators/public.decorator';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Health')
@Controller()
export class AppController {
  /**
   * Health Check endpoint - Requerido por EasyPanel v10+
   */
  @Get('api/health')
  @Public() // Bypassear el AuthGuard global
  getHealth() {
    return {
      status: 'UP',
      timestamp: new Date().toISOString(),
      service: 'TAD API Gateway',
      version: 'v12-shelter'
    };
  }

  @Get('/')
  @Public()
  getHello() {
    return 'TAD API Gateway v10.1.0 - Active & Ready';
  }
}
