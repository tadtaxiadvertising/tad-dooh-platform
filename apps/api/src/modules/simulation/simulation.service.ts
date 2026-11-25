import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Interval } from "@nestjs/schedule";

export interface ScenarioConfig {
  name: string;
  activeNodes: number;
  centerLat: number; // Default: 19.4517 (Santiago)
  centerLng: number; // Default: -70.6970 (Santiago)
  radiusKm: number;
  minSpeed: number;
  maxSpeed: number;
  anomalyRate: number; // % de vehículos que reportan errores o se detienen
}

// Clase interna para mantener el estado realista del movimiento
class VirtualVehicle {
  lat: number;
  lng: number;
  heading: number; // Grados 0-360
  speed: number;

  constructor(lat: number, lng: number) {
    this.lat = lat;
    this.lng = lng;
    this.heading = Math.random() * 360;
    this.speed = 0;
  }

  // Mueve el vehículo basándose en velocidad y tiempo transcurrido (simplificado)
  move(
    timeDeltaSecs: number,
    minSpeed: number,
    maxSpeed: number,
    centerLat: number,
    centerLng: number,
    radiusKm: number,
  ) {
    // Variación aleatoria de velocidad y dirección
    this.speed = minSpeed + Math.random() * (maxSpeed - minSpeed);
    this.heading += (Math.random() - 0.5) * 45; // Gira hasta 22.5 grados por tick

    const distanceKm = (this.speed / 3600) * timeDeltaSecs;
    const radiusEarthKm = 6371;

    // Fórmulas de destino Haversine
    const lat1 = this.lat * (Math.PI / 180);
    const lng1 = this.lng * (Math.PI / 180);
    const brng = this.heading * (Math.PI / 180);

    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(distanceKm / radiusEarthKm) +
        Math.cos(lat1) * Math.sin(distanceKm / radiusEarthKm) * Math.cos(brng),
    );
    const lng2 =
      lng1 +
      Math.atan2(
        Math.sin(brng) * Math.sin(distanceKm / radiusEarthKm) * Math.cos(lat1),
        Math.cos(distanceKm / radiusEarthKm) - Math.sin(lat1) * Math.sin(lat2),
      );

    this.lat = lat2 * (180 / Math.PI);
    this.lng = lng2 * (180 / Math.PI);

    // Lógica de contención (Si se sale del radio, apuntar hacia el centro de Santiago)
    const distFromCenter =
      Math.sqrt(
        Math.pow(this.lat - centerLat, 2) + Math.pow(this.lng - centerLng, 2),
      ) * 111; // aprox km
    if (distFromCenter > radiusKm) {
      this.heading =
        Math.atan2(centerLng - this.lng, centerLat - this.lat) *
        (180 / Math.PI);
    }
  }
}

@Injectable()
export class SimulationService {
  private readonly logger = new Logger(SimulationService.name);
  private isRunning = false;
  private currentScenario: ScenarioConfig | null = null;
  private fleetState: Map<
    string,
    { vehicle: VirtualVehicle; deviceId: string }
  > = new Map();

  constructor(private prisma: PrismaService) {}

  getState() {
    return {
      isRunning: this.isRunning,
      currentScenario: this.currentScenario,
      fleetCount: this.fleetState.size,
    };
  }

  // Endpoint para inyectar un escenario desde el Panel de Control
  async loadScenario(config: ScenarioConfig) {
    this.logger.log(`Cargando escenario: ${config.name} en Santiago...`);
    this.currentScenario = config;
    await this.clearTestData(); // Limpiamos BD previa

    // Generar Nodos
    for (let i = 0; i < config.activeNodes; i++) {
      const deviceId = `SIM-DEV-${String(i).padStart(4, "0")}`;
      const driver = await this.prisma.driver.create({
        include: { devices: { select: { id: true } } },
        data: {
          fullName: `Santiago Test Driver ${i}`,
          phone: `+1809sim${String(i).padStart(4, "0")}`,
          isSimulated: true,
          status: "OPERATIVO",
          licensePlate: `STI-TEST-${i}`,
          devices: {
            create: {
              deviceId: deviceId,
              name: `Virtual Screen ${i}`,
              status: "OPERATIVO",
              isSimulated: true,
            },
          },
        },
      });
      // Inicializar estado del vehículo disperso alrededor del centro
      const initialLat =
        config.centerLat + (Math.random() - 0.5) * (config.radiusKm / 111);
      const initialLng =
        config.centerLng + (Math.random() - 0.5) * (config.radiusKm / 111);
      this.fleetState.set(driver.id, {
        vehicle: new VirtualVehicle(initialLat, initialLng),
        deviceId: driver.devices[0].id,
      });
    }
    this.isRunning = true;
  }

  @Interval(30000)
  async handleSimulationTick() {
    if (!this.isRunning || !this.currentScenario) return;

    const telemetryBatch = [];
    const timestamp = new Date();

    for (const [driverId, state] of this.fleetState.entries()) {
      const { vehicle, deviceId } = state;
      // Simular anomalías (Ej: 2% de probabilidad de detenerse o apagar GPS)
      const isAnomaly = Math.random() < this.currentScenario.anomalyRate;

      if (!isAnomaly) {
        vehicle.move(
          30,
          this.currentScenario.minSpeed,
          this.currentScenario.maxSpeed,
          this.currentScenario.centerLat,
          this.currentScenario.centerLng,
          this.currentScenario.radiusKm,
        );
      }

      telemetryBatch.push({
        driverId,
        deviceId: deviceId,
        latitude: vehicle.lat,
        longitude: vehicle.lng,
        speed: isAnomaly ? 0 : vehicle.speed,
        isSimulated: true,
        timestamp,
      });
    }

    // Batch Insert optimizado para el VPS
    await this.prisma.driverLocation.createMany({ data: telemetryBatch });
    this.logger.log(`Batch STI inyectado: ${telemetryBatch.length} registros.`);
  }

  async stopSimulation() {
    this.isRunning = false;
    this.logger.log("Simulación detenida.");
    return { success: true };
  }

  async clearTestData() {
    this.isRunning = false;
    this.fleetState.clear();
    await this.prisma.driverLocation.deleteMany({
      where: { isSimulated: true },
    });
    await this.prisma.device.deleteMany({ where: { isSimulated: true } });
    await this.prisma.driver.deleteMany({ where: { isSimulated: true } });
  }
}
