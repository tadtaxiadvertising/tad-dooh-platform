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
exports.AppController = void 0;
const common_1 = require("@nestjs/common");
const public_decorator_1 = require("./modules/auth/decorators/public.decorator");
const swagger_1 = require("@nestjs/swagger");
let AppController = class AppController {
    getStatus() {
        return {
            status: 'UP',
            timestamp: new Date().toISOString(),
            service: 'TAD API Gateway',
            version: 'v12-shelter',
            routes: {
                health: ['/api/health', '/health', '/api/v1/health'],
                api: '/api/v1',
                docs: '/api/docs',
            },
        };
    }
    getRoot() {
        return this.getStatus();
    }
    getHealth() {
        return this.getStatus();
    }
};
exports.AppController = AppController;
__decorate([
    (0, common_1.Get)('/'),
    (0, common_1.Get)('api'),
    (0, common_1.Get)('api/v1'),
    (0, public_decorator_1.Public)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AppController.prototype, "getRoot", null);
__decorate([
    (0, common_1.Get)('api/health'),
    (0, public_decorator_1.Public)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AppController.prototype, "getHealth", null);
exports.AppController = AppController = __decorate([
    (0, swagger_1.ApiTags)('Health'),
    (0, common_1.Controller)()
], AppController);
//# sourceMappingURL=app.controller.js.map