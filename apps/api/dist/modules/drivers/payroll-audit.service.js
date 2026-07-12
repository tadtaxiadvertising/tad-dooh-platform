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
var PayrollAuditService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayrollAuditService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../prisma/prisma.service");
const business_rules_1 = require("../../common/constants/business-rules");
let PayrollAuditService = PayrollAuditService_1 = class PayrollAuditService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(PayrollAuditService_1.name);
    }
    async runMonthlyAudit() {
        this.logger.log('Iniciando auditoría mensual de nómina y penalizaciones...');
        const drivers = await this.prisma.driver.findMany({
            where: { status: business_rules_1.BUSINESS_RULES.STATUS.DRIVER.ACTIVE }
        });
        for (const driver of drivers) {
            const levelKey = (driver.level || 'BASE');
            const levelConfig = business_rules_1.BUSINESS_RULES.LEVELS[levelKey];
            const lastPayment = await this.prisma.payrollPayment.findFirst({
                where: { driverId: driver.id },
                orderBy: { createdAt: 'desc' },
            });
            if (!lastPayment)
                continue;
            const underGoal = lastPayment.transmissionHours < levelConfig.hours;
            if (underGoal) {
                await this.prisma.driver.update({
                    where: { id: driver.id },
                    data: {
                        consecutiveMonthsUnderGoal: { increment: 1 }
                    }
                });
                this.logger.warn(`⚠️ Chofer ${driver.fullName}: ${lastPayment.transmissionHours}h vs Meta ${levelConfig.hours}h.`);
            }
            else {
                await this.prisma.driver.update({
                    where: { id: driver.id },
                    data: { consecutiveMonthsUnderGoal: 0 }
                });
            }
        }
        this.logger.log('Auditoría mensual completada.');
    }
    async applyPenaltyLogic(driverId, amount) {
        const driver = await this.prisma.driver.findUnique({
            where: { id: driverId },
            select: { consecutiveMonthsUnderGoal: true, level: true }
        });
        if (!driver)
            return { amount, penaltyApplied: false, penaltyAmount: 0 };
        if (driver.consecutiveMonthsUnderGoal >= business_rules_1.BUSINESS_RULES.PENALTY_THRESHOLD_MONTHS) {
            const penaltyRate = business_rules_1.BUSINESS_RULES.LEVELS.BASE.penalty;
            const finalAmount = amount * (1 - penaltyRate);
            return {
                amount: finalAmount,
                penaltyApplied: true,
                penaltyAmount: amount * penaltyRate,
            };
        }
        return { amount, penaltyApplied: false, penaltyAmount: 0 };
    }
};
exports.PayrollAuditService = PayrollAuditService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PayrollAuditService.prototype, "runMonthlyAudit", null);
exports.PayrollAuditService = PayrollAuditService = PayrollAuditService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PayrollAuditService);
//# sourceMappingURL=payroll-audit.service.js.map