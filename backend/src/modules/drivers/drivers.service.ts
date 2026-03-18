import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DriversService {
  private readonly logger = new Logger(DriversService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * REGLA DE NEGOCIO 1: Validar acceso a la publicidad
   * Si no hay suscripción activa (RD$6,000), la tablet se bloquea.
   */
  async checkTabletAccess(tabletId: string) {
    const device = await this.prisma.device.findUnique({
      where: { id: tabletId },
      include: { driver: true }
    });

    if (!device || !device.driver) {
      return { access: false, action: 'SHOW_SETUP_SCREEN', message: 'Tablet no asignada a un chofer.' };
    }

    const { driver } = device;

    // Validación estricta de suscripción
    if (!driver.subscriptionPaid || (driver.subscriptionEnd && driver.subscriptionEnd < new Date())) {
      return {
        access: false,
        action: 'LOCK_SCREEN',
        message: 'Suscripción anual de RD$6,000 vencida o no pagada. Por favor, contacte a soporte TAD (809-XXX-XXXX) para reactivar su cuenta y generar ingresos.'
      };
    }

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
        device: {
          select: {
            id: true,
            deviceId: true,
            status: true,
            batteryLevel: true,
            appVersion: true,
            lastSeen: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Get active campaigns count for earnings calculation
    const activeAdsCount = await this.prisma.campaign.count({
      where: { status: 'ACTIVE' }
    });

    return drivers.map(driver => ({
      ...driver,
      activeAds: activeAdsCount,
      projectedEarnings: driver.status === 'ACTIVE' ? (activeAdsCount * 500) : 0
    }));
  }

  /**
   * Buscar un chofer por ID
   */
  async findOne(id: string) {
    return this.prisma.driver.findUnique({
      where: { id },
      include: { 
        device: true,
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
  }) {
    return this.prisma.driver.create({
      data: {
        fullName: data.fullName,
        cedula: data.cedula,
        phone: data.phone,
        taxiPlate: data.taxiPlate,
        licensePlate: data.licensePlate,
        deviceId: data.deviceId,
        subscriptionPaid: data.subscriptionPaid ?? false,
        subscriptionEnd: data.subscriptionEnd,
      },
      include: { device: true }
    });
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
}
