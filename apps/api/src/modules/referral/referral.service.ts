import { Injectable, NotFoundException, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { BUSINESS_RULES } from "../../common/constants/business-rules";

@Injectable()
export class ReferralService {
  private readonly logger = new Logger(ReferralService.name);
  constructor(private readonly prisma: PrismaService) {}

  async generate(driverId: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
      select: { referralCode: true },
    });

    if (!driver) throw new NotFoundException("Driver not found");

    const code = driver.referralCode;
    const url = `https://tad.anunciante.ibusiness.com.do/advertiser/onboarding?ref=${code}`;

    return {
      driverId,
      referralCode: code,
      url,
      qrPayload: url,
    };
  }

  async getStats() {
    const topRecruiters = await this.prisma.driver.findMany({
      where: { referrals: { some: {} } },
      select: {
        id: true,
        fullName: true,
        referralCode: true,
        _count: {
          select: { referrals: true },
        },
      },
      orderBy: { referrals: { _count: "desc" } },
      take: 10,
    });

    const totalReferrals = await this.prisma.driver.count({
      where: { referredBy: { not: null } },
    });

    const pendingCommissions = await this.prisma.commission.aggregate({
      where: { status: "PENDING", sourceType: "DRIVER_REFERRAL" },
      _sum: { amount: true },
    });

    return {
      topRecruiters,
      totalReferrals,
      pendingCommissions: pendingCommissions._sum.amount || 0,
    };
  }

  async getNetwork() {
    return this.prisma.driver.findMany({
      where: { referredBy: { not: null } },
      select: {
        id: true,
        fullName: true,
        referredBy: true,
        createdAt: true,
        status: true,
        referredByDriver: {
          select: {
            fullName: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Driver self-service: obtener su propio código real + URL + QR payload.
   * Usa el referralCode ya existente del driver (UUID único, auto-generado en DB).
   */
  async getMyCode(driverId: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
      select: { referralCode: true, fullName: true },
    });

    if (!driver) {
      throw new NotFoundException("Driver not found");
    }

    if (!driver.referralCode) {
      throw new NotFoundException("Driver referral code not configured");
    }

    const code = driver.referralCode;
    const advertiserUrl = `https://tad.anunciante.ibusiness.com.do/advertiser/onboarding?ref=${code}`;
    const driverUrl = `https://tad.driver.ibusiness.com.do/onboarding?ref=${code}`;

    return {
      driverId,
      fullName: driver.fullName,
      referralCode: code,
      url: advertiserUrl,
      driverUrl,
      qrPayload: advertiserUrl,
      // Ambos enlaces de referido (anunciante + conductor) compartibles
      referralLinks: {
        advertiser: advertiserUrl,
        driver: driverUrl,
      },
    };
  }

  /**
   * Materializa el bonus de referido de driver → driver.
   *
   * Hasta ahora el bonus sólo se CALCULABA (findAll/buildHubData/getBalance)
   * pero nunca se materializaba como Commission + FinancialTransaction + wallet credit.
   * Este método cierra ese circuito con idempotency por reference @unique.
   *
   * Reglas de negocio actuales (flat, milestone-agnostic por ahora):
   *   - Driver referral bonus: RD$500 por cada driver referido que alcance OPERATIVO + subscriptionPaid
   *   - Advertiser referral bonus: RD$500 por cada anunciante referido que active 1ra campaña
   *
   * Futuro: cuando exista la tabla de hitos, este método recibe milestone y decide
   *         el monto según la etapa alcanzada.
   */
  async awardDriverReferralBonus(
    driverId: string,
    referredDriverId: string,
    milestone: string,
  ) {
    if (driverId === referredDriverId) {
      this.logger.warn(
        `⚠️ [DRIVER_REFERRAL] Intento de auto-referido rechazado para driver ${driverId}`,
      );
      return;
    }

    const bonusAmount = BUSINESS_RULES.DRIVER_REFERRAL_BONUS_RD;
    const reference = `REF-DRIVER-${referredDriverId.substring(0, 8)}-${milestone}`;

    await this.prisma.$transaction(async (tx) => {
      // Idempotency: si ya existe esta comisión para este referido+momento, no volver a abonar
      const existing = await tx.commission.findFirst({
        where: {
          driverId,
          sourceType: "DRIVER_REFERRAL",
          reference,
        },
      });

      if (existing) {
        return;
      }

      this.logger.log(
        `💸 [DRIVER_REFERRAL] Abonando bonus a Driver ${driverId} por referido ${referredDriverId} (milestone: ${milestone})`,
      );

      await tx.commission.create({
        data: {
          driverId,
          amount: bonusAmount,
          sourceType: "DRIVER_REFERRAL",
          status: "APPROVED",
          reference,
          metadata: { referredDriverId, milestone },
        },
      });

      await tx.financialTransaction.upsert({
        where: { reference },
        update: {},
        create: {
          type: "OUTGOING",
          category: "OPEX_COMMISSION",
          amount: bonusAmount,
          netAmount: bonusAmount,
          taxAmount: 0,
          entityId: driverId,
          reference,
          note: `Bono de referido (driver→driver) por ${milestone} del conductor ${referredDriverId}.`,
          status: "COMPLETED",
        },
      });

      await tx.wallet.upsert({
        where: { driverId },
        update: {
          availableBalance: { increment: bonusAmount },
        },
        create: {
          driverId,
          availableBalance: bonusAmount,
        },
      });
    });
  }

  /**
   * Materializa el bonus de referido de driver → advertiser.
   * Idempotente por reference @unique.
   *
   * Regla: RD$500 por cada anunciante referido que active su primera campaña.
   */
  async awardAdvertiserReferralBonus(
    driverId: string,
    advertiserId: string,
    campaignId: string,
  ) {
    const bonusAmount = BUSINESS_RULES.ADVERTISER_REFERRAL_BONUS_RD || 500;
    const reference = `REF-ADV-${advertiserId.substring(0, 8)}-${campaignId.substring(0, 8)}`;

    await this.prisma.$transaction(async (tx) => {
      // Idempotency
      const existing = await tx.commission.findFirst({
        where: {
          driverId,
          sourceType: "ADVERTISER_REFERRAL",
          reference,
        },
      });

      if (existing) {
        return;
      }

      this.logger.log(
        `💸 [ADvertiser_REFERRAL] Abonando bonus a Driver ${driverId} por anunciante referido ${advertiserId} (1ra campaña: ${campaignId})`,
      );

      await tx.commission.create({
        data: {
          driverId,
          amount: bonusAmount,
          sourceType: "ADVERTISER_REFERRAL",
          status: "APPROVED",
          reference,
          metadata: { advertiserId, campaignId },
        },
      });

      await tx.financialTransaction.upsert({
        where: { reference },
        update: {},
        create: {
          type: "OUTGOING",
          category: "OPEX_COMMISSION",
          amount: bonusAmount,
          netAmount: bonusAmount,
          taxAmount: 0,
          entityId: driverId,
          reference,
          note: `Bono de referido (driver→anunciante) por primera campaña de ${advertiserId}.`,
          status: "COMPLETED",
        },
      });

      await tx.wallet.upsert({
        where: { driverId },
        update: {
          availableBalance: { increment: bonusAmount },
        },
        create: {
          driverId,
          availableBalance: bonusAmount,
        },
      });
    });
  }

  /** Obtiene los anunciantes referidos por un driver (para UI de GrowthCenter) */
  async getMyAdvertiserReferrals(driverId: string) {
    const advertisers = await this.prisma.advertiser.findMany({
      where: { referredBy: driverId },
      select: {
        id: true,
        companyName: true,
        createdAt: true,
        _count: {
          select: {
            campaigns: {
              where: { status: "ACTIVE" },
            },
          },
        },
        referrer: {
          select: { fullName: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const totalBonus = await this.prisma.commission.aggregate({
      where: {
        driverId,
        sourceType: "ADVERTISER_REFERRAL",
        status: "APPROVED",
      },
      _sum: { amount: true },
    });

    return {
      advertisers,
      totalBonus: totalBonus._sum.amount || 0,
      count: advertisers.length,
    };
  }
}
