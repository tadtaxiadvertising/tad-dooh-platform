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
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const supabase_service_1 = require("../supabase/supabase.service");
const prisma_service_1 = require("../prisma/prisma.service");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = __importStar(require("bcrypt"));
const business_rules_1 = require("../../common/constants/business-rules");
const jwt = __importStar(require("jsonwebtoken"));
let AuthService = AuthService_1 = class AuthService {
    constructor(supabaseService, prisma, jwtService) {
        this.supabaseService = supabaseService;
        this.prisma = prisma;
        this.jwtService = jwtService;
        this.logger = new common_1.Logger(AuthService_1.name);
    }
    async login(dto) {
        this.logger.log(`🔐 Intentando login para: ${dto.email}`);
        try {
            const supabase = this.supabaseService.getClient();
            const { data, error } = await supabase.auth.signInWithPassword({
                email: dto.email,
                password: dto.password,
            });
            if (error || !data.session || !data.user) {
                this.logger.error(`❌ Fallo Login Supabase: ${dto.email} - ${error?.message}`);
                throw new common_1.UnauthorizedException('Credenciales inválidas');
            }
            const userId = data.user.id;
            const email = data.user.email;
            if (!email) {
                throw new Error('El usuario autenticado no tiene email devuelto por Supabase');
            }
            this.logger.debug(`🔍 Buscando rol para ${email} en base de datos...`);
            const [adminUser, advertiser, driver] = await Promise.all([
                this.prisma.user.findUnique({ where: { email } }).catch(e => {
                    this.logger.error(`Error buscando adminUser: ${e.message}`);
                    return null;
                }),
                this.prisma.advertiser.findUnique({ where: { email } }).catch(e => {
                    this.logger.error(`Error buscando advertiser: ${e.message}`);
                    return null;
                }),
                this.prisma.driver.findFirst({
                    where: {
                        OR: [
                            { phone: email.split('@')[0] },
                            { phone: email },
                        ],
                    },
                }).catch(e => {
                    this.logger.error(`Error buscando driver: ${e.message}`);
                    return null;
                }),
            ]);
            let role = 'GUEST';
            let entityId = null;
            if (adminUser) {
                role = adminUser.role || 'ADMIN';
                this.logger.debug(`Found Admin User with role: ${role}`);
            }
            else if (advertiser) {
                role = 'ADVERTISER';
                entityId = advertiser.id;
                this.logger.debug(`Found Advertiser with ID: ${entityId}`);
            }
            else if (driver) {
                role = 'DRIVER';
                entityId = driver.id;
                this.logger.debug(`Found Driver with ID: ${entityId}`);
            }
            if (role === 'GUEST') {
                this.logger.warn(`🚫 Usuario sin rol asignado en DB: ${email}`);
                throw new common_1.ForbiddenException('Tu cuenta no tiene un rol asignado en la plataforma.');
            }
            this.logger.debug(`💉 Inyectando metadata: role=${role}, entityId=${entityId}`);
            supabase.auth.admin.updateUserById(userId, {
                app_metadata: { role, entityId },
            }).then(({ error: updateError }) => {
                if (updateError) {
                    this.logger.error(`⚠️ Error inyectando metadata en Supabase: ${updateError.message}`);
                }
            }).catch(e => {
                this.logger.error(`⚠️ Excepción inyectando metadata: ${e.message}`);
            });
            this.logger.log(`✅ Login exitoso: ${email} | Rol: ${role} | Entity: ${entityId || 'N/A'}`);
            return {
                access_token: data.session.access_token,
                refresh_token: data.session.refresh_token,
                user: {
                    id: userId,
                    email: email,
                    role: role,
                    entityId: entityId,
                },
            };
        }
        catch (error) {
            this.logger.error(`💥 ERROR CRÍTICO EN LOGIN: ${error.message}`, error.stack);
            if (error instanceof common_1.UnauthorizedException || error instanceof common_1.ForbiddenException) {
                throw error;
            }
            throw new common_1.HttpException({
                status: common_1.HttpStatus.INTERNAL_SERVER_ERROR,
                error: 'Error interno en el proceso de autenticación',
                details: error.message
            }, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async getProfile(userId) {
        const [user, advertiser, driver] = await Promise.all([
            this.prisma.user.findFirst({ where: { id: userId } }),
            this.prisma.advertiser.findFirst({ where: { id: userId } }),
            this.prisma.driver.findFirst({ where: { id: userId } }),
        ]);
        if (user)
            return { ...user, role: user.role };
        if (advertiser)
            return { ...advertiser, role: 'ADVERTISER' };
        if (driver)
            return { ...driver, role: 'DRIVER' };
        return { id: userId, role: 'GUEST' };
    }
    async updateProfile(userId, data) {
        const supabase = this.supabaseService.getClient();
        if (data.password) {
            if (!data.currentPassword) {
                throw new common_1.HttpException('Current password is required to change password', common_1.HttpStatus.BAD_REQUEST);
            }
            const { error } = await supabase.auth.admin.updateUserById(userId, {
                password: data.password,
            });
            if (error) {
                this.logger.error(`Failed to update password for ${userId}: ${error.message}`);
                throw new common_1.HttpException(error.message, common_1.HttpStatus.BAD_REQUEST);
            }
        }
        if (data.name) {
            const [user, advertiser, driver] = await Promise.all([
                this.prisma.user.findFirst({ where: { id: userId } }),
                this.prisma.advertiser.findFirst({ where: { id: userId } }),
                this.prisma.driver.findFirst({ where: { id: userId } }),
            ]);
            if (user) {
                await this.prisma.user.update({ where: { id: userId }, data: { name: data.name } });
            }
            else if (advertiser) {
                await this.prisma.advertiser.update({ where: { id: userId }, data: { contactName: data.name } });
            }
            else if (driver) {
                await this.prisma.driver.update({ where: { id: userId }, data: { fullName: data.name } });
            }
            else {
                throw new common_1.HttpException('User not found in any role table', common_1.HttpStatus.NOT_FOUND);
            }
        }
        return this.getProfile(userId);
    }
    async seedAdminUser() {
        this.logger.log('🔐 Seeding users must be done via Supabase Dashboard');
    }
    async generatePairingToken(driverId) {
        const payload = { sub: driverId, type: 'pairing' };
        return {
            token: this.jwtService.sign(payload, { expiresIn: '5m' }),
            expiresIn: 300,
        };
    }
    async registerDriver(data) {
        const existingDriver = await this.prisma.driver.findUnique({ where: { phone: data.phone } });
        if (existingDriver) {
            throw new common_1.HttpException('Ya existe un chofer con ese teléfono', common_1.HttpStatus.CONFLICT);
        }
        const hashedPassword = await bcrypt.hash(data.password, business_rules_1.BCRYPT_ROUNDS);
        const driver = await this.prisma.driver.create({
            data: {
                fullName: data.name,
                phone: data.phone,
                taxiPlate: data.vehicleModel || null,
                licensePlate: data.licensePlate || null,
                password: hashedPassword,
                status: business_rules_1.BUSINESS_RULES.STATUS.DRIVER.INITIAL,
                subscriptionPaid: false,
                contractAccepted: false,
                onboardingStatus: business_rules_1.BUSINESS_RULES.STATUS.DRIVER.ONBOARDING.TOS_PENDING,
            },
        });
        const jwtSecret = process.env.SUPABASE_JWT_SECRET || process.env.JWT_SECRET;
        if (!jwtSecret) {
            return {
                success: true,
                message: 'Registro completado. Inicia sesión para continuar.',
                driverId: driver.id,
            };
        }
        const token = jwt.sign({
            sub: driver.id,
            phone: driver.phone,
            role: 'DRIVER',
            app_metadata: { role: 'DRIVER', entityId: driver.id },
        }, jwtSecret, { expiresIn: business_rules_1.JWT_EXPIRY });
        return {
            success: true,
            message: 'Registro completado exitosamente.',
            access_token: token,
            driverId: driver.id,
        };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService,
        prisma_service_1.PrismaService,
        jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map