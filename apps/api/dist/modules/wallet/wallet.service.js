"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var WalletService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
let WalletService = WalletService_1 = class WalletService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(WalletService_1.name);
    }
    async getBalance(driverId) {
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
    async withdraw(driverId, amount) {
        if (amount <= 0) {
            throw new common_1.BadRequestException('Withdrawal amount must be positive');
        }
        return this.prisma.$transaction(async (tx) => {
            const [driverRow] = await tx.$queryRaw `
        SELECT id, wallet_balance, bank_account
        FROM drivers
        WHERE id = ${driverId}
        FOR UPDATE
      `;
            if (!driverRow) {
                throw new common_1.BadRequestException('Driver not found');
            }
            if (!driverRow.bank_account) {
                throw new common_1.BadRequestException('Bank account not configured. Configure your bank details before withdrawing.');
            }
            const currentBalance = Number(driverRow.wallet_balance);
            if (currentBalance < amount) {
                this.logFinancialAnomaly(driverId, `Intento de retiro excede balance: solicitó RD$ ${amount}, balance actual RD$ ${currentBalance}`, 'WARNING');
                throw new common_1.BadRequestException({
                    code: 'INSUFFICIENT_BALANCE',
                    message: `Insufficient balance. Current: RD$ ${currentBalance}, Requested: RD$ ${amount}`,
                    currentBalance,
                    requestedAmount: amount,
                });
            }
            await tx.$executeRaw `
        UPDATE drivers
        SET wallet_balance = wallet_balance - ${amount}
        WHERE id = ${driverId}
      `;
            const [verify] = await tx.$queryRaw `
        SELECT wallet_balance FROM drivers WHERE id = ${driverId}
      `;
            const newBalance = Number(verify.wallet_balance);
            if (newBalance < 0) {
                await tx.$executeRaw `
          UPDATE drivers
          SET wallet_balance = wallet_balance + ${amount}
          WHERE id = ${driverId}
        `;
                this.logFinancialAnomaly(driverId, `🚨 DOUBLE-SPEND PREVENTED: Retiro RD$ ${amount} revertido. Balance post-retiro era RD$ ${newBalance}. Transacción cancelada y balance restaurado.`, 'CRITICAL');
                throw new common_1.BadRequestException({
                    code: 'DOUBLE_SPEND_PREVENTED',
                    message: 'Withdrawal rolled back — balance integrity violation detected. Operations team notified.',
                });
            }
            const transaction = await tx.financialTransaction.create({
                data: {
                    type: 'WITHDRAWAL',
                    category: 'DRIVER_PAYOUT',
                    amount: amount,
                    netAmount: amount,
                    taxAmount: 0,
                    status: 'PENDING',
                    entityId: driverId,
                    reference: `WD-${driverId.substring(0, 8)}-${Date.now()}`,
                },
            });
            this.logger.log(`💰 Retiro procesado: Driver ${driverId} → RD$ ${amount} | Nuevo balance: RD$ ${newBalance} | Tx: ${transaction.id}`);
            return {
                success: true,
                newBalance,
                transactionId: transaction.id,
                reference: transaction.reference,
            };
        }, {
            isolationLevel: client_1.Prisma.TransactionIsolationLevel.ReadCommitted,
            timeout: 10000,
        });
    }
    async updateBank(driverId, bankData) {
        const { driverId: _, ...accountData } = bankData;
        const updated = await this.prisma.driver.update({
            where: { id: driverId },
            data: { bankAccount: accountData },
        });
        return { success: true, bankAccount: updated.bankAccount };
    }
    logFinancialAnomaly(driverId, message, severity) {
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
};
exports.WalletService = WalletService;
exports.WalletService = WalletService = WalletService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], WalletService);
//# sourceMappingURL=wallet.service.js.map