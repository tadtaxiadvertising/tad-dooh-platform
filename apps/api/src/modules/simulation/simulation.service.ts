import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Interval } from '@nestjs/schedule';

export interface ScenarioConfig {
  name: string;
  activeNodes: number;
  centerLat: number;
  centerLng: number;
  radiusKm: number;
  minSpeed: number;
  maxSpeed: number;
  anomalyRate: number;
}

// Mantiene el estado realista del movimiento de cada vehículo virtual
class VirtualVehicle {
  lat: number;
  lng: number;
  heading: number;
  speed: number;

  constructor(lat: number, lng: number) {
    this.lat = lat;
    this.lng = lng;
    this.heading = Math.random() * 360;
    this.speed = 0;
  }

  move(
    timeDeltaSecs: number,
    minSpeed: number,
    maxSpeed: number,
    centerLat: number,
    centerLng: number,
    radiusKm: number,
  ) {
    this.speed = minSpeed + Math.random() * (maxSpeed - minSpeed);
    this.heading += (Math.random() - 0.5) * 45;

    const distanceKm = (this.speed / 3600) * timeDeltaSecs;
    const radiusEarthKm = 6371;
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

    // Contención: Si se sale del radio, apunta hacia el centro
    const distFromCenter =
      Math.sqrt(
        Math.pow(this.lat - centerLat, 2) + Math.pow(this.lng - centerLng, 2),
      ) * 111;
    if (distFromCenter > radiusKm) {
      this.heading =
        Math.atan2(centerLng - this.lng, centerLat - this.lat) * (180 / Math.PI);
    }
  }
}

@Injectable()
export class SimulationService {
  private readonly logger = new Logger(SimulationService.name);
  private isRunning = false;
  private currentScenario: ScenarioConfig | null = null;
  private fleetState: Map<string, { vehicle: VirtualVehicle; deviceId: string }> = new Map();

  constructor(private prisma: PrismaService) {}

  getState() {
    return {
      isRunning: this.isRunning,
      currentScenario: this.currentScenario,
      fleetCount: this.fleetState.size,
    };
  }

  async loadScenario(config: ScenarioConfig) {
    try {
      // 1. Validar que existan campañas activas primero (Evita 500 si la DB está vacía)
      const campaigns = await this.prisma.campaign.findMany({ where: { status: 'ACTIVE' } });
      if (campaigns.length === 0) {
        throw new Error("No hay campañas ACTIVAS para simular. Crea una pauta primero en el Admin.");
      }
      
      // 2. Validar conductores registrados (Prerrequisito de infraestructura)
      const drivers = await this.prisma.driver.findMany();
      if (drivers.length === 0) {
        throw new Error("No hay conductores registrados en el sistema para asignar pantallas virtuales.");
      }

      this.logger.log(`🎬 Cargando escenario: "${config.name}" (${config.activeNodes} nodos)...`);
    this.currentScenario = config;

    // Limpiar datos anteriores antes de empezar
    await this.clearTestData(false);

    const errors: string[] = [];

    for (let i = 0; i < config.activeNodes; i++) {
      const paddedId = String(i).padStart(4, '0');
      const driverId = `SIM_DRV_${paddedId}`;
      const deviceId = `STI-SIM-${paddedId}`;
      const taxiNumber = `TX-${paddedId}`;
      const phone = `+185500${paddedId}`;
      const licensePlate = `SIM-${paddedId}`;

      try {
        // Inicializar estado del vehículo ANTES del upsert para persistir coordenadas
        const initialLat = config.centerLat + (Math.random() - 0.5) * (config.radiusKm / 111);
        const initialLng = config.centerLng + (Math.random() - 0.5) * (config.radiusKm / 111);

        this.fleetState.set(driverId, {
          vehicle: new VirtualVehicle(initialLat, initialLng),
          deviceId,
        });

        // UPSERT para evitar violación de UNIQUE en phone/cedula al re-cargar escenario
        await this.prisma.driver.upsert({
          where: { id: driverId },
          update: {
            status: 'ACTIVE',
            isSimulated: true,
            subscriptionPaid: true,
            subscriptionEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
          create: {
            id: driverId,
            fullName: `Virtual Pilot ${paddedId}`,
            phone,
            licensePlate,
            isSimulated: true,
            status: 'ACTIVE',
            subscriptionPaid: true,
            subscriptionEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            onboardingStatus: 'COMPLETED',
          },
        });

        // UPSERT Device con coordenadas iniciales (Crucial para el mapa!)
        await this.prisma.device.upsert({
          where: { deviceId },
          update: { 
            status: 'ACTIVE', 
            isSimulated: true, 
            isOnline: true, 
            taxiNumber,
            lastLat: initialLat,
            lastLng: initialLng,
            lastSeen: new Date()
          },
          create: {
            deviceId,
            name: `Virtual Screen ${paddedId}`,
            status: 'ACTIVE',
            isOnline: true,
            isSimulated: true,
            driverId,
            taxiNumber,
            city: 'Santiago',
            lastLat: initialLat,
            lastLng: initialLng,
            lastSeen: new Date()
          },
        });
      } catch (err: any) {
        const msg = `Nodo ${paddedId}: ${err.message}`;
        this.logger.error(`❌ [Simulation] Error aprovisionando ${msg}`);
        errors.push(msg);
      }
    }

    this.isRunning = true;

    if (errors.length > 0) {
      this.logger.warn(
        `⚠️ Escenario cargado con ${this.fleetState.size}/${config.activeNodes} nodos. ` +
          `Errores: ${errors.length}`,
      );
    } else {
      this.logger.log(
        `✅ Escenario "${config.name}" activo con ${this.fleetState.size} nodos.`,
      );
    }
    } catch (error: any) {
      this.logger.error(`Error en Simulador: ${error.message}`);
      throw new InternalServerErrorException(error.message);
    }
  }

  @Interval(30000)
  async handleSimulationTick() {
    if (!this.isRunning || !this.currentScenario) return;

    const telemetryBatch: Array<{
      driverId: string;
      deviceId: string;
      latitude: number;
      longitude: number;
      speed: number;
      isSimulated: boolean;
      timestamp: Date;
    }> = [];

    const timestamp = new Date();

    for (const [driverId, state] of this.fleetState.entries()) {
      const { vehicle, deviceId } = state;
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
        deviceId,
        latitude: vehicle.lat,
        longitude: vehicle.lng,
        speed: isAnomaly ? 0 : vehicle.speed,
        isSimulated: true,
        timestamp,
      });
    }

