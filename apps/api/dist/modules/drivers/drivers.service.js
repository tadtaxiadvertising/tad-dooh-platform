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
var DriversService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DriversService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const config_1 = require("@nestjs/config");
const bcrypt = __importStar(require("bcrypt"));
const jwt = __importStar(require("jsonwebtoken"));
const crypto_1 = require("crypto");
const business_rules_1 = require("../../common/constants/business-rules");
const payroll_audit_service_1 = require("./payroll-audit.service");
function generateTemporaryPassword() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    const bytes = (0, crypto_1.randomBytes)(15);
    let out = '';
    for (let i = 0; i < 15; i++)
        out += alphabet[bytes[i] % alphabet.length];
    return out;
}
let DriversService = DriversService_1 = class DriversService {
    constructor(prisma, configService, payrollAudit) {
        this.prisma = prisma;
        this.configService = configService;
        this.payrollAudit = payrollAudit;
        this.logger = new common_1.Logger(DriversService_1.name);
    }
    hasBankAccountConfigured(bankAccount) {
        if (!bankAccount || typeof bankAccount !== 'object' || Array.isArray(bankAccount)) {
            return false;
        }
        const candidate = bankAccount;
        return Boolean(candidate.banco && candidate.cuenta && candidate.cedula && candidate.tipo);
    }
    async checkTabletAccess(tabletId) {
        const device = await this.prisma.device.findUnique({
            where: { id: tabletId },
            include: {
                driver: {
                    select: {
                        id: true,
                        fullName: true,
                        phone: true,
                        status: true,
                        subscriptionPaid: true,
                        subscriptionEnd: true,
                        blockedAt: true,
                    },
                },
            },
        });
        if (!device || !device.driver) {
            return {
                access: false,
                action: 'SHOW_SETUP_SCREEN',
                message: 'Tablet no asignada a un chofer.',
                reason: 'NO_DRIVER_ASSIGNED',
            };
        }
        const driver = device.driver;
        const now = Date.now();
        const subscriptionExpired = !!driver.subscriptionEnd && driver.subscriptionEnd.getTime() < now;
        const delinquent = !driver.subscriptionPaid ||
            subscriptionExpired ||
            driver.status === business_rules_1.BUSINESS_RULES.STATUS.DRIVER.SUSPENDED ||
            driver.status === business_rules_1.BUSINESS_RULES.STATUS.DRIVER.INITIAL;
        if (delinquent) {
            return {
                access: false,
                action: 'KILL_SWITCH',
                httpStatus: 402,
                message: 'Conductor moroso. La PWA debe congelarse hasta regularizar el pago.',
                reason: subscriptionExpired ? 'SUBSCRIPTION_EXPIRED' : 'SUBSCRIPTION_PENDING',
                driverId: driver.id,
                driverStatus: driver.status,
                blockedAt: driver.blockedAt,
                subscriptionEnd: driver.subscriptionEnd,
            };
        }
        return {
            access: true,
            action: 'PLAY_ADS',
            driverId: driver.id,
            driverName: driver.fullName,
        };
    }
    async calculateMonthlyEarnings(driverId) {
        const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const monthEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59);
        const playedRows = await this.prisma.playbackEvent.findMany({
            where: {
                verified: true,
                timestamp: { gte: monthStart, lte: monthEnd },
                device: { driverId },
            },
            distinct: ['videoId'],
            select: { videoId: true },
        }).catch((err) => {
            this.logger.warn(`[EARNINGS] playbackEvent query failed for ${driverId}: ${err.message}`);
            return [];
        });
        const playedCampaignsCount = playedRows.length;
        const cappedAds = Math.min(playedCampaignsCount, business_rules_1.BUSINESS_RULES.MAX_CAMPAIGNS_PER_DRIVER);
        const baseEarnings = cappedAds * business_rules_1.BUSINESS_RULES.DRIVER_RATE_PER_CAMPAIGN_RD;
        const confirmedSales = await this.prisma.commission.count({
            where: {
                driverId,
                sourceType: 'ADVERTISER_SALE',
                status: 'APPROVED',
            },
        }).catch(() => 0);
        const cpaEarnings = confirmedSales * business_rules_1.BUSINESS_RULES.DRIVER_RATE_PER_CAMPAIGN_RD;
        const grossEarnings = baseEarnings + cpaEarnings;
        const { amount, penaltyApplied, penaltyAmount } = await this.payrollAudit.applyPenaltyLogic(driverId, grossEarnings);
        return {
            driverId,
            playedCampaigns: playedCampaignsCount,
            cappedAds,
            activeCampaigns: cappedAds,
            confirmedSales,
            baseEarningsRD: baseEarnings,
            cpaEarningsRD: cpaEarnings,
            penaltyApplied,
            penaltyAmount,
            projectedEarningsRD: amount,
            currency: 'DOP',
            period: { start: monthStart, end: monthEnd },
        };
    }
    async findAll() {
        const [drivers, activeAdsCount] = await Promise.all([
            this.prisma.driver.findMany({
                include: {
                    devices: {
                        select: {
                            id: true,
                            deviceId: true,
                            status: true,
                            batteryLevel: true,
                            appVersion: true,
                            lastSeen: true,
                        },
                    },
                    referrals: {
                        select: { id: true, status: true, subscriptionPaid: true },
                    },
                    referredAdvertisers: {
                        select: { id: true, status: true },
                    },
                },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.campaign.count({ where: { status: 'ACTIVE' } }),
        ]);
        return drivers.map(d => {
            const driver = d;
            const validReferrals = driver.referrals
                ? driver.referrals.filter((r) => r.status === business_rules_1.BUSINESS_RULES.STATUS.DRIVER.ACTIVE && r.subscriptionPaid).length
                : 0;
            return {
                ...driver,
                activeAds: activeAdsCount,
                projectedEarnings: driver.status === business_rules_1.BUSINESS_RULES.STATUS.DRIVER.ACTIVE
                    ? activeAdsCount * business_rules_1.BUSINESS_RULES.DRIVER_RATE_PER_CAMPAIGN_RD
                    : 0,
                referralBonus: validReferrals * business_rules_1.BUSINESS_RULES.DRIVER_REFERRAL_BONUS_RD,
                advertiserReferralBonus: (driver.referredAdvertisers?.length || 0) * business_rules_1.BUSINESS_RULES.ADVERTISER_REFERRAL_BONUS_RD,
                referralsCount: validReferrals,
                advertiserReferralsCount: driver.referredAdvertisers?.length || 0,
            };
        });
    }
    async findOne(id) {
        return this.prisma.driver.findUnique({
            where: { id },
            include: {
                devices: true,
                subscriptions: { orderBy: { startDate: 'desc' } },
            },
        });
    }
    async create(data) {
        const plainPassword = data.password?.trim() ||
            generateTemporaryPassword();
        const hashedPassword = await bcrypt.hash(plainPassword, business_rules_1.BCRYPT_ROUNDS);
        const sanitizedCedula = data.cedula?.trim() || null;
        const sanitizedTaxiPlate = (data.taxiPlate || data.licensePlate)?.trim() || null;
        const driver = await this.prisma.driver
            .create({
            data: {
                fullName: data.fullName,
                cedula: sanitizedCedula,
                phone: data.phone,
                taxiPlate: sanitizedTaxiPlate,
                licensePlate: data.licensePlate,
                subscriptionPaid: data.subscriptionPaid ?? false,
                subscriptionEnd: data.subscriptionEnd,
                password: hashedPassword,
                insuranceAccepted: false,
                insuranceAcceptedAt: null,
                contractAccepted: data.contractAccepted ?? false,
                contractAcceptedAt: data.contractAccepted ? new Date() : null,
                agreementVersion: data.agreementVersion ?? '2.0',
                referredBy: data.referredBy || null,
                status: data.subscriptionPaid ? business_rules_1.BUSINESS_RULES.STATUS.DRIVER.ACTIVE : business_rules_1.BUSINESS_RULES.STATUS.DRIVER.INITIAL,
                onboardingStatus: data.contractAccepted ? business_rules_1.BUSINESS_RULES.STATUS.DRIVER.ONBOARDING.READY : business_rules_1.BUSINESS_RULES.STATUS.DRIVER.ONBOARDING.TOS_PENDING,
            },
            include: { devices: true },
        })
            .catch((err) => {
            const msg = err instanceof Error ? err.message : String(err);
            this.logger.error(`[DRIVER_CREATE] Fallo creando driver phone=${data.phone}: ${msg}`);
            if (typeof err === 'object' && err !== null && 'code' in err && err.code === 'P2002') {
                const meta = err.meta;
                const target = meta?.target || 'campo único';
                throw new common_1.BadRequestException(`Ya existe un conductor con ese valor (${target}). Verifica teléfono/cédula/placa.`);
            }
            throw new common_1.HttpException(`No se pudo crear el conductor: ${msg}`, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        });
        if (data.deviceId) {
            try {
                await this.prisma.device.update({
                    where: { deviceId: data.deviceId },
                    data: { driverId: driver.id },
                });
            }
            catch (err) {
                this.logger.warn(`[DRIVER_CREATE] No se pudo vincular deviceId ${data.deviceId} al conductor ${driver.id}: ${err.message}`);
            }
        }
        return {
            ...driver,
            generatedPassword: data.password ? null : plainPassword,
        };
    }
    async login(phone, pass) {
        let user;
        try {
            user = await this.prisma.driver.findUnique({ where: { phone } });
        }
        catch (err) {
            this.logger.error(`[DRIVER_LOGIN] DB lookup failed for phone ${phone}: ${err instanceof Error ? err.message : String(err)}`);
            throw new common_1.UnauthorizedException('No se pudo validar las credenciales');
        }
        if (!user) {
            throw new common_1.UnauthorizedException('Chofer no encontrado con este teléfono');
        }
        if (!user.password) {
            throw new common_1.UnauthorizedException('Debe configurar su contraseña contactando a soporte.');
        }
        const isMatch = await bcrypt.compare(pass, user.password);
        if (!isMatch) {
            throw new common_1.UnauthorizedException('Contraseña incorrecta');
        }
        const payload = {
            sub: user.id,
            phone: user.phone,
            role: 'DRIVER',
            app_metadata: {
                role: 'DRIVER',
                entityId: user.id,
            },
        };
        const jwtSecret = this.configService.get('SUPABASE_JWT_SECRET') || this.configService.get('JWT_SECRET');
        if (!jwtSecret) {
            this.logger.error('🚨 [DRIVER_LOGIN] JWT_SECRET no configurado. Login bloqueado por seguridad.');
            throw new common_1.ForbiddenException('AUTH_CONFIG_MISSING_JWT_SECRET');
        }
        const token = jwt.sign(payload, jwtSecret, { expiresIn: business_rules_1.JWT_EXPIRY });
        const device = await this.prisma.device.findFirst({ where: { driverId: user.id } });
        return {
            access_token: token,
            driverId: user.id,
            name: user.fullName,
            role: 'DRIVER',
            entityId: user.id,
            deviceId: device?.deviceId || null,
            subscriptionPaid: user.subscriptionPaid,
            contractAccepted: user.contractAccepted,
            agreementVersion: user.agreementVersion || null,
            onboardingStatus: user.onboardingStatus,
            bankAccountConfigured: this.hasBankAccountConfigured(user.bankAccount),
        };
    }
    async updateSubscription(id, paid, endDate) {
        return this.prisma.driver.update({
            where: { id },
            data: {
                subscriptionPaid: paid,
                subscriptionEnd: endDate,
                status: paid ? business_rules_1.BUSINESS_RULES.STATUS.DRIVER.ACTIVE : business_rules_1.BUSINESS_RULES.STATUS.DRIVER.SUSPENDED,
                blockedAt: paid ? null : new Date(),
            },
        });
    }
    async assignDevice(driverId, deviceId) {
        const driver = await this.prisma.driver.findUnique({ where: { id: driverId } });
        if (!driver)
            throw new Error('Chofer no encontrado');
        if (driver.status !== business_rules_1.BUSINESS_RULES.STATUS.DRIVER.ACTIVE && driver.onboardingStatus !== business_rules_1.BUSINESS_RULES.STATUS.DRIVER.ONBOARDING.READY) {
            throw new common_1.ForbiddenException(`Onboarding incompleto o suscripción no pagada. Asegúrate de abonar RD$${business_rules_1.BUSINESS_RULES.STARTER_KIT_ANNUAL_FEE_RD.toLocaleString()} primero.`);
        }
        const device = await this.prisma.device.findFirst({
            where: { OR: [{ deviceId }, { id: deviceId }] },
        });
        if (!device)
            throw new Error('Dispositivo no encontrado en el inventario');
        await this.prisma.device.updateMany({
            where: { driverId },
            data: { driverId: null },
        });
        return this.prisma.device.update({
            where: { id: device.id },
            data: { driverId },
        });
    }
    async unlinkDevice(driverId) {
        return this.prisma.device.updateMany({
            where: { driverId },
            data: { driverId: null },
        });
    }
    async acceptAgreement(driverId, version, ipAddress, userAgent) {
        const driver = await this.prisma.driver.findUnique({ where: { id: driverId } });
        if (!driver)
            throw new Error('Chofer no encontrado');
        if (driver.contractAccepted) {
            throw new Error('El conductor ya ha aceptado el contrato previamente');
        }
        await this.prisma.contractAcceptance.create({
            data: { driverId, version, ipAddress, userAgent },
        });
        return this.prisma.driver.update({
            where: { id: driverId },
            data: {
                contractAccepted: true,
                contractAcceptedAt: new Date(),
                agreementVersion: version,
                onboardingStatus: 'PENDING_PAYMENT',
            },
        });
    }
    async getStats() {
        const [total, active, suspended, unpaid] = await Promise.all([
            this.prisma.driver.count(),
            this.prisma.driver.count({ where: { status: business_rules_1.BUSINESS_RULES.STATUS.DRIVER.ACTIVE } }),
            this.prisma.driver.count({ where: { status: business_rules_1.BUSINESS_RULES.STATUS.DRIVER.SUSPENDED } }),
            this.prisma.driver.count({ where: { subscriptionPaid: false } }),
        ]);
        return { total, active, suspended, unpaid };
    }
    async getDriverHubData(deviceId) {
        this.logger.debug(`[HUB] Realizando consulta por deviceId: ${deviceId}`);
        const device = await this.prisma.device.findUnique({
            where: { deviceId },
            include: {
                driver: {
                    include: { referredAdvertisers: true },
                },
            },
        });
        if (!device) {
            throw new common_1.ForbiddenException('Dispositivo no encontrado.');
        }
        if (!device.driver) {
            this.logger.warn(`[HUB] Hub solicitado para deviceId ${deviceId} pero no tiene conductor vinculado.`);
            return {
                driverName: 'Sín Conductor',
                deviceId: device.deviceId,
                taxiNumber: device.taxiNumber || '---',
                phone: '---',
                cedula: '---',
                subscriptionPaid: false,
                adsPlayed: 0,
                activeAds: 0,
                projectedEarnings: 0,
                referralsCount: 0,
                referralEarnings: 0,
                lastPayment: null,
                totalPaid: 0,
                gpsPoints: 0,
                notices: []
            };
        }
        return this.buildHubData(device.driver, device.deviceId);
    }
    async getDriverHubDataByDeviceId(deviceId) {
        return this.getDriverHubData(deviceId);
    }
    async getDriverHubDataById(driverId) {
        this.logger.debug(`[DRIVER_HUB][GET_BY_ID] Start driverId=${driverId}`);
        try {
            if (!driverId) {
                throw new common_1.ForbiddenException('ID de conductor no proporcionado.');
            }
            const driver = await this.prisma.driver.findUnique({
                where: { id: driverId },
                include: {
                    devices: {
                        select: { id: true, deviceId: true, status: true }
                    },
                    referredAdvertisers: {
                        select: { id: true }
                    },
                },
            });
            if (!driver) {
                this.logger.error(`[DRIVER_HUB][GET_BY_ID][NOT_FOUND] driverId=${driverId}`);
                throw new common_1.ForbiddenException('Perfil de conductor no encontrado. Por favor, re-inicia sesión.');
            }
            const deviceId = driver.devices?.[0]?.deviceId || null;
            this.logger.debug(`[DRIVER_HUB][GET_BY_ID][FOUND] driverId=${driverId} deviceId=${deviceId}`);
            return await this.buildHubData(driver, deviceId);
        }
        catch (err) {
            this.logger.error(`[DRIVER_HUB][GET_BY_ID][ERROR] driverId=${driverId} message=${err.message}`, err.stack);
            if (err instanceof common_1.ForbiddenException)
                throw err;
            throw new Error(`Error al obtener datos del dashboard: ${err.message}`);
        }
    }
    async buildHubData(driver, deviceId) {
        this.logger.debug(`[HUB_BUILD] Iniciando construcción para ${driver.id}`);
        const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const monthEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59);
        const fetchAdsPlayed = deviceId
            ? this.prisma.analyticsEvent.count({
                where: { deviceId, eventType: { in: ['play_confirm', 'video_end', 'impression'] } }
            }).catch(e => { this.logger.warn(`[HUB_WARN] Error adsPlayed: ${e.message}`); return 0; })
            : Promise.resolve(0);
        const fetchGpsPoints = this.prisma.driverLocation.count({
            where: { driverId: driver.id, timestamp: { gte: monthStart, lte: monthEnd } }
        }).catch(e => { this.logger.warn(`[HUB_WARN] Error gpsPoints: ${e.message}`); return 0; });
        const fetchActiveAds = deviceId
            ? this.prisma.deviceCampaign.count({
                where: { device: { deviceId }, campaign: { status: 'ACTIVE' } }
            }).catch(e => {
                this.logger.warn(`[HUB_WARN] Error deviceCampaign count: ${e.message}. Using global fallback.`);
                return this.prisma.campaign.count({ where: { status: 'ACTIVE' } }).catch(() => 0);
            })
            : this.prisma.campaign.count({ where: { status: 'ACTIVE' } }).catch(() => 0);
        const fetchLastPayment = this.prisma.payrollPayment.findFirst({
            where: { driverId: driver.id },
            orderBy: { createdAt: 'desc' },
        }).catch(e => { this.logger.warn(`[HUB_WARN] Error lastPayment: ${e.message}`); return null; });
        const fetchTotalPaid = this.prisma.payrollPayment.aggregate({
            where: { driverId: driver.id, status: 'PAID' },
            _sum: { amount: true },
        }).catch(e => { this.logger.warn(`[HUB_WARN] Error totalPaid aggregate: ${e.message}`); return { _sum: { amount: 0 } }; });
        this.logger.debug(`[HUB_BUILD] Ejecutando queries paralelas...`);
        const [adsPlayed, gpsPoints, activeAdsCount, lastPayment, totalPaidSum,] = await Promise.all([
            fetchAdsPlayed,
            fetchGpsPoints,
            fetchActiveAds,
            fetchLastPayment,
            fetchTotalPaid,
        ]);
        this.logger.debug(`[HUB_BUILD] Datos base obtenidos. adsPlayed=${adsPlayed}, activeAds=${activeAdsCount}`);
        const projectedEarnings = driver.status === business_rules_1.BUSINESS_RULES.STATUS.DRIVER.ACTIVE
            ? (activeAdsCount || 0) * business_rules_1.BUSINESS_RULES.DRIVER_RATE_PER_CAMPAIGN_RD
            : 0;
        const referralsCount = await this.prisma.driver.count({
            where: { referredBy: driver.id, status: business_rules_1.BUSINESS_RULES.STATUS.DRIVER.ACTIVE, subscriptionPaid: true },
        }).catch(() => 0);
        const referralEarnings = referralsCount * business_rules_1.BUSINESS_RULES.DRIVER_REFERRAL_BONUS_RD;
        const advertiserReferralEarnings = (driver.referredAdvertisers?.length || 0) * business_rules_1.BUSINESS_RULES.ADVERTISER_REFERRAL_BONUS_RD;
        const totalPaid = totalPaidSum?._sum?.amount || 0;
        this.logger.debug(`[HUB_BUILD] Aplicando penalizaciones...`);
        let finalProjected = projectedEarnings;
        let penaltyApplied = false;
        let penaltyAmount = 0;
        try {
            const penaltyResult = await this.payrollAudit.applyPenaltyLogic(driver.id, projectedEarnings);
            finalProjected = penaltyResult.amount;
            penaltyApplied = penaltyResult.penaltyApplied;
            penaltyAmount = penaltyResult.penaltyAmount;
        }
        catch (pErr) {
            this.logger.error(`[HUB_ERROR] Error en applyPenaltyLogic: ${pErr.message}`);
        }
        const balance = finalProjected + referralEarnings + advertiserReferralEarnings - totalPaid;
        this.logger.log(`✅ [HUB_SUCCESS] Hub construido para ${driver.fullName} (${driver.id}). Balance: ${balance}`);
        return {
            driverId: driver.id,
            driverName: driver.fullName,
            level: driver.level,
            consecutiveMonthsUnderGoal: driver.consecutiveMonthsUnderGoal,
            phone: driver.phone,
            cedula: driver.cedula,
            taxiNumber: driver.taxiNumber || driver.taxiPlate || 'S/N',
            adsPlayed,
            projectedEarnings: finalProjected,
            baseEarnings: projectedEarnings,
            penaltyApplied,
            penaltyAmount,
            referralEarnings,
            referralsCount,
            advertiserReferralEarnings,
            advertiserReferralsCount: driver.referredAdvertisers?.length || 0,
            gpsPoints,
            activeAds: activeAdsCount,
            totalPaid,
            balance,
            lastPayment: lastPayment
                ? {
                    amount: lastPayment.amount,
                    status: lastPayment.status,
                    date: lastPayment.paidAt || lastPayment.createdAt,
                }
                : null,
            subscriptionStatus: driver.status,
            subscriptionPaid: driver.subscriptionPaid,
            contractAccepted: Boolean(driver.contractAccepted),
            agreementVersion: driver.agreementVersion || null,
            onboardingStatus: driver.onboardingStatus || 'UNKNOWN',
            bankAccountConfigured: this.hasBankAccountConfigured(driver.bankAccount),
            deviceId,
        };
    }
    async remove(id) {
        try {
            await this.prisma.device.updateMany({
                where: { driverId: id },
                data: { driverId: null },
            });
        }
        catch (err) {
            this.logger.warn(`[DRIVER_REMOVE] No se pudieron desvincular dispositivos del conductor ${id}: ${err.message}`);
        }
        return this.prisma.driver.delete({ where: { id } });
    }
    async purgeAll() {
        const nodeEnv = this.configService.get('NODE_ENV');
        if (nodeEnv === 'production') {
            this.logger.error('🚨 [DRIVER_PURGE][BLOCKED] Intento de purgeAll bloqueado en entorno production.');
            throw new common_1.ForbiddenException('PURGE_NOT_ALLOWED_IN_PRODUCTION');
        }
        this.logger.error(`[DRIVER_PURGE][CRITICAL] purgeAll ejecutado en entorno=${nodeEnv || 'undefined'}.`);
        const tables = [
            'driverLocation', 'payrollPayment', 'subscription',
            'analyticsEvent', 'deviceHeartbeat', 'playbackEvent',
            'deviceCommand', 'campaignMetric', 'playlistItem', 'deviceCampaign',
        ];
        for (const table of tables) {
            try {
                await this.prisma[table].deleteMany();
            }
            catch (err) {
                this.logger.warn(`[PURGE] Tabla ${table} falló o no existe: ${err.message}`);
            }
        }
        try {
            await this.prisma.device.updateMany({ data: { driverId: null } });
        }
        catch (err) {
            this.logger.warn(`[PURGE] No se pudo desvincular devices: ${err.message}`);
        }
        const [deletedDrivers, deletedDevices] = await Promise.all([
            this.prisma.driver.deleteMany(),
            this.prisma.device.deleteMany(),
        ]);
        this.logger.warn(`🚨 [PURGE] Base de datos limpiada: ${deletedDrivers.count} conductores, ${deletedDevices.count} dispositivos eliminados`);
        return {
            message: 'Base de datos limpiada exitosamente',
            deletedDrivers: deletedDrivers.count,
            deletedDevices: deletedDevices.count,
        };
    }
    async linkActiveAd(driverId, campaignId) {
        return this.prisma.activeAd.upsert({
            where: {
                driverId_campaignId: {
                    driverId,
                    campaignId,
                },
            },
            update: { status: 'ACTIVE' },
            create: {
                driverId,
                campaignId,
                status: 'ACTIVE',
            },
        });
    }
    async getDriverTransactions(driverId) {
        const payments = await this.prisma.payrollPayment.findMany({
            where: { driverId },
            orderBy: { createdAt: 'desc' },
            take: 50,
            select: {
                id: true,
                amount: true,
                status: true,
                month: true,
                year: true,
                paidAt: true,
                createdAt: true,
                penaltyApplied: true,
                penaltyPercentage: true,
                transmissionHours: true,
                activeAds: true,
                gpsPoints: true,
            },
        });
        const subscriptions = await this.prisma.subscription.findMany({
            where: { driverId },
            orderBy: { createdAt: 'desc' },
            take: 20,
            select: {
                id: true,
                plan: true,
                amount: true,
                status: true,
                validUntil: true,
                paidAt: true,
                createdAt: true,
            },
        });
        const transactions = [
            ...payments.map(p => ({
                id: p.id,
                type: 'EARNING',
                amount: p.amount,
                date: (p.paidAt || p.createdAt).toISOString(),
                desc: `Ganancias ${p.month}/${p.year} — ${p.activeAds} campañas, ${p.gpsPoints} puntos GPS`,
                status: p.status,
                penaltyApplied: p.penaltyApplied,
                penaltyPercentage: p.penaltyPercentage,
                transmissionHours: p.transmissionHours,
                activeAds: p.activeAds,
                gpsPoints: p.gpsPoints,
            })),
            ...subscriptions.map(s => ({
                id: s.id,
                type: s.status === 'ACTIVE' && s.paidAt ? 'SUBSCRIPTION' : 'SUBSCRIPTION_PENDING',
                amount: -s.amount,
                date: (s.paidAt || s.createdAt).toISOString(),
                desc: `${s.plan} — ${s.status}`,
                status: s.status,
                validUntil: s.validUntil?.toISOString() || null,
            })),
        ];
        return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
};
exports.DriversService = DriversService;
exports.DriversService = DriversService = DriversService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService,
        payroll_audit_service_1.PayrollAuditService])
], DriversService);
//# sourceMappingURL=drivers.service.js.map