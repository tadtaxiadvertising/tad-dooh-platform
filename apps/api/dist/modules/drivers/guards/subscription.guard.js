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
var SubscriptionGuard_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionGuard = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const business_rules_1 = require("../../../common/constants/business-rules");
let SubscriptionGuard = SubscriptionGuard_1 = class SubscriptionGuard {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(SubscriptionGuard_1.name);
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const deviceId = request.headers['x-device-id'] ||
            request.body?.deviceId ||
            request.params?.deviceId ||
            null;
        if (!deviceId) {
            return true;
        }
        const device = await this.prisma.device.findUnique({
            where: { deviceId },
            select: {
                id: true,
                driverId: true,
                lastHeartbeat: true,
                driver: {
                    select: {
                        id: true,
                        subscriptionPaid: true,
                        subscriptionEnd: true,
                        status: true,
                        blockedAt: true,
                    },
                },
            },
        });
        if (!device || !device.driver) {
            return true;
        }
        const driver = device.driver;
        const now = new Date();
        const isPaid = driver.subscriptionPaid === true;
        const notExpired = !driver.subscriptionEnd ||
            driver.subscriptionEnd.getTime() > now.getTime();
        const activeStatus = driver.status === business_rules_1.BUSINESS_RULES.STATUS.DRIVER.ACTIVE;
        if (isPaid && notExpired && activeStatus) {
            return true;
        }
        if (device.lastHeartbeat) {
            const offlineSince = now.getTime() - device.lastHeartbeat.getTime() >=
                SubscriptionGuard_1.OFFLINE_THRESHOLD_MS;
            if (offlineSince &&
                driver.subscriptionEnd &&
                driver.subscriptionEnd.getTime() + SubscriptionGuard_1.GRACE_PERIOD_MS >
                    now.getTime()) {
                this.logger.warn(`🟡 [GRACE] Device ${deviceId} dentro de 48h post-vencimiento. Permitido offline.`);
                return true;
            }
        }
        let reason;
        if (driver.status === business_rules_1.BUSINESS_RULES.STATUS.DRIVER.SUSPENDED) {
            reason = 'STATE_BLOCKED';
        }
        else if (driver.status === business_rules_1.BUSINESS_RULES.STATUS.DRIVER.INITIAL) {
            reason = 'SUBSCRIPTION_PENDING';
        }
        else if (!isPaid) {
            reason = 'SUBSCRIPTION_UNPAID';
        }
        else {
            reason = 'SUBSCRIPTION_EXPIRED';
        }
        this.logger.warn(`🚫 [KILL-SWITCH 402] Device ${deviceId} → Driver ${driver.id} bloqueado. reason=${reason}`);
        throw new common_1.HttpException({
            statusCode: common_1.HttpStatus.PAYMENT_REQUIRED,
            error: 'PAYMENT_REQUIRED',
            reason,
            message: 'Acceso bloqueado: suscripción anual RD$6,000 vencida o pendiente.',
            driverId: driver.id,
            deviceId,
            blockedAt: driver.blockedAt,
            subscriptionEnd: driver.subscriptionEnd,
        }, common_1.HttpStatus.PAYMENT_REQUIRED);
    }
};
exports.SubscriptionGuard = SubscriptionGuard;
SubscriptionGuard.GRACE_PERIOD_MS = 48 * 60 * 60 * 1000;
SubscriptionGuard.OFFLINE_THRESHOLD_MS = 24 * 60 * 60 * 1000;
exports.SubscriptionGuard = SubscriptionGuard = SubscriptionGuard_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SubscriptionGuard);
//# sourceMappingURL=subscription.guard.js.map