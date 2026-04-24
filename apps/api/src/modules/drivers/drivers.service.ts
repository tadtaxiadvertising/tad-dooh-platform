import { Injectable, Logger, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { BUSINESS_RULES, BCRYPT_ROUNDS, JWT_EXPIRY } from '../../common/constants/business-rules';
import { PayrollAuditService } from './payroll-audit.service';

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  entityId?: string;
}

@Injectable()
export class DriversService {
  private readonly logger = new Logger(DriversService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private readonly payrollAudit: PayrollAuditService
  ) {}

  /**
   * REGLA DE NEGOCIO 1: Validar acceso a la publicidad
   * [ACTUALIZADO]: El contenido se transmite siempre sin restricciones.
   */
  async checkTabletAccess(tabletId: string) {
    const device = await this.prisma.device.findUnique({
      where: { id: tabletId },
      include: { driver: true }
    });

    if (!device || !device.driver) {
      return { access: false, action: 'SHOW_SETUP_SCREEN', message: 'Tablet no asignada a un chofer.' };
    }

    return { access: true, action: 'PLAY_ADS' };
  }

  /**
   * REGLA DE NEGOCIO 2: Cálculo automático de pagos
   * RD$500 al mes por anuncio activo reproducido en su tablet.
   */
  async calculateMonthlyEarnings(driverId: string) {
    // FIX A-1: Contar solo las campañas asignadas al dispositivo del conductor, no globalmente
    const activeCampaignsCount = await this.prisma.deviceCampaign.count({
      where: {
        device: { driverId },
        campaign: { status: 'ACTIVE' },
      },
    }).catch(async () => {
      // Fallback: si DeviceCampaign no tiene datos, usar conteo global
      return this.prisma.campaign.count({ where: { status: 'ACTIVE' } });
    });

    const baseEarnings = activeCampaignsCount * BUSINESS_RULES.DRIVER_RATE_PER_CAMPAIGN_RD;
    
    // Aplicar lógica de auditoría y penalizaciones
    const { amount, penaltyApplied, penaltyAmount } = await this.payrollAudit.applyPenaltyLogic(driverId, baseEarnings);

    return {
      driverId,
      activeCampaigns: activeCampaignsCount,
      baseEarningsRD: baseEarnings,
      projectedEarningsRD: amount,
      penaltyApplied,
      penaltyAmount,
      currency: 'DOP',
    };
  }

