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
var IdempotencyInterceptor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.IdempotencyInterceptor = void 0;
const common_1 = require("@nestjs/common");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const prisma_service_1 = require("../../modules/prisma/prisma.service");
let IdempotencyInterceptor = IdempotencyInterceptor_1 = class IdempotencyInterceptor {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(IdempotencyInterceptor_1.name);
    }
    async intercept(context, next) {
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
            const existing = await this.prisma.idempotencyKey.findUnique({
                where: { key: idempotencyKey }
            });
            if (existing) {
                if (existing.expiresAt && existing.expiresAt.getTime() <= Date.now()) {
                    this.logger.warn(`Idempotency key ${idempotencyKey} expiró (${existing.expiresAt.toISOString()}). Descartando y re-procesando.`);
                    try {
                        await this.prisma.idempotencyKey.delete({ where: { key: idempotencyKey } });
                    }
                    catch (e) {
                    }
                }
                else if (existing.isLocked) {
                    this.logger.warn(`Idempotency key ${idempotencyKey} is currently being processed by another request.`);
                    throw new common_1.BadRequestException({
                        code: 'IDEMPOTENCY_KEY_IN_PROGRESS',
                        message: 'This operation is currently being processed. Please retry in a few seconds.',
                    });
                }
                else {
                    this.logger.log(`Idempotency key ${idempotencyKey} already processed. Returning cached response.`);
                    try {
                        return (0, rxjs_1.of)(JSON.parse(existing.response));
                    }
                    catch {
                        return (0, rxjs_1.of)({ success: true, idempotent: true });
                    }
                }
            }
            await this.prisma.idempotencyKey.create({
                data: {
                    key: idempotencyKey,
                    driverId: request.user?.entityId || request.body?.driverId || 'unknown',
                    path: request.path,
                    response: '{}',
                    isLocked: true,
                    expiresAt: new Date(Date.now() + 86400000),
                }
            });
            return next.handle().pipe((0, operators_1.tap)(async (response) => {
                await this.prisma.idempotencyKey.update({
                    where: { key: idempotencyKey },
                    data: {
                        response: JSON.stringify(response),
                        isLocked: false,
                    }
                });
            }), (0, operators_1.catchError)(async (err) => {
                try {
                    await this.prisma.idempotencyKey.delete({ where: { key: idempotencyKey } });
                }
                catch (e) {
                }
                return (0, rxjs_1.throwError)(() => err);
            }));
        }
        return next.handle();
    }
};
exports.IdempotencyInterceptor = IdempotencyInterceptor;
exports.IdempotencyInterceptor = IdempotencyInterceptor = IdempotencyInterceptor_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], IdempotencyInterceptor);
//# sourceMappingURL=idempotency.interceptor.js.map