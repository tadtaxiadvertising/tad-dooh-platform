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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SystemSettingsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let SystemSettingsService = class SystemSettingsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async onModuleInit() {
        await this.seedDefaults();
    }
    async getAll() {
        const settings = await this.prisma.systemSetting.findMany();
        return settings.reduce((acc, curr) => {
            let value = curr.value;
            if (curr.type === 'NUMBER')
                value = Number(curr.value);
            if (curr.type === 'BOOLEAN')
                value = curr.value === 'true';
            if (curr.type === 'JSON') {
                try {
                    value = JSON.parse(curr.value);
                }
                catch (e) {
                    value = curr.value;
                }
            }
            acc[curr.key] = value;
            return acc;
        }, {});
    }
    async updateMany(settings) {
        const updates = Object.entries(settings).map(async ([key, value]) => {
            const existing = await this.prisma.systemSetting.findUnique({ where: { key } });
            if (existing) {
                let stringValue = String(value);
                if (existing.type === 'JSON')
                    stringValue = JSON.stringify(value);
                return this.prisma.systemSetting.update({
                    where: { key },
                    data: { value: stringValue },
                });
            }
        });
        await Promise.all(updates.filter(Boolean));
        return this.getAll();
    }
    async seedDefaults() {
        const defaults = [
            { key: 'platformName', value: 'TAD DOOH Platform', type: 'STRING', group: 'GENERAL' },
            { key: 'maintenanceMode', value: 'false', type: 'BOOLEAN', group: 'GENERAL' },
            { key: 'slotPrice', value: '500', type: 'NUMBER', group: 'FINANCIAL' },
            { key: 'referralFee', value: '500', type: 'NUMBER', group: 'FINANCIAL' },
            { key: 'subscriptionPrice', value: '6000', type: 'NUMBER', group: 'FINANCIAL' },
            { key: 'maxSlots', value: '15', type: 'NUMBER', group: 'FLEET' },
            { key: 'syncInterval', value: '10', type: 'NUMBER', group: 'FLEET' },
            { key: 'telemetryBatch', value: '50', type: 'NUMBER', group: 'FLEET' },
            { key: 'offlineLimit', value: '48', type: 'NUMBER', group: 'FLEET' },
            { key: 'remotionUrl', value: 'https://tad-remotion.rewvid.easypanel.host', type: 'STRING', group: 'SYSTEM' },
            { key: 'whatsappGateway', value: 'https://api.whatsapp.com/send', type: 'STRING', group: 'SYSTEM' },
        ];
        for (const setting of defaults) {
            await this.prisma.systemSetting.upsert({
                where: { key: setting.key },
                update: {},
                create: setting,
            });
        }
    }
};
exports.SystemSettingsService = SystemSettingsService;
exports.SystemSettingsService = SystemSettingsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SystemSettingsService);
//# sourceMappingURL=system-settings.service.js.map