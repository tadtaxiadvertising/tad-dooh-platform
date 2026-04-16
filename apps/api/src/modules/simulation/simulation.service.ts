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
  useRealStreets?: boolean;
}

// Vehículo con capacidad de navegación por rutas reales
class VirtualVehicle {
  lat: number;
  lng: number;
  heading: number;
  speed: number;
  path: [number, number][] = [];
  pathIndex: number = 0;
  isRouting: boolean = false;

  constructor(lat: number, lng: number) {
    this.lat = lat;
    this.lng = lng;
    this.heading = Math.random() * 360;
    this.speed = 0;
  }

  // Mueve el vehículo un paso hacia el siguiente nodo de la ruta o de forma aleatoria si no hay ruta
  async move(
    timeDeltaSecs: number,
    minSpeed: number,
    maxSpeed: number,
    centerLat: number,
    centerLng: number,
    radiusKm: number,
    useRealStreets: boolean
  ) {
    // 1. Si tenemos una ruta y estamos en modo calles, seguimos los nodos
    if (useRealStreets && this.path.length > 0 && this.pathIndex < this.path.length) {
      const target = this.path[this.pathIndex];
      const dist = this.getDistance(this.lat, this.lng, target[1], target[0]);

      // Velocidad actual simula aceleración/frenado
      this.speed = minSpeed + Math.random() * (maxSpeed - minSpeed);
      const stepDist = (this.speed / 3600) * timeDeltaSecs;

      if (dist < stepDist) {
        // Llegamos al nodo, saltamos al siguiente
        this.lat = target[1];
        this.lng = target[0];
        this.pathIndex++;
      } else {
        // Interpolación hacia el nodo
        const ratio = stepDist / dist;
        this.lat = this.lat + (target[1] - this.lat) * ratio;
        this.lng = this.lng + (target[0] - this.lng) * ratio;
        
        // Actualizar heading para que el icono mire hacia donde va
        this.heading = Math.atan2(target[0] - this.lng, target[1] - this.lat) * (180 / Math.PI);
      }
    } else {
      // 2. Fallback: Movimiento tradicional (drunk walk) si no hay ruta o modo libre
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

      // Contención circular
      const distFromCenter = this.getDistance(this.lat, this.lng, centerLat, centerLng);
      if (distFromCenter > radiusKm) {
        this.heading = Math.atan2(centerLng - this.lng, centerLat - this.lat) * (180 / Math.PI);
      }
      
      this.isRouting = false; // Reset routing flag for next attempt
    }
  }

  private getDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLng = (lng2 - lng1) * (Math.PI / 180);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * (Math.PI/180)) * Math.cos(lat2 * (Math.PI/180)) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
}

@Injectable()
export class SimulationService {
  private readonly logger = new Logger(SimulationService.name);
  private isRunning = false;
  private currentScenario: ScenarioConfig | null = null;
  private fleetState: Map<string, { vehicle: VirtualVehicle; deviceId: string }> = new Map();

  constructor(
    private prisma: PrismaService,
    private analytics: AnalyticsService
  ) {}

  getState() {
    return {
      isRunning: this.isRunning,
      currentScenario: this.currentScenario,
      fleetCount: this.fleetState.size,
    };
  }

  async loadScenario(config: ScenarioConfig) {
    try {
      this.logger.log(`🎬 Cargando escenario: "${config.name}" con navegación por CALLES activa...`);
      this.currentScenario = { ...config, useRealStreets: true };

      // Limpiar datos anteriores
      await this.clearTestData(false);

      for (let i = 0; i < config.activeNodes; i++) {
        const paddedId = String(i).padStart(4, '0');
        const driverId = `SIM_DRV_${paddedId}`;
        const deviceId = `STI-SIM-${paddedId}`;
        
        const initialLat = config.centerLat + (Math.random() - 0.5) * (config.radiusKm / 111);
        const initialLng = config.centerLng + (Math.random() - 0.5) * (config.radiusKm / 111);

        const vehicle = new VirtualVehicle(initialLat, initialLng);
        this.fleetState.set(driverId, { vehicle, deviceId });

        await this.prisma.driver.upsert({
          where: { id: driverId },
          update: { status: 'ACTIVE', isSimulated: true },
          create: {
            id: driverId,
            fullName: `Virtual Pilot ${paddedId}`,
            phone: `+185500${paddedId}`,
            licensePlate: `SIM-${paddedId}`,
            isSimulated: true,
            status: 'ACTIVE',
            subscriptionPaid: true,
            subscriptionEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            onboardingStatus: 'COMPLETED',
          },
        });

        await this.prisma.device.upsert({
          where: { deviceId },
          update: { status: 'ACTIVE', isSimulated: true, isOnline: true, lastLat: initialLat, lastLng: initialLng },
          create: {
            deviceId,
            name: `Virtual Screen ${paddedId}`,
            status: 'ACTIVE',
            isOnline: true,
            isSimulated: true,
            driverId,
            taxiNumber: `TX-${paddedId}`,
            city: 'Santiago',
            lastLat: initialLat,
            lastLng: initialLng,
          },
        });
      }

      this.isRunning = true;
      this.logger.log(`✅ ${this.fleetState.size} taxis virtuales desplegados en las calles de Santiago.`);
    } catch (error: any) {
      this.logger.error(`Error en Simulador: ${error.message}`);
      throw new InternalServerErrorException(error.message);
    }
  }

