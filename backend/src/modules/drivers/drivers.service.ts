import { Injectable, Logger, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class DriversService {
  private readonly logger = new Logger(DriversService.name);

  constructor(private prisma: PrismaService) {}

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

    // El contenido siempre debe transmitirse sin restricciones (Decisión del Usuario)
    return { access: true, action: 'PLAY_ADS' };
  }

  /**
   * REGLA DE NEGOCIO 2: Cálculo automático de pagos
   * RD$500 al mes por anuncio activo reproducido en su tablet.
   */
  async calculateMonthlyEarnings(driverId: string) {
    const activeCampaignsCount = await this.prisma.campaign.count({
      where: { status: 'ACTIVE' }
    });

    const ratePerAdRD = 500;
    const monthlyEarnings = activeCampaignsCount * ratePerAdRD;
    
    return {
      driverId,
      activeCampaigns: activeCampaignsCount,
      projectedEarningsRD: monthlyEarnings,
      currency: 'DOP'
    };
  }

  /**
   * Listar todos los choferes con su dispositivo y estado de suscripción
   */
  async findAll() {
    const drivers = await this.prisma.driver.findMany({
      include: { 
        devices: {
          select: {
            id: true,
            deviceId: true,
            status: true,
            batteryLevel: true,
            appVersion: true,
            lastSeen: true,
          }
        },
        referrals: {
          select: { id: true, status: true, subscriptionPaid: true }
        },
        referredAdvertisers: {
          select: { id: true, status: true }
        }
      } as any,
      orderBy: { createdAt: 'desc' }
    });

    // Get active campaigns count for earnings calculation
    const activeAdsCount = await this.prisma.campaign.count({
      where: { status: 'ACTIVE' }
    });

    return drivers.map(d => {
      const driver = d as any;
      // Logic for referrals: calculate active referrals paying subscription
      const validReferrals = driver.referrals ? driver.referrals.filter((r: any) => r.status === 'ACTIVE' && r.subscriptionPaid).length : 0;
      
      return {
        ...driver,
        activeAds: activeAdsCount,
        projectedEarnings: driver.status === 'ACTIVE' ? (activeAdsCount * 500) : 0,
        referralBonus: validReferrals * 500, // This is the ONLY commission/bonus per driver referral
        advertiserReferralBonus: (driver.referredAdvertisers?.length || 0) * 500,
        referralsCount: validReferrals,
        advertiserReferralsCount: (driver.referredAdvertisers?.length || 0)
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
        subscriptions: { orderBy: { startDate: 'desc' } }
      }
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
    insuranceAccepted?: boolean;
    contractAccepted?: boolean;
    agreementVersion?: string;
  }) {
    let hashedPassword = null;
    if (data.password) {
      hashedPassword = await bcrypt.hash(data.password, 10);
    }

    const driver = await this.prisma.driver.create({
      data: {
        fullName: data.fullName,
        cedula: data.cedula,
        phone: data.phone,
        taxiPlate: data.taxiPlate,
        licensePlate: data.licensePlate,
        subscriptionPaid: data.subscriptionPaid ?? false,
        subscriptionEnd: data.subscriptionEnd,
        password: hashedPassword,
        
        // Agreement fields
        insuranceAccepted: data.insuranceAccepted ?? false,
        insuranceAcceptedAt: data.insuranceAccepted ? new Date() : null,
        contractAccepted: data.contractAccepted ?? false,
        contractAcceptedAt: data.contractAccepted ? new Date() : null,
        agreementVersion: data.agreementVersion ?? "1.0",
      },
      include: { devices: true }
    });

    if (data.deviceId) {
      await this.prisma.device.update({
        where: { deviceId: data.deviceId },
        data: { driverId: driver.id }
      }).catch(() => null);
    }

    return driver;
  }

  async login(phone: string, pass: string) {
    const user = await this.prisma.driver.findUnique({ where: { phone } });
    if (!user) {
      throw new UnauthorizedException('Chofer no encontrado con este teléfono');
    }

    let isMatch = false;
    if (user.password) {
      isMatch = await bcrypt.compare(pass, user.password);
    } else {
      throw new UnauthorizedException('Debe configurar su contraseña contactando a soporte.');
    }

    if (!isMatch) {
      throw new UnauthorizedException('Contraseña incorrecta');
    }

    const payload = { sub: user.id, phone: user.phone, role: 'driver' };
    const token = jwt.sign(payload, process.env.JWT_SECRET || 'tad-super-secret-key-2024', { expiresIn: '7d' });

    // Retornamos también el deviceId (si tiene) para compatibilidad con la app actual
    const device = await this.prisma.device.findFirst({ where: { driverId: user.id } });

    return {
      access_token: token,
      driverId: user.id,
      name: user.fullName,
      deviceId: device?.deviceId || null
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
        status: paid ? 'ACTIVE' : 'SUSPENDED',
        blockedAt: paid ? null : new Date(),
      }
    });
  }

  /**
   * Assign a hardware device to a driver
   */
  async assignDevice(driverId: string, deviceId: string) {
    const driver = await this.prisma.driver.findUnique({ where: { id: driverId } });
    if (!driver) throw new Error('Chofer no encontrado');

    // REGLA DE NEGOCIO ORO: Solo se asigna Hardware a usuarios con onboarding ACTIVE (PAGO REALIZADO)
    if (driver.status !== 'ACTIVE' && driver.onboardingStatus !== 'ACTIVE') {
      throw new ForbiddenException('Onboarding incompleto o suscripción no pagada. Asegúrate de abonar RD$6,000 primero.');
    }

    const device = await this.prisma.device.findFirst({
      where: { OR: [{ deviceId }, { id: deviceId }] }
    });
    if (!device) throw new Error('Dispositivo no encontrado en el inventario');

    // Remove any existing bindings this driver has
    await this.prisma.device.updateMany({
      where: { driverId },
      data: { driverId: null }
    });

    // Assign the new device
    return this.prisma.device.update({
      where: { id: device.id },
      data: { driverId }
    });
  }

  /**
   * Unlink a hardware device from a driver
   */
  async unlinkDevice(driverId: string) {
    return this.prisma.device.updateMany({
      where: { driverId },
      data: { driverId: null }
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
      data: {
        driverId,
        version,
        ipAddress,
        userAgent
      }
    });

    return this.prisma.driver.update({
      where: { id: driverId },
      data: {
        contractAccepted: true,
        contractAcceptedAt: new Date(),
        agreementVersion: version,
        onboardingStatus: 'PENDING_PAYMENT'
      }
    });
  }

  /**
   * Estadísticas generales de la red de choferes
   */
  async getStats() {
    const [total, active, suspended, unpaid] = await Promise.all([
      this.prisma.driver.count(),
      this.prisma.driver.count({ where: { status: 'ACTIVE' } }),
      this.prisma.driver.count({ where: { status: 'SUSPENDED' } }),
      this.prisma.driver.count({ where: { subscriptionPaid: false } }),
    ]);

    return { total, active, suspended, unpaid };
  }

  /**
   * ESTADÍSTICAS PARA EL PORTAL DEL CHOFER (TAD DRIVER)
   * Retorna ganancias, anuncios reproducidos y estado de suscripción por deviceId.
   */
  async getDriverHubData(deviceId: string) {
    const device = await this.prisma.device.findUnique({
      where: { deviceId },
      include: { 
        driver: {
          include: { referredAdvertisers: true } as any
        } 
      } as any
    });

    if (!device || !device.driver) {
      throw new Error('Dispositivo no vinculado a un chofer.');
    }

    return this.buildHubData(device.driver, device.deviceId);
  }

  /**
   * ESTADÍSTICAS PARA EL PORTAL DEL CHOFER (TAD DRIVER) por Driver ID
   */
  async getDriverHubDataById(driverId: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
      include: { 
        devices: true,
        referredAdvertisers: true 
      } as any
    });

    if (!driver) {
      throw new Error('Chofer no encontrado.');
    }

    // Usar el primer dispositivo vinculado si existe
    const deviceId = (driver as any).devices?.[0]?.deviceId || null;
    return this.buildHubData(driver, deviceId);
  }

  /**
   * Método interno para construir el payload del Hub
   */
  private async buildHubData(driver: any, deviceId: string | null) {
    // 1. Conteo de anuncios reproducidos (confirmados)
    let adsPlayed = 0;
    if (deviceId) {
      adsPlayed = await this.prisma.analyticsEvent.count({
        where: { 
          deviceId,
          eventType: { in: ['play_confirm', 'video_end', 'impression'] }
        }
      });
    }

    // 1.5. GPS Points & Bonus Eligibility
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const monthEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59);
    
    const gpsPoints = await this.prisma.driverLocation.count({
      where: {
        driverId: driver.id,
        timestamp: { gte: monthStart, lte: monthEnd }
      }
    });
    const qualifiesForGpsBonus = gpsPoints >= 100;
    const gpsBonus = qualifiesForGpsBonus ? 500 : 0;

    // 2. Ganancias proyectadas basadas en pautas activas (RD$500 c/u)
    const activeAdsCount = await this.prisma.campaign.count({
      where: { status: 'ACTIVE' }
    });
    
    const projectedEarnings = driver.status === 'ACTIVE' ? (activeAdsCount * 500) : 0;

    // 3. Pagos realizados/pendientes
    const lastPayment = await this.prisma.payrollPayment.findFirst({
      where: { driverId: driver.id },
      orderBy: { createdAt: 'desc' }
    });

    const totalPaidSum = await this.prisma.payrollPayment.aggregate({
      where: { driverId: driver.id, status: 'PAID' },
      _sum: { amount: true }
    });

    // 4. Comisiones por referidos (RD$500 por cada chofer activo referido)
    const referralsResult = await this.prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count FROM drivers
      WHERE referred_by = ${driver.id} AND status = 'ACTIVE' AND subscription_paid = true
    `;
    const referralsCount = Number(referralsResult[0]?.count ?? 0);
    const referralEarnings = referralsCount * 500;

    return {
      driverId: driver.id,
      driverName: driver.fullName,
      phone: driver.phone,
      cedula: driver.cedula,
      taxiNumber: driver.taxiNumber || driver.taxiPlate || 'S/N',
      adsPlayed,
      projectedEarnings,
      referralEarnings,
      referralsCount,
      advertiserReferralEarnings: (driver.referredAdvertisers?.length || 0) * 500,
      advertiserReferralsCount: (driver.referredAdvertisers?.length || 0),
      gpsPoints,
      gpsBonus,
      qualifiesForGpsBonus,
      activeAds: activeAdsCount,
      totalPaid: (totalPaidSum as any)._sum.amount || 0,
      lastPayment: lastPayment ? {
        amount: lastPayment.amount,
        status: lastPayment.status,
        date: lastPayment.paidAt || lastPayment.createdAt
      } : null,
      subscriptionStatus: driver.status,
      subscriptionPaid: driver.subscriptionPaid,
      deviceId
    };
  }

  /**
   * Eliminar un chofer por ID (desvincula tablet automáticamente)
   */
  async remove(id: string) {
    // Desvincular dispositivos primero
    await this.prisma.device.updateMany({
      where: { driverId: id },
      data: { driverId: null },
    }).catch(() => null);

    return this.prisma.driver.delete({ where: { id } });
  }

  /**
   * PURGA TOTAL — FK-safe según schema.prisma real
   * Orden: tablas hijas → drivers → devices
   */
  async purgeAll() {
    // Tablas que referencian a Driver (con onDelete: Cascade en schema)
    await this.prisma.driverLocation.deleteMany().catch(() => null);
    await this.prisma.payrollPayment.deleteMany().catch(() => null);
    await this.prisma.subscription.deleteMany().catch(() => null);

    // Tablas que referencian a Device directamente
    await this.prisma.analyticsEvent.deleteMany().catch(() => null);
    await this.prisma.deviceHeartbeat.deleteMany().catch(() => null);
    await this.prisma.playbackEvent.deleteMany().catch(() => null);
    await this.prisma.deviceCommand.deleteMany().catch(() => null);
    await this.prisma.campaignMetric.deleteMany().catch(() => null);
    await this.prisma.playlistItem.deleteMany().catch(() => null);
    await this.prisma.deviceCampaign.deleteMany().catch(() => null);

    // Desvincular drivers de devices para romper FK
    await this.prisma.device.updateMany({ data: { driverId: null } }).catch(() => null);

    // Borrar drivers y devices
    const deletedDrivers = await this.prisma.driver.deleteMany();
    const deletedDevices = await this.prisma.device.deleteMany();

    return {
      message: 'Base de datos limpiada exitosamente',
      deletedDrivers: deletedDrivers.count,
      deletedDevices: deletedDevices.count,
    };
  }
}
