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
var BiScheduler_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BiScheduler = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const bi_service_1 = require("./bi.service");
const prisma_service_1 = require("../prisma/prisma.service");
let BiScheduler = BiScheduler_1 = class BiScheduler {
    constructor(biService, prisma) {
        this.biService = biService;
        this.prisma = prisma;
        this.logger = new common_1.Logger(BiScheduler_1.name);
    }
    async handleDailySnapshot() {
        this.logger.log('\ud83d\ude80 Iniciando generaci\u00f3n de snapshot diario de BI...');
        try {
            await this.biService.getMasterKpis();
            this.logger.log('\u2705 Snapshot diario generado con \u00e9xito.');
        }
        catch (error) {
            this.logger.error('\u274c Error al generar snapshot de BI:', error.message);
        }
    }
    async handleReconciliation() {
        const now = new Date();
        const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        this.logger.log(`\ud83c\udf19 Iniciando conciliaci\u00f3n autom\u00e1tica para el periodo ${period}...`);
        try {
            const result = await this.biService.generateReconciliationReport(period);
            this.logger.log(`\u2705 Conciliaci\u00f3n completada: ${result.total} registros procesados.`);
        }
        catch (error) {
            this.logger.error('\u274c Falla en conciliaci\u00f3n autom\u00e1tica:', error.message);
        }
    }
    async handleIdempotencyCleanup() {
        this.logger.log('\ud83e\uddf9 [IDEMPOTENCY_TTL] Purging expired idempotency keys...');
        try {
            const staleLocks = await this.prisma.idempotencyKey.updateMany({
                where: {
                    isLocked: true,
                    createdAt: { lt: new Date(Date.now() - 3600000) }
                },
                data: { isLocked: false }
            });
            this.logger.log(`\u26a0 Released ${staleLocks.count} stale idempotency locks (orphaned from crashed requests).`);
            const deleted = await this.prisma.idempotencyKey.deleteMany({
                where: { expiresAt: { lt: new Date() } }
            });
            this.logger.log(`\u2705 Purged ${deleted.count} expired idempotency keys.`);
        }
        catch (error) {
            this.logger.error('\u274c Error in idempotency cleanup:', error.message);
        }
    }
};
exports.BiScheduler = BiScheduler;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_MIDNIGHT),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], BiScheduler.prototype, "handleDailySnapshot", null);
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_2AM),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], BiScheduler.prototype, "handleReconciliation", null);
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_4AM),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], BiScheduler.prototype, "handleIdempotencyCleanup", null);
exports.BiScheduler = BiScheduler = BiScheduler_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [bi_service_1.BiService,
        prisma_service_1.PrismaService])
], BiScheduler);
//# sourceMappingURL=bi.scheduler.js.map