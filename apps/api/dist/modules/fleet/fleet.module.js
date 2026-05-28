"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FleetModule = void 0;
const common_1 = require("@nestjs/common");
const fleet_controller_1 = require("./fleet.controller");
const tracking_controller_1 = require("./tracking.controller");
const fleet_service_1 = require("./fleet.service");
const device_module_1 = require("../device/device.module");
const supabase_module_1 = require("../supabase/supabase.module");
let FleetModule = class FleetModule {
};
exports.FleetModule = FleetModule;
exports.FleetModule = FleetModule = __decorate([
    (0, common_1.Module)({
        imports: [device_module_1.DeviceModule, supabase_module_1.SupabaseModule],
        controllers: [fleet_controller_1.FleetController, tracking_controller_1.TrackingController],
        providers: [fleet_service_1.FleetService],
    })
], FleetModule);
//# sourceMappingURL=fleet.module.js.map