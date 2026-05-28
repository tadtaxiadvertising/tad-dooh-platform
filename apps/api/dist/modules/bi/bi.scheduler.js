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
let BiScheduler = BiScheduler_1 = class BiScheduler {
    constructor(biService) {
        this.biService = biService;
        this.logger = new common_1.Logger(BiScheduler_1.name);
    }
    async handleDailySnapshot() {
        this.logger.log('🚀 Iniciando generación de snapshot diario de BI...');
        try {
            await this.biService.getMasterKpis();
            this.logger.log('✅ Snapshot diario generado con éxito.');
        }
        catch (error) {
            this.logger.error('❌ Error al generar snapshot de BI:', error.message);
        }
    }
    async handleReconciliation() {
        const now = new Date();
        const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        this.logger.log(`🌙 Iniciando conciliación automática para el periodo ${period}...`);
        try {
            const result = await this.biService.generateReconciliationReport(period);
            this.logger.log(`✅ Conciliación completada: ${result.total} registros procesados.`);
        }
        catch (error) {
            this.logger.error('❌ Falla en conciliación automática:', error.message);
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
exports.BiScheduler = BiScheduler = BiScheduler_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [bi_service_1.BiService])
], BiScheduler);
//# sourceMappingURL=bi.scheduler.js.map