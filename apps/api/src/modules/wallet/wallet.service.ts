import { Injectable, BadRequestException, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Prisma } from "@prisma/client";

/**
 * SRE v12.1.2 — WalletService (VULN #5 PATCHED)
 *
 * INTEGRIDAD FINANCIERA:
 * - Suscripción Driver: RD$ 6,000
 * - Pago por Ad: RD$ 500/mes
 * - Toda inconsistencia dispara alerta al MonitoringController vía system_errors + notification
 *
 * VULN #5 PATCH (v12.1.2): Bloqueo Atómico de Billetera
 * ────────────────────────────────────────────────────────
 * Problema: withdraw() leía el balance y deducía en pasos separados.
 * Dos peticiones concurrentes podían leer el mismo balance antes de que
 * cualquiera decrementara, resultando en balance negativo (double-spend).
 *
 * Solución Arquitectónica:
 * 1. SELECT FOR UPDATE → candado exclusivo a nivel de fila hasta COMMIT
 * 2. UPDATE raw SQL → deducción atómica en una sola operación DB
 * 3. ReadCommitted isolation → suficiente con SELECT FOR UPDATE;
 *    Serializable sería overkill y causaría más fallos de transacción
 * 4. Verificación post-deducción → safety net contra edge cases
 *
 * NOTA: El modelo Prisma `Wallet` (@map "wallets") existe pero no está
 * poblado — el balance operativo vive en `Driver.walletBalance` (@map
 * "wallet_balance" en tabla "drivers"). La migración al modelo `Wallet`
 * como fuente autoritativa es scope P1 (VULN #7 divergence cleanup).
 */