  /**
   * Listar todos los choferes con su dispositivo y estado de suscripción
   */
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
        } as any,
        orderBy: { createdAt: 'desc' },
      }),
      // FIX M-2: Usar constante en lugar de magic number
      this.prisma.campaign.count({ where: { status: 'ACTIVE' } }),
    ]);

    return drivers.map(d => {
      const driver = d as any;
      const validReferrals = driver.referrals
        ? driver.referrals.filter((r: any) => r.status === BUSINESS_RULES.STATUS.DRIVER.ACTIVE && r.subscriptionPaid).length
        : 0;

      return {
        ...driver,
        activeAds: activeAdsCount,
        // FIX M-2: Usar constantes en lugar de magic numbers
        projectedEarnings: driver.status === BUSINESS_RULES.STATUS.DRIVER.ACTIVE
          ? activeAdsCount * BUSINESS_RULES.DRIVER_RATE_PER_CAMPAIGN_RD
          : 0,
        referralBonus: validReferrals * BUSINESS_RULES.DRIVER_REFERRAL_BONUS_RD,
        advertiserReferralBonus: (driver.referredAdvertisers?.length || 0) * BUSINESS_RULES.ADVERTISER_REFERRAL_BONUS_RD,
        referralsCount: validReferrals,
        advertiserReferralsCount: driver.referredAdvertisers?.length || 0,
      };
    });
  }

  /**
   * Buscar un chofer por ID
   */
  async findOne(id: string) {
    return this.prisma.driver.findUnique({
      where: { id },
      include: {
        devices: true,
        subscriptions: { orderBy: { startDate: 'desc' } },
      },
    });
  }

  /**
   * Registrar un nuevo chofer con su suscripción
   */
  async create(data: {
    fullName: string;
    cedula?: string;
    phone: string;
    taxiPlate?: string;
    licensePlate?: string;
    deviceId?: string;
    subscriptionPaid?: boolean;
    subscriptionEnd?: Date;
    password?: string;
    contractAccepted?: boolean;
    agreementVersion?: string;
    referredBy?: string;
  }) {
    let hashedPassword: string | null = null;
    if (data.password) {
      // FIX B-2: Usar constante BCRYPT_ROUNDS en lugar de magic number
      hashedPassword = await bcrypt.hash(data.password, BCRYPT_ROUNDS);
    }

    // SANEAMIENTO DE DATOS: Campos opcionales únicos deben ser null si están vacíos
    const sanitizedCedula = data.cedula?.trim() || null;
    const sanitizedTaxiPlate = (data.taxiPlate || data.licensePlate)?.trim() || null;

    const driver = await this.prisma.driver.create({
      data: {
        fullName: data.fullName,
        cedula: sanitizedCedula,
        phone: data.phone,
        taxiPlate: sanitizedTaxiPlate,
        licensePlate: data.licensePlate,
        subscriptionPaid: data.subscriptionPaid ?? false,
        subscriptionEnd: data.subscriptionEnd,
        password: hashedPassword,
        insuranceAccepted: false, // Deprecated — TAD no longer offers insurance
        insuranceAcceptedAt: null,
        contractAccepted: data.contractAccepted ?? false,
        contractAcceptedAt: data.contractAccepted ? new Date() : null,
        agreementVersion: data.agreementVersion ?? '2.0',
        referredBy: data.referredBy || null,
        status: data.subscriptionPaid ? BUSINESS_RULES.STATUS.DRIVER.ACTIVE : BUSINESS_RULES.STATUS.DRIVER.INITIAL,
        onboardingStatus: data.contractAccepted ? BUSINESS_RULES.STATUS.DRIVER.ONBOARDING.READY : BUSINESS_RULES.STATUS.DRIVER.ONBOARDING.TOS_PENDING,
      },
      include: { devices: true },
    });

    if (data.deviceId) {
      // FIX M-5: Loguear errores silenciados en lugar de descartarlos
      try {
        await this.prisma.device.update({
          where: { deviceId: data.deviceId },
          data: { driverId: driver.id },
        });
      } catch (err) {
        this.logger.warn(
          `[DRIVER_CREATE] No se pudo vincular deviceId ${data.deviceId} al conductor ${driver.id}: ${err.message}`,
        );
      }
    }

    return driver;
  }

  async login(phone: string, pass: string) {
    const user = await this.prisma.driver.findUnique({ where: { phone } });
    if (!user) {
      throw new UnauthorizedException('Chofer no encontrado con este teléfono');
    }

    if (!user.password) {
      throw new UnauthorizedException('Debe configurar su contraseña contactando a soporte.');
    }

    const isMatch = await bcrypt.compare(pass, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Contraseña incorrecta');
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

    // FIX C-1: NO usar fallback hardcodeado. Si no hay secreto, el token no se puede firmar.
    const jwtSecret = this.configService.get<string>('SUPABASE_JWT_SECRET') || this.configService.get<string>('JWT_SECRET');
    if (!jwtSecret) {
      this.logger.error('🚨 [DRIVER_LOGIN] JWT_SECRET no configurado. Login bloqueado por seguridad.');
      throw new ForbiddenException('Error de configuración del servidor. Contacta al administrador.');
    }

    const token = jwt.sign(payload, jwtSecret, { expiresIn: JWT_EXPIRY });

    const device = await this.prisma.device.findFirst({ where: { driverId: user.id } });

    return {
      access_token: token,
      driverId: user.id,
      name: user.fullName,
      role: 'DRIVER',
      entityId: user.id,
      deviceId: device?.deviceId || null,
    };
  }

  /**
   * Actualizar el estado de suscripción de un chofer
   */
  async updateSubscription(id: string, paid: boolean, endDate?: Date) {
    return this.prisma.driver.update({
      where: { id },
      data: {
        subscriptionPaid: paid,
        subscriptionEnd: endDate,
        status: paid ? BUSINESS_RULES.STATUS.DRIVER.ACTIVE : BUSINESS_RULES.STATUS.DRIVER.SUSPENDED,
        blockedAt: paid ? null : new Date(),
      },
    });
  }

  /**
   * Assign a hardware device to a driver
   */
  async assignDevice(driverId: string, deviceId: string) {
    const driver = await this.prisma.driver.findUnique({ where: { id: driverId } });
    if (!driver) throw new Error('Chofer no encontrado');

    if (driver.status !== BUSINESS_RULES.STATUS.DRIVER.ACTIVE && driver.onboardingStatus !== BUSINESS_RULES.STATUS.DRIVER.ONBOARDING.READY) {
      throw new ForbiddenException(
        `Onboarding incompleto o suscripción no pagada. Asegúrate de abonar RD$${BUSINESS_RULES.STARTER_KIT_ANNUAL_FEE_RD.toLocaleString()} primero.`,
      );
    }

    const device = await this.prisma.device.findFirst({
      where: { OR: [{ deviceId }, { id: deviceId }] },
    });
    if (!device) throw new Error('Dispositivo no encontrado en el inventario');

    // Remove any existing bindings this driver has
    await this.prisma.device.updateMany({
      where: { driverId },
      data: { driverId: null },
    });

    return this.prisma.device.update({
      where: { id: device.id },
      data: { driverId },
    });
  }

  /**
   * Unlink a hardware device from a driver
   */
  async unlinkDevice(driverId: string) {
    return this.prisma.device.updateMany({
      where: { driverId },
      data: { driverId: null },
    });
  }

  /**
   * Aceptar firma electrónica del contrato y pasar a PENDING_PAYMENT
   */
  async acceptAgreement(driverId: string, version: string, ipAddress: string, userAgent: string) {
    const driver = await this.prisma.driver.findUnique({ where: { id: driverId } });
    if (!driver) throw new Error('Chofer no encontrado');

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

  /**
   * Estadísticas generales de la red de choferes
   */
  async getStats() {
    const [total, active, suspended, unpaid] = await Promise.all([
      this.prisma.driver.count(),
      this.prisma.driver.count({ where: { status: BUSINESS_RULES.STATUS.DRIVER.ACTIVE } }),
      this.prisma.driver.count({ where: { status: BUSINESS_RULES.STATUS.DRIVER.SUSPENDED } }),
      this.prisma.driver.count({ where: { subscriptionPaid: false } }),
    ]);

    return { total, active, suspended, unpaid };
  }

  /**
   * ESTADÍSTICAS PARA EL PORTAL DEL CHOFER por deviceId
   */
  async getDriverHubData(deviceId: string) {
    this.logger.debug(`[HUB] Realizando consulta por deviceId: ${deviceId}`);
    const device = await this.prisma.device.findUnique({
      where: { deviceId },
      include: {
        driver: {
          include: { referredAdvertisers: true } as any,
        },
      } as any,
    });

    if (!device || !device.driver) {
      this.logger.warn(`[HUB] Hub solicitado para deviceId ${deviceId} pero no tiene conductor vinculado.`);
      throw new ForbiddenException('Dispositivo no vinculado a un chofer o perfil inexistente.');
    }

    return this.buildHubData(device.driver, device.deviceId);
  }

  /**
   * ESTADÍSTICAS PARA EL PORTAL DEL CHOFER por Driver ID
   */
  async getDriverHubDataById(driverId: string) {
    this.logger.debug(`[HUB] Generando datos del hub para driverId: ${driverId}`);
    try {
      if (!driverId) {
        throw new ForbiddenException('ID de conductor no proporcionado.');
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
        } as any,
      });

      if (!driver) {
        this.logger.error(`[HUB_ERROR] Driver ID ${driverId} no encontrado en Base de Datos.`);
        throw new ForbiddenException('Perfil de conductor no encontrado. Por favor, re-inicia sesión.');
      }

      const deviceId = (driver as any).devices?.[0]?.deviceId || null;
      this.logger.debug(`[HUB] Conductor encontrado: ${driver.fullName}, DeviceId: ${deviceId}`);
      
      return await this.buildHubData(driver, deviceId);
    } catch (err) {
      this.logger.error(`🚨 [HUB_CRITICAL] Fallo en getDriverHubDataById para ID ${driverId}: ${err.message}`, err.stack);
      // Evitar que el 500 rompa el portal si es posible devolver un error controlado
      if (err instanceof ForbiddenException) throw err;
      throw new Error(`Error al obtener datos del dashboard: ${err.message}`);
    }
  }

  /**
   * Método interno para construir el payload del Hub
   */
  private async buildHubData(driver: any, deviceId: string | null) {
    this.logger.debug(`[HUB_BUILD] Iniciando construcción para ${driver.id}`);
    
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const monthEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59);

    // Queries en paralelo con manejo individual de errores
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

    const [
      adsPlayed,
      gpsPoints,
      activeAdsCount,
      lastPayment,
      totalPaidSum,
    ] = await Promise.all([
      fetchAdsPlayed,
      fetchGpsPoints,
      fetchActiveAds,
      fetchLastPayment,
      fetchTotalPaid,
    ]);

    this.logger.debug(`[HUB_BUILD] Datos base obtenidos. adsPlayed=${adsPlayed}, activeAds=${activeAdsCount}`);

    // El bono GPS ha sido eliminado en v10.1.0

    const projectedEarnings = driver.status === BUSINESS_RULES.STATUS.DRIVER.ACTIVE
      ? (activeAdsCount || 0) * BUSINESS_RULES.DRIVER_RATE_PER_CAMPAIGN_RD
      : 0;

    // Referidos (Conteo defensivo con catch)
    const referralsCount = await this.prisma.driver.count({
      where: { referredBy: driver.id, status: BUSINESS_RULES.STATUS.DRIVER.ACTIVE, subscriptionPaid: true },
    }).catch(() => 0);

    const referralEarnings = referralsCount * BUSINESS_RULES.DRIVER_REFERRAL_BONUS_RD;
    const advertiserReferralEarnings = (driver.referredAdvertisers?.length || 0) * BUSINESS_RULES.ADVERTISER_REFERRAL_BONUS_RD;

    const totalPaid = (totalPaidSum as any)?._sum?.amount || 0;
    
    this.logger.debug(`[HUB_BUILD] Aplicando penalizaciones...`);
    
    // Aplicar penalizaciones al proyectado si aplica
    let finalProjected = projectedEarnings;
    let penaltyApplied = false;
    let penaltyAmount = 0;

    try {
      const penaltyResult = await this.payrollAudit.applyPenaltyLogic(driver.id, projectedEarnings);
      finalProjected = penaltyResult.amount;
      penaltyApplied = penaltyResult.penaltyApplied;
      penaltyAmount = penaltyResult.penaltyAmount;
    } catch (pErr) {
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
      deviceId,
    };
  }

  /**
   * Eliminar un chofer por ID (desvincula tablet automáticamente)
   */
  async remove(id: string) {
    // FIX M-5: Loguear si falla la desvinculación en lugar de descartarlo silenciosamente
    try {
      await this.prisma.device.updateMany({
        where: { driverId: id },
        data: { driverId: null },
      });
    } catch (err) {
      this.logger.warn(`[DRIVER_REMOVE] No se pudieron desvincular dispositivos del conductor ${id}: ${err.message}`);
    }

    return this.prisma.driver.delete({ where: { id } });
  }

  /**
   * PURGA TOTAL — FK-safe según schema.prisma real
   * Orden: tablas hijas → drivers → devices
   * NOTA: Este método solo debe llamarse desde el controlador con doble validación de seguridad.
   */
  async purgeAll() {
    const tables = [
      'driverLocation', 'payrollPayment', 'subscription',
      'analyticsEvent', 'deviceHeartbeat', 'playbackEvent',
      'deviceCommand', 'campaignMetric', 'playlistItem', 'deviceCampaign',
    ];

    for (const table of tables) {
      try {
        await (this.prisma as any)[table].deleteMany();
      } catch (err) {
        this.logger.warn(`[PURGE] Tabla ${table} falló o no existe: ${err.message}`);
      }
    }

    try {
      await this.prisma.device.updateMany({ data: { driverId: null } });
    } catch (err) {
      this.logger.warn(`[PURGE] No se pudo desvincular devices: ${err.message}`);
    }

    const [deletedDrivers, deletedDevices] = await Promise.all([
      this.prisma.driver.deleteMany(),
      this.prisma.device.deleteMany(),
    ]);

    this.logger.warn(
      `🚨 [PURGE] Base de datos limpiada: ${deletedDrivers.count} conductores, ${deletedDevices.count} dispositivos eliminados`,
    );

    return {
      message: 'Base de datos limpiada exitosamente',
      deletedDrivers: deletedDrivers.count,
      deletedDevices: deletedDevices.count,
    };
  }

  /**
   * Link an active ad to a driver (V12 Financial Logic)
   */
  async linkActiveAd(driverId: string, campaignId: string) {
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
}
