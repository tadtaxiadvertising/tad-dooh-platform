import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BUSINESS_RULES } from '../../common/constants/business-rules';

/**
 * SRE v13 — WalletService (Wallet Promotion)
 *
 * Wallet model (wallets table) is now the canonical source of truth.
 * Driver.walletBalance is kept as a legacy mirror, synced via creditEarnings().
 
 * All financial operations use prisma.$transaction for atomicity.
 */
@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(private readonly prisma: PrismaService) { }

  async getBalance(driverId: string) {
    // Promote Wallet model as source of truth
    const wallet = await this.prisma.wallet.findUnique({
      where: { driverId },
    });

    if (!wallet) {
      // Auto-create wallet if it doesn't exist (promote pattern)
      const driver = await this.prisma.driver.findUnique({
        where: { id: driverId },
        select: { walletBalance: true },
      });
      if (!driver) throw new BadRequestException('Driver not found');

      const newWallet = await this.prisma.wallet.create({
        data: {
          driverId,
          availableBalance: driver.walletBalance || 0,
          pendingWithdrawal: 0,
        },
      });
      return {
        driverId,
        availableBalance: newWallet.availableBalance,
        pendingWithdrawal: newWallet.pendingWithdrawal,
        walletBalance: driver.walletBalance || 0,
      };
    }

    const activeAdsCount = await this.prisma.activeAd.count({
      where: { driverId, status: 'ACTIVE' },
    });
    const cpaCount = await this.prisma.commission.count({
      where: { driverId, sourceType: 'ADVERTISER_SALE', status: 'APPROVED' },
    });
    const referralCount = await this.prisma.driver.count({
      where: { referredBy: driverId, status: 'OPERATIVO' },
    });
    const effectiveAds = Math.min(activeAdsCount, BUSINESS_RULES.MAX_CAMPAIGNS_PER_DRIVER);
    const adsEarnings = effectiveAds * BUSINESS_RULES.DRIVER_RATE_PER_CAMPAIGN_RD;
    const cpaEarnings = cpaCount * BUSINESS_RULES.DRIVER_REFERRAL_BONUS_RD;
    const referralEarnings = referralCount * BUSINESS_RULES.DRIVER_REFERRAL_BONUS_RD;
    const totalEarnings = adsEarnings + cpaEarnings + referralEarnings;

    return {
      driverId,
      availableBalance: wallet.availableBalance,
      pendingWithdrawal: wallet.pendingWithdrawal,
      adsEarnings,
      cpaEarnings,
      referralEarnings,
      totalEarnings,
      walletBalance: wallet.availableBalance, // Now canonical
    };
  }

  /**
   * Credit earnings to a driver's wallet atomically.
   * Used by referral payouts and payroll processing.
   * Updates both Wallet model (canonical) and Driver.walletBalance (legacy mirror).
   */
  async creditEarnings(driverId: string, amount: number, reason: string) {
    if (amount <= 0) {
      throw new BadRequestException('Credit amount must be positive');
    }
    const result = await this.prisma.$transaction(async (tx) => {
      // Upsert Wallet model (canonical source of truth)
      const wallet = await tx.wallet.upsert({
        where: { driverId },
        create: { driverId, availableBalance: amount, pendingWithdrawal: 0 },
        update: { availableBalance: { increment: amount } },
      });
      // Sync Driver.walletBalance (legacy mirror)
      const driver = await tx.driver.update({
        where: { id: driverId },
        data: { walletBalance: { increment: amount } },
      });
      // FinancialTransaction for audit trail
      const transaction = await tx.financialTransaction.create({
        data: {
          type: 'CREDIT',
          category: reason,
          amount,
          netAmount: amount,
          taxAmount: 0,
          status: 'COMPLETED',
          entityId: driverId,
          reference: `CR-${driverId.substring(0, 8)}-${Date.now()}`,
        },
      });
      return { wallet, driver, transaction };
    });
    this.logger.log(
      `💰 creditEarnings: Driver ${driverId} +RD$${amount} (${reason}) | New balance: RD$${result.wallet.availableBalance}`,
    );
    return {
      success: true,
      newBalance: result.wallet.availableBalance,
      transactionId: result.transaction.id,
    };
  }

  async withdraw(driverId: string, amount: number) {
    // Enforce minimum withdrawal amount
    if (amount < BUSINESS_RULES.MIN_WITHDRAWAL_AMOUNT_RD) {
      throw new BadRequestException(
        `Minimum withdrawal is RD$${BUSINESS_RULES.MIN_WITHDRAWAL_AMOUNT_RD}`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { driverId } });
      if (!wallet) {
        const driver = await tx.driver.findUnique({ where: { id: driverId } });
        if (!driver) throw new BadRequestException('Driver not found');
        const newWallet = await tx.wallet.create({
          data: { driverId, availableBalance: driver.walletBalance || 0, pendingWithdrawal: 0 },
        });
        return this._processWithdrawal(tx, driverId, newWallet, amount);
      }
      return this._processWithdrawal(tx, driverId, wallet, amount);
    });
  }

  private async _processWithdrawal(tx: any, driverId: string, wallet: any, amount: number) {
    const driver = await tx.driver.findUnique({ where: { id: driverId } });
    if (!driver) throw new BadRequestException('Driver not found');
    if (!driver.bankAccount) throw new BadRequestException('Bank account not configured');
    if (wallet.availableBalance < amount) {
      this.logFinancialAnomaly(
        driverId,
        `Over-withdrawal attempt: RD$${amount} requested, RD$${wallet.availableBalance} available`,
        'WARNING',
      );
      throw new BadRequestException('Insufficient balance');
    }
    const updatedWallet = await tx.wallet.update({
      where: { driverId },
      data: { availableBalance: { decrement: amount }, pendingWithdrawal: { increment: amount } },
    });
    const updatedDriver = await tx.driver.update({
      where: { id: driverId },
      data: { walletBalance: { decrement: amount } },
    });
    const transaction = await tx.financialTransaction.create({
      data: {
        type: 'WITHDRAWAL',
        category: 'DRIVER_PAYOUT',
        amount,
        netAmount: amount,
        taxAmount: 0,
        status: 'PENDING',
        entityId: driverId,
        reference: `WD-${driverId.substring(0, 8)}-${Date.now()}`,
      },
    });
    if (updatedWallet.availableBalance < 0) {
      this.logFinancialAnomaly(
        driverId,
        `🚨 NEGATIVE BALANCE post-withdrawal: RD$${updatedWallet.availableBalance}`,
        'CRITICAL',
      );
    }
    this.logger.log(
      `💰 Withdrawal: Driver ${driverId} → RD$${amount} | Balance: RD$${updatedWallet.availableBalance}`,
    );
    return { success: true, newBalance: updatedWallet.availableBalance, transactionId: transaction.id };
  }

  async updateBank(driverId: string, bankData: any) {
    const { driverId: _, ...accountData } = bankData;
    const updatedDriver = await this.prisma.driver.update({
      where: { id: driverId },
      data: { bankAccount: accountData as any },
    });
    // Sync Wallet.bankInfo
    await this.prisma.wallet.upsert({
      where: { driverId },
      create: { driverId, availableBalance: updatedDriver.walletBalance || 0, bankInfo: accountData as any },
      update: { bankInfo: accountData as any },
    });
    return { success: true, bankAccount: updatedDriver.bankAccount };
  }

  private logFinancialAnomaly(driverId: string, message: string, severity: string): void {
    this.prisma.systemError.create({
      data: { source: 'WALLET', severity, message, entityId: driverId },
    }).catch(err => {
      this.logger.error(`[SYSTEM_ERROR_LOG_FAIL] WALLET: ${message} | DB Error: ${err.message}`);
    });
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