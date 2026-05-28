import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * SRE v12.1.1 — WalletService
 *
 * INTEGRIDAD FINANCIERA:
 * - Suscripción Driver: RD$ 6,000
 * - Pago por Ad: RD$ 500/mes
 * - Toda inconsistencia dispara alerta al MonitoringController vía system_errors + notification
 * - Todas las operaciones monetarias usan prisma.$transaction
 */
@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getBalance(driverId: string) {
    const activeAdsCount = await this.prisma.activeAd.count({
      where: { driverId, status: 'ACTIVE' },
    });

    const cpaCount = await this.prisma.commission.count({
      where: { driverId, sourceType: 'ADVERTISER_SALE', status: 'APPROVED' },
    });

    const referralCount = await this.prisma.driver.count({
      where: { referredBy: driverId, status: 'OPERATIVO' },
    });

    const effectiveAds = Math.min(activeAdsCount, 15);
    const adsEarnings = effectiveAds * 500;
    const cpaEarnings = cpaCount * 500;
    const referralEarnings = referralCount * 500;
    const totalEarnings = adsEarnings + cpaEarnings + referralEarnings;

    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
      select: { walletBalance: true },
    });

    return {
      driverId,
      adsEarnings,
      cpaEarnings,
      referralEarnings,
      totalEarnings,
      walletBalance: driver?.walletBalance || 0,
    };
  }

  async withdraw(driverId: string, amount: number) {
    return this.prisma.$transaction(async (tx) => {
      const driver = await tx.driver.findUnique({
        where: { id: driverId },
      });

      if (!driver) {
        throw new BadRequestException('Driver not found');
      }

      if (!driver.bankAccount) {
        throw new BadRequestException('Bank account not configured');
      }

      if (driver.walletBalance < amount) {
        // SRE: Log attempted over-withdrawal as potential anomaly
        this.logFinancialAnomaly(
          driverId,
          `Intento de retiro excede balance: solicitó RD$ ${amount}, balance actual RD$ ${driver.walletBalance}`,
          'WARNING',
        );
        throw new BadRequestException('Insufficient balance');
      }

      const updatedDriver = await tx.driver.update({
        where: { id: driverId },
        data: { walletBalance: { decrement: amount } },
      });

      const transaction = await tx.financialTransaction.create({
        data: {
          type: 'WITHDRAWAL',
          category: 'DRIVER_PAYOUT',
          amount: amount,
          netAmount: amount,
          taxAmount: 0,
          status: 'PENDING',
          entityId: driverId,
          reference: `WD-${driverId.substring(0, 8)}-${Date.now()}`
        }
      });

      // SRE v12.1.1: Post-transaction integrity check
      if (updatedDriver.walletBalance < 0) {
        this.logFinancialAnomaly(
          driverId,
          `🚨 BALANCE NEGATIVO detectado post-retiro: RD$ ${updatedDriver.walletBalance} (retiró RD$ ${amount})`,
          'CRITICAL',
        );
      }

      this.logger.log(
        `💰 Retiro procesado: Driver ${driverId} → RD$ ${amount} | Nuevo balance: RD$ ${updatedDriver.walletBalance}`
      );

      return { success: true, newBalance: updatedDriver.walletBalance, transactionId: transaction.id };
    });
  }

  async updateBank(driverId: string, bankData: any) {
    const { driverId: _, ...accountData } = bankData;
    const updated = await this.prisma.driver.update({
      where: { id: driverId },
      data: { bankAccount: accountData as any },
    });
    return { success: true, bankAccount: updated.bankAccount };
  }

  // ─────────────────────────────────────────────────────────────────────
  // SRE: Financial Anomaly Alert → system_errors + notification
  // ─────────────────────────────────────────────────────────────────────

  private logFinancialAnomaly(driverId: string, message: string, severity: string): void {
    // Fire-and-forget: Write to system_errors table
    this.prisma.systemError.create({
      data: {
        source: 'WALLET',
        severity,
        message,
        entityId: driverId,
      },
    }).catch(err => {
      this.logger.error(`[SYSTEM_ERROR_LOG_FAIL] WALLET: ${message} | DB Error: ${err.message}`);
    });

    // Fire-and-forget: Create notification for admin dashboard
    this.prisma.notification.create({
      data: {
        title: severity === 'CRITICAL' ? '🚨 Anomalía Financiera' : '⚠️ Alerta Financiera',
        message,
        type: severity === 'CRITICAL' ? 'CRITICAL' : 'WARNING',
        category: 'FINANCE',
        entityId: driverId,
      },
    }).catch(err => {
      this.logger.error(`[NOTIFICATION_FAIL] WALLET alert: ${err.message}`);
    });
  }
}
