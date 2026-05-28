"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IdempotencyInterceptor = void 0;
const common_1 = require("@nestjs/common");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const processedKeys = new Map();
let IdempotencyInterceptor = class IdempotencyInterceptor {
    intercept(context, next) {
        const request = context.switchToHttp().getRequest();
        const method = request.method;
        if (['POST', 'PUT', 'PATCH'].includes(method)) {
            const idempotencyKey = request.headers['idempotency-key'];
            if (!idempotencyKey) {
                throw new common_1.BadRequestException({
                    code: 'IDEMPOTENCY_KEY_MISSING',
                    message: 'Idempotency-Key header is required for this operation',
                });
            }
            if (processedKeys.has(idempotencyKey)) {
                return (0, rxjs_1.of)(processedKeys.get(idempotencyKey));
            }
            return next.handle().pipe((0, operators_1.tap)((response) => {
                processedKeys.set(idempotencyKey, response);
                setTimeout(() => {
                    processedKeys.delete(idempotencyKey);
                }, 86400000);
            }));
        }
        return next.handle();
    }
};
exports.IdempotencyInterceptor = IdempotencyInterceptor;
exports.IdempotencyInterceptor = IdempotencyInterceptor = __decorate([
    (0, common_1.Injectable)()
], IdempotencyInterceptor);
//# sourceMappingURL=idempotency.interceptor.js.map