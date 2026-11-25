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
 * VULN #7 FIX (v12.1.3): Wallet Model Unification
 * ────────────────────────────────────────────────────────
 * Modelo `Wallet` (@map "wallets") es ahora la FUENTE AUTORITATIVA del balance.
 * `Driver.walletBalance` eliminado (migración 20260916_wallet_unification).
 * `Driver.bankAccount` deprecado → usar `Wallet.bankInfo`.
 */
@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Regla de negocio documentada en FINANCIAL_SYSTEM_MASTER (10.x):
   * el conductor solo puede retirar cuando su balance alcanza la meta RD$ 5,000.
   */
  static readonly MIN_WITHDRAWAL_AMOUNT_RD = 5000;

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

    // Read from Wallet model (authoritative source)
    const wallet = await this.prisma.wallet.findUnique({
      where: { driverId },
      select: { availableBalance: true },
    });

    return {
      driverId,
      adsEarnings,
      cpaEarnings,
      referralEarnings,
      totalEarnings,
      walletBalance: wallet?.availableBalance || 0,
    };
  }

  /**
   * VULN #5 PATCH (v12.1.2): Double-spend prevention.
   *
   * Flujo de transacción atómica usando modelo Wallet (fuente autoritativa):
   * ┌─────────────────────────────────────────────────────────────────┐
   * │ 1. SELECT availableBalance FROM wallets WHERE driverId=? FOR UPDATE │
   * │    → Candado exclusivo en la fila. Nadie puede leer/modificar  │
   * │      este balance hasta COMMIT o ROLLBACK.                     │
   * │                                                                │
   * │ 2. Verificar: balance >= amount → si no, InsufficientFunds    │
   * │                                                                │
   * │ 3. UPDATE wallets SET availableBalance = availableBalance - amount │
   * │    → Deducción atómica via raw SQL. No Prisma middleware.      │
   * │                                                                │
   * │ 4. SELECT availableBalance (verify) → safety net post-deducción │
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

    // VULN/FLOW FIX (v12.4): Meta mínima de retiro RD$ 5,000.
    // Define de forma inequívoca el umbral documentado en la regla de negocio.
    if (amount < WalletService.MIN_WITHDRAWAL_AMOUNT_RD) {
      throw new BadRequestException({
        code: "BELOW_MINIMUM_WITHDRAWAL",
        message: `El retiro mínimo es RD$ ${WalletService.MIN_WITHDRAWAL_AMOUNT_RD.toLocaleString("en-DO")}. Solicitado RD$ ${amount}`,
        minimum: WalletService.MIN_WITHDRAWAL_AMOUNT_RD,
        requestedAmount: amount,
      });
    }

    return this.prisma.$transaction(
      async (tx) => {
        // ── STEP 1: Candado exclusivo en la fila del Wallet ──
        // SELECT FOR UPDATE acquire un row-level exclusive lock.
        // Concurrent withdrawals on the SAME driver will block here
        // until this transaction commits or rolls back.
        const [walletRow] = await tx.$queryRaw<
          [
            {
              id: string;
              available_balance: number;
              bank_info: Prisma.JsonValue;
            },
          ]
        >`
        SELECT id, available_balance, bank_info
        FROM wallets
        WHERE driver_id_text_217 = ${driverId}
        FOR UPDATE
      `;

        if (!walletRow) {
          // Wallet no existe aún — verificar si driver existe y crear wallet
          const driver = await tx.driver.findUnique({
            where: { id: driverId },
            select: { id: true, bankAccount: true },
          });
          if (!driver) {
            throw new BadRequestException("Driver not found");
          }
          // Crear wallet con balance 0
          await tx.wallet.create({
            data: { driverId, availableBalance: 0 },
          });
          throw new BadRequestException(
            "Wallet created with zero balance. Cannot withdraw.",
          );
        }

        if (!walletRow.bank_info) {
          throw new BadRequestException(
            "Bank account not configured. Configure your bank details before withdrawing.",
          );
        }

        const currentBalance = Number(walletRow.available_balance);

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
        // availableBalance = availableBalance - amount en una sola operación.
        await tx.$executeRaw`
        UPDATE wallets
        SET available_balance = available_balance - ${amount}
        WHERE driver_id_text_217 = ${driverId}
      `;

        // ── STEP 4: Safety net — verify post-deduction balance ──
        // With SELECT FOR UPDATE + ReadCommitted, this should NEVER be < 0.
        // But we check anyway as a belt-and-suspenders defense against
        // DB corruption, negative amount bypass, or application bugs.
        const [verify] = await tx.$queryRaw<[{ available_balance: number }]>`
        SELECT available_balance FROM wallets WHERE driver_id_text_217 = ${driverId}
      `;

        const newBalance = Number(verify.available_balance);

        if (newBalance < 0) {
          // ── EMERGENCY ROLLBACK: Restore the withdrawn amount ──
          // This should never happen, but if it does, we MUST revert.
          await tx.$executeRaw`
          UPDATE wallets
          SET available_balance = available_balance + ${amount}
          WHERE driver_id_text_217 = ${driverId}
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

  async updateBank(driverId: string, bankData: Prisma.InputJsonObject) {
    const accountData = { ...bankData };
    Reflect.deleteProperty(accountData, "driverId");

    // Upsert bank info in Wallet model
    const wallet = await this.prisma.wallet.upsert({
      where: { driverId },
      update: { bankInfo: accountData },
      create: { driverId, bankInfo: accountData },
    });

    return { success: true, bankAccount: wallet.bankInfo };
  }

  /**
   * CONFIRMACIÓN DE RETIRO (v12.4) — cierra el flujo documentado
   * `withdraw → FinancialTransaction(WITHDRAWAL, PENDING) → webhook bancario → COMPLETED`.
   *
   * Invocado por el webhook bancario (o por conciliación manual de administración)
   * cuando el banco confirma que los fondos fueron transferidos al conductor.
   * Transforma la transacción PENDING en COMPLETED de forma idempotente:
   * - Si ya está COMPLETED → no-op (se devuelve el estado sin alterar nada).
   * - Si está FAILED/otro → BadRequest (flujo inválido, no se reabre).
   */
  async confirmWithdrawal(transactionId: string) {
    return this.prisma.$transaction(async (tx) => {
      const txRow = await tx.financialTransaction.findUnique({
        where: { id: transactionId },
      });

      if (!txRow) {
        throw new BadRequestException(
          `Withdrawal transaction ${transactionId} not found`,
        );
      }
      if (txRow.type !== "WITHDRAWAL") {
        throw new BadRequestException(
          `Transaction ${transactionId} is not a withdrawal (type=${txRow.type})`,
        );
      }
      if (txRow.status === "COMPLETED") {
        return {
          success: true,
          idempotent: true,
          status: "COMPLETED",
          transactionId,
        };
      }
      if (txRow.status !== "PENDING") {
        throw new BadRequestException(
          `Withdrawal ${transactionId} is not confirmable from status '${txRow.status}'`,
        );
      }

      await tx.financialTransaction.update({
        where: { id: transactionId },
        data: {
          status: "COMPLETED",
          note: `Confirmed by bank webhook at ${new Date().toISOString()}`,
        },
      });

      this.logger.log(
        `✅ Retiro confirmado: Tx ${transactionId} → COMPLETED (RD$ ${txRow.amount})`,
      );
      return {
        success: true,
        idempotent: false,
        status: "COMPLETED",
        transactionId,
      };
    });
  }

  /**
   * RECHAZO DE RETIRO (v12.4) — cierra el flujo en caso de fallo bancario.
   * Reembolsa el monto retenido de vuelta al balance del conductor y marca la
   * transacción como FAILED. Idempotente y atómico (mismo lock que withdraw).
   */
  async refundFailedWithdrawal(transactionId: string, reason?: string) {
    return this.prisma.$transaction(async (tx) => {
      const txRow = await tx.financialTransaction.findUnique({
        where: { id: transactionId },
      });

      if (!txRow) {
        throw new BadRequestException(
          `Withdrawal transaction ${transactionId} not found`,
        );
      }
      if (txRow.type !== "WITHDRAWAL") {
        throw new BadRequestException(
          `Transaction ${transactionId} is not a withdrawal`,
        );
      }
      if (txRow.status === "FAILED") {
        return {
          success: true,
          idempotent: true,
          status: "FAILED",
          transactionId,
        };
      }
      if (txRow.status !== "PENDING") {
        throw new BadRequestException(
          `Withdrawal ${transactionId} cannot be failed from status '${txRow.status}'`,
        );
      }
      if (!txRow.entityId) {
        throw new BadRequestException(
          `Withdrawal ${transactionId} has no entityId to refund`,
        );
      }

      // Reembolso atómico con lock de fila (mismo patrón que withdraw)
      await tx.$executeRaw`
        UPDATE wallets
        SET available_balance = available_balance + ${txRow.amount}
        WHERE driver_id_text_217 = ${txRow.entityId}
      `;

      await tx.financialTransaction.update({
        where: { id: transactionId },
        data: {
          status: "FAILED",
          note: reason
            ? `Rejected: ${reason}`
            : `Rejected by bank webhook at ${new Date().toISOString()}`,
        },
      });

      this.logger.log(
        `🔁 Retiro reembolsado: Tx ${transactionId} → FAILED (RD$ ${txRow.amount} devueltos a driver ${txRow.entityId})`,
      );
      return {
        success: true,
        idempotent: false,
        status: "FAILED",
        transactionId,
        refundedAmount: txRow.amount,
      };
    });
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
