"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PortalRequestsModule = void 0;
const common_1 = require("@nestjs/common");
const portal_requests_service_1 = require("./portal-requests.service");
const portal_requests_controller_1 = require("./portal-requests.controller");
const prisma_module_1 = require("../prisma/prisma.module");
const supabase_module_1 = require("../supabase/supabase.module");
let PortalRequestsModule = class PortalRequestsModule {
};
exports.PortalRequestsModule = PortalRequestsModule;
exports.PortalRequestsModule = PortalRequestsModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, supabase_module_1.SupabaseModule],
        controllers: [portal_requests_controller_1.PortalRequestsController],
        providers: [portal_requests_service_1.PortalRequestsService],
        exports: [portal_requests_service_1.PortalRequestsService],
    })
], PortalRequestsModule);
//# sourceMappingURL=portal-requests.module.js.map