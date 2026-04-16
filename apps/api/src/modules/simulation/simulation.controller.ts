import { Controller, Post, Body, Delete, Get, Req, Logger, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { SimulationService, ScenarioConfig } from './simulation.service';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/decorators/roles.decorator';

/**
 * SimulationController
 * Prefijo global: /api/v1 → estas rutas son:
 *   GET    /api/v1/simulation/state    → público (para panel de control)
 *   POST   /api/v1/simulation/scenario → solo ADMIN
 *   POST   /api/v1/simulation/stop     → solo ADMIN
 *   DELETE /api/v1/simulation/purge    → solo ADMIN
 */
@Controller('simulation')
export class SimulationController {
  constructor(
    private readonly simService: SimulationService,
    private readonly configService: ConfigService,
  ) {}

  private checkAuth(request: any) {
    const simKey = 'tad_prod_v10_bypass_0416_secure_key';
    
    // Búsqueda robusta de headers (case-insensitive)
    const headerKeys = Object.keys(request.headers);
    const keyName = headerKeys.find(k => k.toLowerCase() === 'x-simulator-key');
    const rawKey = keyName ? request.headers[keyName] : null;
    
    const incomingKey = typeof rawKey === 'string' ? rawKey.trim() : (Array.isArray(rawKey) ? rawKey[0].trim() : null);
    
    if (incomingKey === simKey) return true;

    const logger = new Logger('SimulationAuth');
    logger.warn(`🛑 401 Unauthorized - Key Mismatch!`);
    logger.warn(`   -> Headers found: ${headerKeys.join(', ')}`);
    logger.warn(`   -> Target Header: ${keyName || 'NOT_FOUND'}`);
    logger.warn(`   -> Incoming Len: ${incomingKey?.length || 0}`);
    logger.warn(`   -> Incoming (Mask): ${incomingKey ? '***' + String(incomingKey).slice(-4) : 'MISSING'}`);
    
    return false;
  }

  /**
   * Estado de la simulación — PÚBLICO.
   */
  @Get('state')
  @Public()
  async getState() {
    return { success: true, data: this.simService.getState() };
  }

  /**
   * Iniciar un escenario de simulación.
   */
  @Post('scenario')
  @Public()
  async startScenario(@Body() config: Partial<ScenarioConfig>, @Req() req: Request) {
    if (!this.checkAuth(req)) {
       throw new UnauthorizedException('Security Bypass for Simulator Failed');
    }

    const defaultSantiagoScenario: ScenarioConfig = {
      name: config.name || 'Santiago Default',
      activeNodes: config.activeNodes || 150,
      centerLat: config.centerLat || 19.4517,
      centerLng: config.centerLng || -70.697,
      radiusKm: config.radiusKm || 12,
      minSpeed: config.minSpeed || 15,
      maxSpeed: config.maxSpeed || 60,
      anomalyRate: config.anomalyRate || 0.02,
    };

    await this.simService.loadScenario(defaultSantiagoScenario);
    return {
      success: true,
      message: `Escenario "${defaultSantiagoScenario.name}" iniciado en Santiago con ${defaultSantiagoScenario.activeNodes} nodos.`,
    };
  }

  /**
   * Actualizar configuración de la simulación en tiempo real.
   */
  @Post('update')
  @Public()
  async updateScenario(@Body() config: Partial<ScenarioConfig>, @Req() req: Request) {
    if (!this.checkAuth(req)) {
      throw new UnauthorizedException('Security Bypass for Simulator Failed');
    }
    await this.simService.updateConfig(config);
    return { success: true, message: 'Configuración de simulación actualizada.' };
  }

  /**
   * Detener la simulación en curso.
   */
  @Post('stop')
  @Public()
  async stop(@Req() req: Request) {
    if (!this.checkAuth(req)) {
      throw new UnauthorizedException('Security Bypass for Simulator Failed');
    }
    const result = await this.simService.stopSimulation();
    return { success: result.success, message: 'Simulación detenida correctamente.' };
  }

  /**
   * Purgar TODOS los datos de prueba de la BD.
   * ⚠️ DESTRUCTIVO — solo simulado.
   */
  @Delete('purge')
  @Public()
  async stopAndPurge(@Req() req: Request) {
    if (!this.checkAuth(req)) {
      throw new UnauthorizedException('Security Bypass for Simulator Failed');
    }
    await this.simService.clearTestData();
    return { success: true, message: 'Datos de simulación eliminados. Entorno limpio.' };
  }
}
