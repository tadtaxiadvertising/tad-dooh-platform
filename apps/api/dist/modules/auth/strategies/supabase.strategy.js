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
exports.SupabaseStrategy = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const passport_jwt_1 = require("passport-jwt");
const config_1 = require("@nestjs/config");
let SupabaseStrategy = class SupabaseStrategy extends (0, passport_1.PassportStrategy)(passport_jwt_1.Strategy, 'jwt') {
    constructor(configService) {
        const secret = configService.get('SUPABASE_JWT_SECRET');
        if (secret && secret.startsWith('sb_secret_')) {
            console.warn('🚨 ALERTA ARQUITECTO: El SUPABASE_JWT_SECRET parece ser una llave de gestión (sb_secret_). No funcionará para validar tokens de usuario. Reemplázalo con el "JWT Secret" de Settings > API de Supabase.');
        }
        super({
            jwtFromRequest: passport_jwt_1.ExtractJwt.fromExtractors([
                (request) => {
                    let data = request?.headers?.authorization;
                    if (!data)
                        return null;
                    data = data.replace(/bearer\s+/i, '').replace(/['"]/g, '').trim();
                    return data;
                },
            ]),
            ignoreExpiration: false,
            secretOrKey: secret || configService.get('JWT_SECRET') || 'tad-default-secret-change-me',
        });
        this.configService = configService;
    }
    async validate(payload) {
        if (!payload || !payload.sub) {
            throw new common_1.UnauthorizedException('Token inválido o expirado.');
        }
        const appMeta = payload.app_metadata || {};
        return {
            id: payload.sub,
            email: payload.email,
            role: appMeta.role || payload.role || 'ADMIN',
            entityId: appMeta.entityId || null,
        };
    }
};
exports.SupabaseStrategy = SupabaseStrategy;
exports.SupabaseStrategy = SupabaseStrategy = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], SupabaseStrategy);
//# sourceMappingURL=supabase.strategy.js.map