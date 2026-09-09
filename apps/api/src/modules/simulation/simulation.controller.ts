import { Controller, Post, Body, Delete, Get } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { SimulationService, ScenarioConfig } from "./simulation.service";
import { Public } from "../auth/decorators/public.decorator";

@SkipThrottle()
@Public()
@Controller("simulation")
export class SimulationController {
  constructor(private readonly simService: SimulationService) {}

  @Get("state")
  async getState() {
    return { success: true, data: this.simService.getState() };
  }

  @Post("scenario")
  async startScenario(@Body() config: Partial<ScenarioConfig>) {
    const defaultSantiagoScenario: ScenarioConfig = {
      name: config.name || "Santiago Default",
      activeNodes: config.activeNodes || 50,
      centerLat: config.centerLat || 19.4517, // Monumento Santiago
      centerLng: config.centerLng || -70.697,
      radiusKm: config.radiusKm || 8, // Cubre el área metropolitana de STI
      minSpeed: config.minSpeed || 15,
      maxSpeed: config.maxSpeed || 60,
      anomalyRate: config.anomalyRate || 0.02,
    };

    await this.simService.loadScenario(defaultSantiagoScenario);
    return {
      success: true,
      message: `Escenario ${defaultSantiagoScenario.name} iniciado en Santiago.`,
    };
  }

  @Post("stop")
  async stop() {
    await this.simService.stopSimulation();
    return { success: true, message: "Simulación detenida." };
  }

  @Delete("purge")
  async stopAndPurge() {
    await this.simService.clearTestData();
    return {
      success: true,
      message: "Datos de prueba eliminados. Entorno limpio.",
    };
  }
}
