"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var SimulationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimulationService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const schedule_1 = require("@nestjs/schedule");
class VirtualVehicle {
    constructor(lat, lng) {
        this.lat = lat;
        this.lng = lng;
        this.heading = Math.random() * 360;
        this.speed = 0;
    }
    move(timeDeltaSecs, minSpeed, maxSpeed, centerLat, centerLng, radiusKm) {
        this.speed = minSpeed + Math.random() * (maxSpeed - minSpeed);
        this.heading += (Math.random() - 0.5) * 45;
        const distanceKm = (this.speed / 3600) * timeDeltaSecs;
        const radiusEarthKm = 6371;
        const lat1 = this.lat * (Math.PI / 180);
        const lng1 = this.lng * (Math.PI / 180);
        const brng = this.heading * (Math.PI / 180);
        let lat2 = Math.asin(Math.sin(lat1) * Math.cos(distanceKm / radiusEarthKm) +
            Math.cos(lat1) * Math.sin(distanceKm / radiusEarthKm) * Math.cos(brng));
        let lng2 = lng1 + Math.atan2(Math.sin(brng) * Math.sin(distanceKm / radiusEarthKm) * Math.cos(lat1), Math.cos(distanceKm / radiusEarthKm) - Math.sin(lat1) * Math.sin(lat2));
        this.lat = lat2 * (180 / Math.PI);
        this.lng = lng2 * (180 / Math.PI);
        const distFromCenter = Math.sqrt(Math.pow(this.lat - centerLat, 2) + Math.pow(this.lng - centerLng, 2)) * 111;
        if (distFromCenter > radiusKm) {
            this.heading = Math.atan2(centerLng - this.lng, centerLat - this.lat) * (180 / Math.PI);
        }
    }
}
let SimulationService = SimulationService_1 = class SimulationService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(SimulationService_1.name);
        this.isRunning = false;
        this.currentScenario = null;
        this.fleetState = new Map();
    }
    getState() {
        return {
            isRunning: this.isRunning,
            currentScenario: this.currentScenario,
            fleetCount: this.fleetState.size,
        };
    }
    async loadScenario(config) {
        this.logger.log(`Cargando escenario: ${config.name} en Santiago...`);
        this.currentScenario = config;
        await this.clearTestData();
        for (let i = 0; i < config.activeNodes; i++) {
            const deviceId = `SIM-DEV-${String(i).padStart(4, '0')}`;
            const driver = await this.prisma.driver.create({
                data: {
                    fullName: `Santiago Test Driver ${i}`,
                    phone: `+1809sim${String(i).padStart(4, '0')}`,
                    isSimulated: true,
                    status: 'OPERATIVO',
                    licensePlate: `STI-TEST-${i}`,
                    devices: {
                        create: {
                            deviceId: deviceId,
                            name: `Virtual Screen ${i}`,
                            status: 'OPERATIVO',
                            isSimulated: true,
                        }
                    }
                }
            });
            const initialLat = config.centerLat + (Math.random() - 0.5) * (config.radiusKm / 111);
            const initialLng = config.centerLng + (Math.random() - 0.5) * (config.radiusKm / 111);
            this.fleetState.set(driver.id, {
                vehicle: new VirtualVehicle(initialLat, initialLng),
                deviceId: deviceId
            });
        }
        this.isRunning = true;
    }
    async handleSimulationTick() {
        if (!this.isRunning || !this.currentScenario)
            return;
        const telemetryBatch = [];
        const timestamp = new Date();
        for (const [driverId, state] of this.fleetState.entries()) {
            const { vehicle, deviceId } = state;
            const isAnomaly = Math.random() < this.currentScenario.anomalyRate;
            if (!isAnomaly) {
                vehicle.move(30, this.currentScenario.minSpeed, this.currentScenario.maxSpeed, this.currentScenario.centerLat, this.currentScenario.centerLng, this.currentScenario.radiusKm);
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
        await this.prisma.driverLocation.createMany({ data: telemetryBatch });
        this.logger.log(`Batch STI inyectado: ${telemetryBatch.length} registros.`);
    }
    async stopSimulation() {
        this.isRunning = false;
        this.logger.log('Simulación detenida.');
        return { success: true };
    }
    async clearTestData() {
        this.isRunning = false;
        this.fleetState.clear();
        await this.prisma.driverLocation.deleteMany({ where: { isSimulated: true } });
        await this.prisma.device.deleteMany({ where: { isSimulated: true } });
        await this.prisma.driver.deleteMany({ where: { isSimulated: true } });
    }
};
exports.SimulationService = SimulationService;
__decorate([
    (0, schedule_1.Interval)(30000),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SimulationService.prototype, "handleSimulationTick", null);
exports.SimulationService = SimulationService = SimulationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SimulationService);
//# sourceMappingURL=simulation.service.js.map