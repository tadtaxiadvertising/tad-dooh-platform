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
var FleetMonitorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FleetMonitorService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../prisma/prisma.service");
const notifications_service_1 = require("../notifications/notifications.service");
const business_rules_1 = require("../../common/constants/business-rules");
let FleetMonitorService = FleetMonitorService_1 = class FleetMonitorService {
    constructor(prisma, notifications) {
        this.prisma = prisma;
        this.notifications = notifications;
        this.logger = new common_1.Logger(FleetMonitorService_1.name);
    }
    async checkFleetConnectivity() {
        this.logger.log('Iniciando auditoría de conectividad de flota...');
        const now = new Date();
        const threshold48h = new Date(now.getTime() - 48 * 60 * 60 * 1000);
        const threshold12h = new Date(now.getTime() - 12 * 60 * 60 * 1000);
        const devicesToUpdate = await this.prisma.device.updateMany({
            where: {
                lastHeartbeat: { lt: threshold48h },
                connectivityStatus: 'ONLINE'
            },
            data: { connectivityStatus: 'CONNECTIVITY_ISSUE' }
        });
        if (devicesToUpdate.count > 0) {
            this.logger.warn(`🛑 ${devicesToUpdate.count} dispositivos marcados con 'connectivity_issue' (offline > 48h).`);
        }
        const offlineDevices = await this.prisma.device.findMany({
            where: {
                lastHeartbeat: { lt: threshold12h },
                status: business_rules_1.BUSINESS_RULES.STATUS.DEVICE.ACTIVE
            },
            include: { driver: true }
        });
        for (const device of offlineDevices) {
            if (device.driverId) {
                await this.notifications.sendPush(device.driverId, `⚠️ Alerta de Conexión: Su pantalla no ha reportado actividad en más de 12 horas. Asegúrese de que el GPS y el Internet estén activos.`).catch(err => this.logger.error(`Error enviando push a ${device.driverId}: ${err.message}`));
            }
        }
        this.logger.log(`Auditoría de conectividad completada. Dispositivos offline > 12h: ${offlineDevices.length}`);
    }
};
exports.FleetMonitorService = FleetMonitorService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_12_HOURS),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], FleetMonitorService.prototype, "checkFleetConnectivity", null);
exports.FleetMonitorService = FleetMonitorService = FleetMonitorService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notifications_service_1.NotificationsService])
], FleetMonitorService);
//# sourceMappingURL=fleet-monitor.service.js.map