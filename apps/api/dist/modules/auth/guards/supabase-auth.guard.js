"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var SupabaseAuthGuard_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupabaseAuthGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const config_1 = require("@nestjs/config");
const public_decorator_1 = require("../decorators/public.decorator");
const supabase_service_1 = require("../../supabase/supabase.service");
const jwt = __importStar(require("jsonwebtoken"));
let SupabaseAuthGuard = SupabaseAuthGuard_1 = class SupabaseAuthGuard {
    constructor(reflector, supabaseService, configService) {
        this.reflector = reflector;
        this.supabaseService = supabaseService;
        this.configService = configService;
        this.logger = new common_1.Logger(SupabaseAuthGuard_1.name);
        this.CACHE_TTL_MS = 10000;
        this.isDev = process.env.NODE_ENV === 'development';
        this.allowDevBypass = this.isDev && process.env.ALLOW_DEV_BYPASS === 'true';
        const hasSecret = !!(this.configService.get('SUPABASE_JWT_SECRET') || this.configService.get('JWT_SECRET'));
        if (!hasSecret) {
            this.logger.warn('⚠️ [SECURITY] No hay JWT_SECRET configurado. Solo funcionará Estrategia 2 (Red).');
        }
        if (Math.random() > 0.95) {
            const now = Date.now();
            for (const [token, data] of SupabaseAuthGuard_1.sessionCache.entries()) {
                if (data.expiry < now)
                    SupabaseAuthGuard_1.sessionCache.delete(token);
            }
        }
    }
    async canActivate(context) {
        const isPublic = this.reflector.getAllAndOverride(public_decorator_1.IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic) {
            await this.resolveRequestUser(context, false);
            return true;
        }
        await this.resolveRequestUser(context, true);
        return true;
    }
    async resolveRequestUser(context, strict) {
        const request = context.switchToHttp().getRequest();
        const authHeader = request.headers.authorization || request.headers.Authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            if (strict) {
                this.logger.warn(`❌ [AUTH] Petición sin Header Authorization válido: ${request.url}`);
                throw new common_1.UnauthorizedException('Token de acceso no válido o ausente.');
            }
            return;
        }
        const token = authHeader.split(' ')[1];
        const cached = SupabaseAuthGuard_1.sessionCache.get(token);
        if (cached && cached.expiry > Date.now()) {
            request.user = cached.user;
            return;
        }
        const jwtSecret = this.configService.get('SUPABASE_JWT_SECRET') || this.configService.get('JWT_SECRET');
        if (jwtSecret) {
            try {
                const decodedToken = jwt.decode(token, { complete: true });
                const alg = decodedToken?.header?.alg || 'HS256';
                const isSymmetricSecret = !jwtSecret.includes('BEGIN PUBLIC KEY') && !jwtSecret.includes('BEGIN CERTIFICATE');
                const isAsymmetricAlg = alg.startsWith('RS') || alg.startsWith('ES') || alg.startsWith('PS');
                if (isAsymmetricAlg && isSymmetricSecret) {
                }
                else {
                    const payload = jwt.verify(token, jwtSecret, {
                        algorithms: [alg, 'HS256', 'HS384', 'HS512']
                    });
                    if (payload) {
                        request.user = {
                            id: payload.sub,
                            email: payload.email,
                            role: payload.app_metadata?.role || payload.role || 'GUEST',
                            entityId: payload.app_metadata?.entityId || null,
                        };
                        SupabaseAuthGuard_1.sessionCache.set(token, {
                            user: request.user,
                            expiry: Date.now() + this.CACHE_TTL_MS
                        });
                        this.logger.verbose(`✅ [AUTH] ESTRATEGIA 1 OK (Local JWT): ${request.user.email}`);
                        return;
                    }
                }
            }
            catch (err) {
                const errorMessage = err instanceof Error ? err.message : String(err);
                const errName = err instanceof Error ? err.name : '';
                if (errName === 'TokenExpiredError') {
                    if (strict) {
                        this.logger.warn(`🛑 [AUTH] TOKEN EXPIRADO: ${errorMessage}`);
                        throw new common_1.UnauthorizedException('Tu sesión ha expirado.');
                    }
                }
                else {
                    const isAlgError = errorMessage.toLowerCase().includes('algorithm');
                    if (isAlgError) {
                        this.logger.verbose(`[AUTH] Estrategia 1 falló (Algoritmo incompatible o Secret mal configurado: ${errorMessage}). Intentando Estrategia 2...`);
                    }
                    else {
                        this.logger.verbose(`[AUTH] Estrategia 1 falló (${errorMessage}). Intentando Estrategia 2 (Red)...`);
                    }
                }
            }
        }
        try {
            const supabase = this.supabaseService.getClient();
            const { data, error } = await supabase.auth.getUser(token);
            if (!error && data.user) {
                const decoded = jwt.decode(token);
                const roleFromMeta = data.user.app_metadata?.role ||
                    (decoded?.app_metadata?.role) ||
                    data.user.role ||
                    decoded?.role ||
                    'GUEST';
                const entityId = data.user.app_metadata?.entityId ||
                    decoded?.app_metadata?.entityId ||
                    null;
                request.user = {
                    id: data.user.id,
                    email: data.user.email,
                    role: roleFromMeta,
                    entityId,
                };
                SupabaseAuthGuard_1.sessionCache.set(token, {
                    user: request.user,
                    expiry: Date.now() + this.CACHE_TTL_MS
                });
                if (roleFromMeta === 'GUEST') {
                    this.logger.warn(`⚠️ [AUTH_GUARD] Usuario autenticado pero sin rol en metadata: ${data.user.email}. ` +
                        `Verifica si las claims están correctas en Supabase.`);
                }
                else {
                    this.logger.verbose(`✅ [AUTH] ESTRATEGIA 2 OK (Red): ${data.user.email} [${roleFromMeta}]`);
                }
                return;
            }
            if (error) {
                this.logger.warn(`❌ [AUTH] ESTRATEGIA 2 RECHAZÓ TOKEN: ${error.message}`);
            }
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            this.logger.error(`❌ [AUTH] ESTRATEGIA 2 ERROR CRÍTICO: ${errorMessage}`);
        }
        if (this.allowDevBypass) {
            const decoded = jwt.decode(token);
            if (decoded) {
                this.logger.warn(`🚩 [AUTH] DEV BYPASS UTILIZADO: ${decoded.email}`);
                request.user = {
                    id: decoded.sub || 'dev-user',
                    email: decoded.email || 'dev@local',
                    role: decoded.app_metadata?.role || decoded.role || 'GUEST',
                    entityId: decoded.app_metadata?.entityId || null,
                };
                return;
            }
        }
        if (strict) {
            throw new common_1.UnauthorizedException('Sesión inválida.');
        }
    }
};
exports.SupabaseAuthGuard = SupabaseAuthGuard;
SupabaseAuthGuard.sessionCache = new Map();
exports.SupabaseAuthGuard = SupabaseAuthGuard = SupabaseAuthGuard_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector,
        supabase_service_1.SupabaseService,
        config_1.ConfigService])
], SupabaseAuthGuard);
//# sourceMappingURL=supabase-auth.guard.js.map