@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getBalance(driverId: string) {
    const activeAdsCount = await this.prisma.activeAd.count({
      where: { driverId, status: "ACTIVE" },
    });

    const cpaCount = await this.prisma.commission.count({
      where: { driverId, sourceType: "ADVERTISER_SALE", status: "APPROVED" },
    });

    const referralCount = await this.prisma.driver.count({
      where: { referredBy: driverId, status: "OPERATIVO" },
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

  /**
   * VULN #5 PATCH (v12.1.2): Double-spend prevention.
   *
   * Flujo de transacción atómica:
   * ┌─────────────────────────────────────────────────────────────────┐
   * │ 1. SELECT wallet_balance FROM drivers WHERE id=? FOR UPDATE    │
   * │    → Candado exclusivo en la fila. Nadie puede leer/modificar  │
   * │      este balance hasta COMMIT o ROLLBACK.                     │
   * │                                                                │
   * │ 2. Verificar: balance >= amount → si no, InsufficientFunds    │
   * │                                                                │
   * │ 3. UPDATE drivers SET wallet_balance = wallet_balance - amount │
   * │    → Deducción atómica via raw SQL. No Prisma middleware.      │
   * │                                                                │
   * │ 4. SELECT wallet_balance (verify) → safety net post-deducción  │
   * │    Si balance < 0: restaurar amount + throw (impossible edge)  │
   * │                                                                │
   * │ 5. INSERT financial_transactions → registro del retiro         │
   * │                                                                │
   * │ COMMIT → libera el candado FOR UPDATE                          │
   * └─────────────────────────────────────────────────────────────────┘
   *
   * Isolation Level: ReadCommitted (sufficient with SELECT FOR UPDATE)
   * - Serializable sería overkill: causa más serialization failures
   * - SELECT FOR UPDATE ya garantiza exclusividad a nivel de fila
   * - ReadCommitted permite que otras transacciones lean filas no-lockeadas
   */
  async withdraw(driverId: string, amount: number) {
    if (amount <= 0) {
      throw new BadRequestException("Withdrawal amount must be positive");
    }

    return this.prisma.$transaction(
      async (tx) => {
        // ── STEP 1: Candado exclusivo en la fila del Wallet ──
        // SELECT FOR UPDATE acquire un row-level exclusive lock.
        // Concurrent withdrawals on the SAME driver will block here
        // until this transaction commits or rolls back.
        const [driverRow] = await tx.$queryRaw<
          [{ id: string; wallet_balance: number; bank_account: string | null }]
        >`
        SELECT id, wallet_balance, bank_account
        FROM drivers
        WHERE id = ${driverId}
        FOR UPDATE
      `;

        if (!driverRow) {
          throw new BadRequestException("Driver not found");
        }

        if (!driverRow.bank_account) {
          throw new BadRequestException(
            "Bank account not configured. Configure your bank details before withdrawing.",
          );
        }

        const currentBalance = Number(driverRow.wallet_balance);

        // ── STEP 2: Verificar fondos suficientes ──
        if (currentBalance < amount) {
          this.logFinancialAnomaly(
            driverId,
            `Intento de retiro excede balance: solicitó RD$ ${amount}, balance actual RD$ ${currentBalance}`,
            "WARNING",
          );
          throw new BadRequestException({
            code: "INSUFFICIENT_BALANCE",
            message: `Insufficient balance. Current: RD$ ${currentBalance}, Requested: RD$ ${amount}`,
            currentBalance,
            requestedAmount: amount,
          });
        }

        // ── STEP 3: Deducción atómica via raw SQL ──
        // No Prisma middleware, no ORM overhead — directa al motor DB.
        // wallet_balance = wallet_balance - amount en una sola operación.
        await tx.$executeRaw`
        UPDATE drivers
        SET wallet_balance = wallet_balance - ${amount}
        WHERE id = ${driverId}
      `;

        // ── STEP 4: Safety net — verify post-deduction balance ──
        // With SELECT FOR UPDATE + ReadCommitted, this should NEVER be < 0.
        // But we check anyway as a belt-and-suspenders defense against
        // DB corruption, negative amount bypass, or application bugs.
        const [verify] = await tx.$queryRaw<[{ wallet_balance: number }]>`
        SELECT wallet_balance FROM drivers WHERE id = ${driverId}
      `;

        const newBalance = Number(verify.wallet_balance);

        if (newBalance < 0) {
          // ── EMERGENCY ROLLBACK: Restore the withdrawn amount ──
          // This should never happen, but if it does, we MUST revert.
          await tx.$executeRaw`
          UPDATE drivers
          SET wallet_balance = wallet_balance + ${amount}
          WHERE id = ${driverId}
        `;

          this.logFinancialAnomaly(
            driverId,
            `🚨 DOUBLE-SPEND PREVENTED: Retiro RD$ ${amount} revertido. Balance post-retiro era RD$ ${newBalance}. Transacción cancelada y balance restaurado.`,
            "CRITICAL",
          );

          throw new BadRequestException({
            code: "DOUBLE_SPEND_PREVENTED",
            message:
              "Withdrawal rolled back — balance integrity violation detected. Operations team notified.",
          });
        }

        // ── STEP 5: Registrar la transacción financiera ──
        const transaction = await tx.financialTransaction.create({
          data: {
            type: "WITHDRAWAL",
            category: "DRIVER_PAYOUT",
            amount: amount,
            netAmount: amount,
            taxAmount: 0,
            status: "PENDING",
            entityId: driverId,
            reference: `WD-${driverId.substring(0, 8)}-${Date.now()}`,
          },
        });

        this.logger.log(
          `💰 Retiro procesado: Driver ${driverId} → RD$ ${amount} | Nuevo balance: RD$ ${newBalance} | Tx: ${transaction.id}`,
        );

        return {
          success: true,
          newBalance,
          transactionId: transaction.id,
          reference: transaction.reference,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        timeout: 10000, // 10s timeout for concurrent contention
      },
    );
  }

  async updateBank(driverId: string, bankData: any) {
    const { driverId: _, ...accountData } = bankData;
    const updated = await this.prisma.driver.update({
      where: { id: driverId },
      data: { bankAccount: accountData },
    });
    return { success: true, bankAccount: updated.bankAccount };
  }

  // ─────────────────────────────────────────────────────────────────────
  // SRE: Financial Anomaly Alert → system_errors + notification
  // ─────────────────────────────────────────────────────────────────────

  private logFinancialAnomaly(
    driverId: string,
    message: string,
    severity: string,
  ): void {
    this.prisma.systemError
      .create({
        data: {
          source: "WALLET",
          severity,
          message,
          entityId: driverId,
        },
      })
      .catch((err) => {
        this.logger.error(
          `[SYSTEM_ERROR_LOG_FAIL] WALLET: ${message} | DB Error: ${err.message}`,
        );
      });

    this.prisma.notification
      .create({
        data: {
          title:
            severity === "CRITICAL"
              ? "🚨 Anomalía Financiera"
              : "⚠️ Alerta Financiera",
          message,
          type: severity === "CRITICAL" ? "CRITICAL" : "WARNING",
          category: "FINANCE",
          entityId: driverId,
        },
      })
      .catch((err) => {
        this.logger.error(`[NOTIFICATION_FAIL] WALLET alert: ${err.message}`);
      });
  }
}
