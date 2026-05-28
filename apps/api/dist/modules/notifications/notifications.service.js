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
var NotificationsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const supabase_service_1 = require("../supabase/supabase.service");
let NotificationsService = NotificationsService_1 = class NotificationsService {
    constructor(prisma, supabaseService) {
        this.prisma = prisma;
        this.supabaseService = supabaseService;
        this.logger = new common_1.Logger(NotificationsService_1.name);
    }
    async createAlert(data) {
        this.logger.log(`📢 Nueva Alerta: ${data.title} - ${data.type}`);
        const notification = await this.prisma.notification.create({
            data: {
                title: data.title,
                message: data.message,
                type: data.type,
                category: data.category,
                entityId: data.entityId,
            },
        });
        try {
            const supabase = this.supabaseService.getClient();
            await supabase.channel('system_alerts').send({
                type: 'broadcast',
                event: 'NEW_ALERT',
                payload: notification,
            });
        }
        catch (err) {
            this.logger.error('Error broadcasting alert:', err);
        }
        return notification;
    }
    async findAll() {
        return this.prisma.notification.findMany({
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
    }
    async getUnreadCount() {
        return this.prisma.notification.count({
            where: { read: false },
        });
    }
    async markAsRead(id) {
        return this.prisma.notification.update({
            where: { id },
            data: { read: true },
        });
    }
    async markAllAsRead() {
        return this.prisma.notification.updateMany({
            where: { read: false },
            data: { read: true },
        });
    }
    async sendPush(driverId, message) {
        this.logger.log(`📱 Procesando PUSH para Chofer ${driverId}`);
        this.executePushDelivery(driverId, message).catch((err) => this.logger.error(`[PUSH] Error entregando a ${driverId}: ${err.message}`));
    }
    async executePushDelivery(driverId, message) {
        this.logger.log(`🚀 [PUSH DELIVERY] Entregando a ${driverId}: ${message}`);
        return this.createAlert({
            title: 'Notificación Mobile (Push)',
            message: message,
            type: 'WARNING',
            category: 'DEVICE',
            entityId: driverId,
        });
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = NotificationsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        supabase_service_1.SupabaseService])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map