  @Interval(15000) // Ticks cada 15 seg para telemetría densa
  async handleSimulationTick() {
    if (!this.isRunning || !this.currentScenario) return;

    const useStreets = this.currentScenario.useRealStreets !== false;
    const batch: any[] = [];
    const timestamp = new Date();

    for (const [driverId, state] of this.fleetState.entries()) {
      const { vehicle, deviceId } = state;

      // Si no tenemos ruta o terminamos la ruta, pedimos una nueva (background)
      if (useStreets && !vehicle.isRouting && (vehicle.path.length === 0 || vehicle.pathIndex >= vehicle.path.length)) {
        this.fetchNewRoute(vehicle, this.currentScenario);
      }

      await vehicle.move(
        30,
        this.currentScenario.minSpeed,
        this.currentScenario.maxSpeed,
        this.currentScenario.centerLat,
        this.currentScenario.centerLng,
        this.currentScenario.radiusKm,
        useStreets
      );

      batch.push({
        driverId,
        deviceId,
        latitude: vehicle.lat,
        longitude: vehicle.lng,
        speed: vehicle.speed,
        isSimulated: true,
        timestamp,
      });
    }

    try {
      // PRO TIP: Actualización masiva de telemetría
      await this.prisma.driverLocation.createMany({ data: batch, skipDuplicates: true });
      
      // Actualizar vista rápida de devices para el mapa
      for (const item of batch) {
          await this.prisma.device.update({
              where: { deviceId: item.deviceId },
              data: { lastLat: item.latitude, lastLng: item.longitude, lastSeen: timestamp }
          }).catch(() => {});
      }
    } catch (err) {
      this.logger.error('Error in simulation tick');
    }
  }

  // Lógica de enrutamiento OSRM para mover taxis por las calles
  private async fetchNewRoute(vehicle: VirtualVehicle, config: ScenarioConfig) {
    vehicle.isRouting = true;
    try {
      // Elegir destino aleatorio dentro del radio
      const destLat = config.centerLat + (Math.random() - 0.5) * (config.radiusKm / 111);
      const destLng = config.centerLng + (Math.random() - 0.5) * (config.radiusKm / 111);

      const url = `http://router.project-osrm.org/route/v1/driving/${vehicle.lng},${vehicle.lat};${destLng},${destLat}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.code === 'Ok' && data.routes && data.routes[0]) {
        vehicle.path = data.routes[0].geometry.coordinates; // Array of [lng, lat]
        vehicle.pathIndex = 0;
        this.logger.debug(`Ruta trazada para ${vehicle.lat},${vehicle.lng} -> ${destLat},${destLng}`);
      }
    } catch (e) {
      this.logger.warn('OSRM Route service unavailable, using random walk fallback.');
    } finally {
      vehicle.isRouting = false;
    }
  }

  async stopSimulation() {
    this.isRunning = false;
    return { success: true };
  }

  async clearTestData(resetFleet = true) {
    this.logger.log('🧹 Iniciando purga profunda de datos de simulación...');
    
    if (resetFleet) {
      this.isRunning = false;
      this.fleetState.clear();
      this.currentScenario = null;
    }

    try {
      // 1. Borrar datos atómicos primero (Foreign Key safety)
      const whereSim = { where: { isSimulated: true } };
      
      await this.prisma.driverLocation.deleteMany(whereSim).catch(() => {});
      await this.prisma.playbackEvent.deleteMany(whereSim).catch(() => {});
      await this.prisma.analyticsEvent.deleteMany(whereSim).catch(() => {});
      await this.prisma.subscription.deleteMany(whereSim).catch(() => {});
      await this.prisma.deviceCommand.deleteMany({ where: { device: { isSimulated: true } } }).catch(() => {});
      await this.prisma.notification.deleteMany({ where: { message: { contains: 'Virtual' } } }).catch(() => {});
      
      // 2. Borrar entidades principales
      await this.prisma.device.deleteMany(whereSim).catch(() => {});
      await this.prisma.driver.deleteMany(whereSim).catch(() => {});
      
      // 3. Limpiar caché del servicio de analíticas
      this.analytics.clearCache();

      // 4. Refrescar vistas materializadas para el Admin
      const viewsToRefresh = [
        'mv_fleet_health', 
        'mv_impressions_daily', 
        'mv_campaign_performance'
      ];

      for (const view of viewsToRefresh) {
        try {
          await this.prisma.$executeRawUnsafe(`REFRESH MATERIALIZED VIEW ${view}`);
          this.logger.log(`✅ Vista ${view} refrescada.`);
        } catch (e) {
          // Si falla sin CONCURRENTLY, intentar CONCURRENTLY o ignorar si no existe
          try {
             await this.prisma.$executeRawUnsafe(`REFRESH MATERIALIZED VIEW CONCURRENTLY ${view}`);
          } catch (err) {}
        }
      }

      this.logger.log('✨ Purga de simulación completada. El Admin debería estar limpio.');
      return { success: true };
    } catch (err: any) {
      this.logger.error(`❌ Error durante purga: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  async updateConfig(config: Partial<ScenarioConfig>) {
    if (this.currentScenario) {
      this.currentScenario = { ...this.currentScenario, ...config };
    }
  }
}
