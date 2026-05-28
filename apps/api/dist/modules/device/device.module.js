"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeviceModule = void 0;
const common_1 = require("@nestjs/common");
const device_controller_1 = require("./device.controller");
const device_service_1 = require("./device.service");
const campaign_module_1 = require("../campaign/campaign.module");
const finance_module_1 = require("../finance/finance.module");
const device_admin_controller_1 = require("./device-admin.controller");
const prisma_module_1 = require("../prisma/prisma.module");
let DeviceModule = class DeviceModule {
};
exports.DeviceModule = DeviceModule;
exports.DeviceModule = DeviceModule = __decorate([
    (0, common_1.Module)({
        imports: [campaign_module_1.CampaignModule, finance_module_1.FinanceModule, prisma_module_1.PrismaModule],
        controllers: [device_controller_1.DeviceController, device_admin_controller_1.DeviceAdminController],
        providers: [device_service_1.DeviceService],
        exports: [device_service_1.DeviceService],
    })
], DeviceModule);
//# sourceMappingURL=device.module.js.map