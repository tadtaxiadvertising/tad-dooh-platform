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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimulationController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const simulation_service_1 = require("./simulation.service");
const public_decorator_1 = require("../auth/decorators/public.decorator");
let SimulationController = class SimulationController {
    constructor(simService) {
        this.simService = simService;
    }
    async getState() {
        return { success: true, data: this.simService.getState() };
    }
    async startScenario(config) {
        const defaultSantiagoScenario = {
            name: config.name || "Santiago Default",
            activeNodes: config.activeNodes || 50,
            centerLat: config.centerLat || 19.4517,
            centerLng: config.centerLng || -70.6970,
            radiusKm: config.radiusKm || 8,
            minSpeed: config.minSpeed || 15,
            maxSpeed: config.maxSpeed || 60,
            anomalyRate: config.anomalyRate || 0.02,
        };
        await this.simService.loadScenario(defaultSantiagoScenario);
        return { success: true, message: `Escenario ${defaultSantiagoScenario.name} iniciado en Santiago.` };
    }
    async stop() {
        await this.simService.stopSimulation();
        return { success: true, message: 'Simulación detenida.' };
    }
    async stopAndPurge() {
        await this.simService.clearTestData();
        return { success: true, message: 'Datos de prueba eliminados. Entorno limpio.' };
    }
};
exports.SimulationController = SimulationController;
__decorate([
    (0, common_1.Get)('state'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SimulationController.prototype, "getState", null);
__decorate([
    (0, common_1.Post)('scenario'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SimulationController.prototype, "startScenario", null);
__decorate([
    (0, common_1.Post)('stop'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SimulationController.prototype, "stop", null);
__decorate([
    (0, common_1.Delete)('purge'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SimulationController.prototype, "stopAndPurge", null);
exports.SimulationController = SimulationController = __decorate([
    (0, throttler_1.SkipThrottle)(),
    (0, public_decorator_1.Public)(),
    (0, common_1.Controller)('simulation'),
    __metadata("design:paramtypes", [simulation_service_1.SimulationService])
], SimulationController);
//# sourceMappingURL=simulation.controller.js.map