    if (telemetryBatch.length === 0) return;

    try {
      // PRO TIP: Direct update into Device table for guaranteed real-time visibility
      for (const batchItem of telemetryBatch) {
        await this.prisma.device.update({
             where: { deviceId: batchItem.deviceId },
             data: {
               lastLat: batchItem.latitude,
               lastLng: batchItem.longitude,
               lastSeen: batchItem.timestamp,
               isOnline: true
             }
        }).catch(() => {/* silenciar si el device fue purgado */});
      }

      await this.prisma.driverLocation.createMany({
        data: telemetryBatch,
        skipDuplicates: true,
      });
      this.logger.log(`📡 Tick STI-SIM: ${telemetryBatch.length} registros inyectados.`);
    } catch (err: any) {
      this.logger.error(`❌ Error en tick de telemetría: ${err.message}`);
    }
  }

  async stopSimulation() {
    this.isRunning = false;
    this.logger.log('⏹️ Simulación detenida.');
    return { success: true };
  }

  /**
   * Elimina TODOS los datos de simulación de la BD.
   * @param resetFleet Si true, también limpia el estado en memoria (default: true)
   */
  async clearTestData(resetFleet = true) {
    if (resetFleet) {
      this.isRunning = false;
      this.fleetState.clear();
    }

    try {
      // Orden de borrado: primero tablas dependientes, luego tablas padre
      await this.prisma.driverLocation.deleteMany({ where: { isSimulated: true } })
        .catch(() => {/* silenciar si no hay registros */});
      await this.prisma.playbackEvent.deleteMany({ where: { isSimulated: true } })
        .catch(() => {});
      await this.prisma.analyticsEvent.deleteMany({ where: { isSimulated: true } })
        .catch(() => {});
      await this.prisma.subscription.deleteMany({ where: { isSimulated: true } })
        .catch(() => {});
      await this.prisma.device.deleteMany({ where: { isSimulated: true } })
        .catch(() => {});
      await this.prisma.driver.deleteMany({ where: { isSimulated: true } })
        .catch(() => {});

      this.logger.log('🧹 Datos de simulación purgados correctamente.');
    } catch (err: any) {
      this.logger.error(`❌ Error durante purga de datos: ${err.message}`);
      throw err;
    }
  }

  /**
   * Actualiza la configuración del escenario actual en caliente.
   */
  async updateConfig(config: Partial<ScenarioConfig>) {
    if (!this.currentScenario) {
      this.logger.warn('⚠️ Intento de actualizar configuración sin escenario activo.');
      return;
    }
    this.currentScenario = { ...this.currentScenario, ...config };
    this.logger.log(`⚙️ Configuración de escenario "${this.currentScenario.name}" actualizada.`);
  }
}
