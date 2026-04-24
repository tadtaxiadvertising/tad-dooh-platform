import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WalletService {
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
}
