import { Controller, Post, Body, Delete } from '@nestjs/common';
import { SimulationService, ScenarioConfig } from './simulation.service';

@Controller('api/simulation')
export class SimulationController {
  constructor(private readonly simService: SimulationService) {}

  @Post('scenario')
  async startScenario(@Body() config: Partial<ScenarioConfig>) {
    const defaultSantiagoScenario: ScenarioConfig = {
      name: config.name || "Santiago Default",
      activeNodes: config.activeNodes || 50,
      centerLat: config.centerLat || 19.4517, // Monumento Santiago
      centerLng: config.centerLng || -70.6970,
      radiusKm: config.radiusKm || 8, // Cubre el área metropolitana de STI
      minSpeed: config.minSpeed || 15,
      maxSpeed: config.maxSpeed || 60,
      anomalyRate: config.anomalyRate || 0.02,
    };
    
    await this.simService.loadScenario(defaultSantiagoScenario);
    return { success: true, message: `Escenario ${defaultSantiagoScenario.name} iniciado en Santiago.` };
  }

  @Delete('purge')
  async stopAndPurge() {
    await this.simService.clearTestData();
    return { success: true, message: 'Datos de prueba eliminados. Entorno limpio.' };
  }
}
