import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { BUSINESS_RULES } from "../../common/constants/business-rules";
import type {
  Prisma,
  SettlementBatch as StoredSettlementBatch,
} from "@prisma/client";

export enum CommissionStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  PAID = "PAID",
  REJECTED = "REJECTED",
  REVOKED = "REVOKED",
}

export enum CommissionSourceType {
  DRIVER_REFERRAL = "DRIVER_REFERRAL",
  ADVERTISER_SALE = "ADVERTISER_SALE",
}

export interface CreateCommissionInput {
  driverId: string;
  amount: number;
  sourceType: CommissionSourceType;
  reference: string; // Clave de idempotencia: REF-BONUS-<campaignId> o DRIVER-REF-<driverId>
  metadata?: Prisma.InputJsonObject;
}

export interface MonthlySettlementInput {
  month: number;
  year: number;
  generatedBy: string; // userId del operador
}

export interface SettlementBatch {
  id: string;
  period: string; // "2026-09"
  referents: SettlementReferent[];
  grossTotal: number;
  netTotal: number;
  withholdings: number;
  status: "DRAFT" | "APPROVED" | "PAID";
  approvedAt?: Date | null;
  paidAt?: Date | null;
  createdAt: Date;
}

export interface SettlementReferent {
  driverId: string;
  driverName: string;
  commissions: SettlementCommission[];
  grossAmount: number;
  withholding: number;
  netAmount: number;
}

export interface SettlementCommission {
  id: string;
  amount: number;
  sourceType: CommissionSourceType;
  reference: string;
  createdAt: Date;
  relatedEntityId?: string; // campaignId or referredDriverId
}

@Injectable()
export class CommissionService {
  private readonly logger = new Logger(CommissionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Crea una comisión de forma idempotente.
   * La `reference` actúa como clave de idempotencia única.
   * Si ya existe una comisión con esa reference, no se crea duplicada.
   */
  async createIdempotent(input: CreateCommissionInput) {
    // A commission credits the driver wallet and creates a matching ledger
    // entry once approved. Reject negative, NaN/Infinity, sub-cent or
    // imprecisely huge amounts BEFORE any database transaction starts.
    // This also protects internal callers that bypass the HTTP controller.
    const amount = input?.amount;
    if (
      typeof amount !== "number" ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      !Number.isSafeInteger(Math.round(amount * 100)) ||
      Math.round(amount * 100) / 100 !== amount
    ) {
      throw new BadRequestException(
        "Commission amount must be a positive finite RD$ amount in cents",
      );
    }

    this.logger.log(
      `[COMMISSION] Creating idempotent commission: ${input.reference} for driver ${input.driverId}`,
    );

    try {
      return await this.prisma.$transaction(async (tx) => {
        // 1. Verificar si ya existe por reference (idempotencia)
        const existing = await tx.commission.findFirst({
          where: { reference: input.reference },
        });

        if (existing) {
          // Replays are only idempotent for the SAME economic event.
          // Never return another driver's commission for a reused reference.
          this.assertMatchingCommissionReplay(existing, input);
          this.logger.warn(
            `[COMMISSION] Idempotent replay for reference ${input.reference}`,
          );
          return { commission: existing, created: false };
        }

        // 2. Validar que el conductor existe
        const driver = await tx.driver.findUnique({
          where: { id: input.driverId },
          select: { id: true, fullName: true },
        });

        if (!driver) {
          throw new NotFoundException(`Driver ${input.driverId} not found`);
        }

        // 3. Validar regla de negocio: un mismo evento económico no genera dos comisiones
        // Para DRIVER_REFERRAL: verificar que el conductor referido no tenga ya comisión pagada
        if (input.sourceType === CommissionSourceType.DRIVER_REFERRAL) {
          const referredDriverId = input.metadata?.referredDriverId;
          if (referredDriverId) {
            const existingReferral = await tx.commission.findFirst({
              where: {
                driverId: input.driverId,
                sourceType: CommissionSourceType.DRIVER_REFERRAL,
                metadata: {
                  path: ["referredDriverId"],
                  equals: referredDriverId,
                },
              },
            });
            if (existingReferral) {
              throw new BadRequestException(
                `Commission already exists for referred driver ${referredDriverId}`,
              );
            }
          }
        }

        // 4. Crear comisión
        const commission = await tx.commission.create({
          data: {
            driverId: input.driverId,
            amount: input.amount,
            sourceType: input.sourceType,
            reference: input.reference,
            status: CommissionStatus.PENDING,
            metadata: input.metadata || {},
          },
        });

        // 5. Crear entrada en ledger financiero (OPEX_COMMISSION)
        await tx.financialTransaction.create({
          data: {
            type: "OUTGOING",
            category: "OPEX_COMMISSION",
            amount: input.amount,
            netAmount: input.amount,
            taxAmount: 0,
            entityId: input.driverId,
            reference: input.reference,
            note: `Comisión ${input.sourceType}: ${input.metadata?.note || "Sin descripción"}`,
            status: "PENDING", // PENDING hasta que la comisión se APRUEBE
          },
        });

        this.logger.log(
          `[COMMISSION] Created commission ${commission.id} (${input.amount} RD$) for driver ${input.driverId}`,
        );

        return { commission, created: true };
      });
    } catch (error: unknown) {
      // On two concurrent requests the unique(reference) constraint is the
      // final arbiter. After the losing transaction rolls back, re-read the
      // winner and verify it is the SAME event. Do not mask unrelated DB
      // failures, create another ledger entry, or trust the caller's driver.
      if (
        typeof error !== "object" ||
        error === null ||
        !("code" in error) ||
        error.code !== "P2002"
      ) {
        throw error;
      }
      const winner = await this.prisma.commission.findUnique({
        where: { reference: input.reference },
      });
      if (!winner) throw error;
      this.assertMatchingCommissionReplay(winner, input);
      this.logger.warn(
        `[COMMISSION] Concurrent idempotent replay for reference ${input.reference}`,
      );
      return { commission: winner, created: false };
    }
  }

  /**
   * Aprueba una comisión pendiente (cambio de estado PENDING → APPROVED)
   * Solo operable por ADMIN.
   */
  async approveCommission(commissionId: string, approvedBy: string) {
    this.logger.log(
      `[COMMISSION] Approving commission ${commissionId} by ${approvedBy}`,
    );

    return this.prisma.$transaction(async (tx) => {
      const commission = await tx.commission.findUnique({
        where: { id: commissionId },
      });
      if (!commission) {
        throw new NotFoundException(`Commission ${commissionId} not found`);
      }
      if (commission.status !== CommissionStatus.PENDING) {
        throw new ConflictException(
          `Commission ${commissionId} is already in ${commission.status} status`,
        );
      }

      // PostgreSQL compare-and-set is the concurrency gate. A transaction
      // alone with findUnique() followed by update() does not prevent two
      // concurrent admins from both incrementing the wallet.
      const changed = await tx.commission.updateMany({
        where: { id: commissionId, status: CommissionStatus.PENDING },
        data: {
          status: CommissionStatus.APPROVED,
          approvedAt: new Date(),
          approvedBy,
        },
      });
      if (changed.count !== 1) {
        throw new ConflictException(
          `Commission ${commissionId} was processed concurrently`,
        );
      }

      // Fail closed: never grant wallet balance without advancing exactly
      // one matching, still-pending source ledger entry in the SAME tx.
      // Gross amount alone is insufficient: source net/tax/currency must
      // match the same DOP commission or no wallet credit is permitted.
      // A missing/mismatched/previously completed ledger must be reconciled.
      const ledger = await tx.financialTransaction.updateMany({
        where: {
          reference: commission.reference,
          type: "OUTGOING",
          category: "OPEX_COMMISSION",
          entityId: commission.driverId,
          amount: commission.amount,
          netAmount: commission.amount,
          taxAmount: 0,
          currency: "DOP",
          status: "PENDING",
        },
        data: { status: "COMPLETED" },
      });
      if (ledger.count !== 1) {
        throw new ConflictException(
          `Commission ${commissionId} ledger requires reconciliation`,
        );
      }

      await tx.wallet.upsert({
        where: { driverId: commission.driverId },
        update: { availableBalance: { increment: commission.amount } },
        create: {
          driverId: commission.driverId,
          availableBalance: commission.amount,
        },
      });

      const updated = await tx.commission.findUnique({
        where: { id: commissionId },
      });
      if (!updated)
        throw new NotFoundException(`Commission ${commissionId} not found`);
      this.logger.log(
        `[COMMISSION] Approved commission ${commissionId}, wallet credited once`,
      );
      return updated;
    });
  }

  /**
   * Marca comisión como pagada (APPROVED → PAID)
   * Se ejecuta durante el cierre mensual.
   */
  async markCommissionPaid(commissionId: string, paidAt: Date = new Date()) {
    // A commission is APPROVED when credited to the driver's wallet.
    // PAID is an external bank-settlement assertion, not a local state
    // transition. This legacy method has no bank receipt, beneficiary
    // confirmation or reconciliation ledger. Fail closed even for trusted
    // internal callers, instead of creating a financially false status.
    void commissionId;
    void paidAt;
    throw new ConflictException(
      "Pago individual de comisiones suspendido: requiere confirmación bancaria " +
        "por beneficiario y conciliación antes de marcar PAID.",
    );
  }

  /**
   * Revoca una comisión (fraude, reembolso, anulación)
   * Crea entrada compensatoria en ledger y revierte wallet si ya se pagó.
   */
  async revokeCommission(
    commissionId: string,
    reason: string,
    revokedBy: string,
  ) {
    this.logger.warn(
      `[COMMISSION] Revoking commission ${commissionId}: ${reason}`,
    );

    return this.prisma.$transaction(async (tx) => {
      const commission = await tx.commission.findUnique({
        where: { id: commissionId },
      });
      if (!commission) {
        throw new NotFoundException(`Commission ${commissionId} not found`);
      }
      if (
        ![
          CommissionStatus.PENDING,
          CommissionStatus.APPROVED,
          CommissionStatus.PAID,
        ].includes(commission.status as CommissionStatus)
      ) {
        throw new ConflictException(
          `Commission ${commissionId} cannot be revoked from ${commission.status}`,
        );
      }

      // Settlement batches snapshot their member commissions and totals.
      // A direct revocation would leave DRAFT/APPROVED/PAID batch JSON
      // inconsistent. Require an explicit batch dispute/reconciliation flow.
      if (commission.settlementBatchId != null) {
        throw new ConflictException(
          `Commission ${commissionId} belongs to a settlement batch; reconcile it before revoking`,
        );
      }

      // Older records predate the positive-cent validation at creation.
      // A negative amount here would turn a "decrement" into a wallet credit.
      // Never attempt a funded reversal of malformed legacy amounts.
      if (
        [CommissionStatus.APPROVED, CommissionStatus.PAID].includes(
          commission.status as CommissionStatus,
        ) &&
        (!Number.isFinite(commission.amount) ||
          commission.amount <= 0 ||
          !Number.isSafeInteger(Math.round(commission.amount * 100)) ||
          Math.round(commission.amount * 100) / 100 !== commission.amount)
      ) {
        throw new ConflictException(
          `Commission ${commissionId} has an invalid amount; reconcile before revoking`,
        );
      }

      const changed = await tx.commission.updateMany({
        // Re-check membership atomically: a settlement generator may have
        // claimed this APPROVED row after our initial findUnique().
        where: {
          id: commissionId,
          status: commission.status,
          settlementBatchId: null,
        },
        data: {
          status: CommissionStatus.REVOKED,
          revokedAt: new Date(),
          revokedBy,
          revocationReason: reason,
        },
      });
      if (changed.count !== 1) {
        throw new ConflictException(
          `Commission ${commissionId} was changed concurrently`,
        );
      }

      if (
        [CommissionStatus.APPROVED, CommissionStatus.PAID].includes(
          commission.status as CommissionStatus,
        )
      ) {
        await tx.financialTransaction.create({
          data: {
            type: "INCOMING",
            category: "OPEX_COMMISSION_REVERSAL",
            amount: commission.amount,
            netAmount: commission.amount,
            taxAmount: 0,
            entityId: commission.driverId,
            reference: `REV-${commission.reference}`,
            note: `Reversión de comisión ${commission.id}: ${reason}`,
            status: "COMPLETED",
          },
        });

        // Wallet credit occurs at APPROVED, not PAID. Never debit funds
        // that have since been withdrawn/spent or use a stale balance read:
        // an atomic PostgreSQL predicate prevents negative availableBalance
        // even when another debit races with this revocation.
        const debited = await tx.wallet.updateMany({
          where: {
            driverId: commission.driverId,
            availableBalance: { gte: commission.amount },
          },
          data: { availableBalance: { decrement: commission.amount } },
        });
        if (debited.count !== 1) {
          // Roll back the REVOKED claim and reversal ledger in this same tx.
          // No silent debt/negative wallet: require explicit reconciliation.
          throw new ConflictException(
            `Commission ${commissionId} wallet funds unavailable; reconcile before revoking`,
          );
        }
      }

      this.logger.log(`[COMMISSION] Revoked commission ${commissionId}`);
      return { success: true };
    });
  }

  /**
   * Genera lote de liquidación mensual (idempotente por periodo).
   * Agrupa comisiones APPROVED del mes por referente.
   */
  async generateMonthlySettlement(
    input: MonthlySettlementInput,
  ): Promise<SettlementBatch> {
    const { month, year, generatedBy } = input;
    // Keep the domain boundary aligned with CommissionController. Internal
    // jobs bypass HTTP validation, and Date() silently normalizes months 0/13
    // into another year, potentially labelling a financial batch incorrectly.
    if (
      !Number.isInteger(month) ||
      month < 1 ||
      month > 12 ||
      !Number.isInteger(year) ||
      year < 2020 ||
      year > 2100
    ) {
      throw new BadRequestException(
        "month/year deben representar un período válido",
      );
    }
    const periodKey = `${year}-${String(month).padStart(2, "0")}`;
    const periodStart = new Date(year, month - 1, 1);
    const periodEnd = new Date(year, month, 1);

    this.logger.log(
      `[SETTLEMENT] Generating monthly settlement for ${periodKey}`,
    );

    return this.prisma.$transaction(async (tx) => {
      // 1. Verificar idempotencia: ¿ya existe lote para este periodo?
      const existingBatch = await tx.settlementBatch.findUnique({
        where: { period: periodKey },
      });

      if (existingBatch) {
        // Existing period snapshots are immutable. Do not silently return
        // a stale batch when later-approved commissions remain unbatched.
        // The operator must explicitly reconcile/rebuild the period.
        const unbatchedApproved = await tx.commission.count({
          where: {
            status: CommissionStatus.APPROVED,
            createdAt: { gte: periodStart, lt: periodEnd },
            settlementBatchId: null,
          },
        });
        if (unbatchedApproved > 0) {
          throw new ConflictException(
            `Settlement ${periodKey} has approved commissions outside its batch; reconciliation required`,
          );
        }
        this.logger.warn(
          `[SETTLEMENT] Batch for ${periodKey} already exists, returning existing`,
        );
        return this.mapBatchToOutput(existingBatch);
      }

      // 2. Obtener comisiones APPROVED del periodo que no estén en un lote
      const commissions = await tx.commission.findMany({
        where: {
          status: CommissionStatus.APPROVED,
          createdAt: { gte: periodStart, lt: periodEnd },
          settlementBatchId: null,
        },
        include: {
          driver: { select: { id: true, fullName: true } },
        },
        orderBy: { driverId: "asc" },
      });

      if (commissions.length === 0) {
        // Do not permanently seal the period as APPROVED with zero members.
        // A PENDING or late-arriving commission may become APPROVED later;
        // keeping the unique period unclaimed lets the operator retry.
        throw new ConflictException(
          `Settlement ${periodKey} has no approved commissions; retry after approvals`,
        );
      }

      // 3. Agrupar por referente (driverId) usando centavos enteros.
      // Legacy rows may predate positive-cent input validation: fail closed
      // rather than publishing an invalid amount in a financial snapshot.
      const byReferent = new Map<string, SettlementReferent>();
      const grossCentsByReferent = new Map<string, number>();

      for (const c of commissions) {
        const amountCents = Math.round(c.amount * 100);
        if (
          !Number.isFinite(c.amount) ||
          c.amount <= 0 ||
          !Number.isSafeInteger(amountCents) ||
          amountCents / 100 !== c.amount
        ) {
          throw new ConflictException(
            `Commission ${c.id} has an invalid amount; reconcile before settlement`,
          );
        }

        const key = c.driverId;
        if (!byReferent.has(key)) {
          byReferent.set(key, {
            driverId: c.driverId,
            driverName: c.driver.fullName || "Unknown",
            commissions: [],
            grossAmount: 0,
            withholding: 0,
            netAmount: 0,
          });
        }
        const ref = byReferent.get(key)!;
        ref.commissions.push({
          id: c.id,
          amount: c.amount,
          sourceType: c.sourceType as CommissionSourceType,
          reference: c.reference,
          createdAt: c.createdAt,
          relatedEntityId: this.relatedEntityId(c.metadata),
        });
        const grossCents = (grossCentsByReferent.get(key) ?? 0) + amountCents;
        if (!Number.isSafeInteger(grossCents)) {
          throw new ConflictException(
            `Settlement ${periodKey} exceeds the safe cent range`,
          );
        }
        grossCentsByReferent.set(key, grossCents);
        ref.grossAmount = grossCents / 100;
      }

      // 4. Calcular la retención por referente al centavo más cercano.
      // Math.round(grossAmount * rate) incorrectly rounded to whole pesos.
      let totalGrossCents = 0;
      let totalWithholdingCents = 0;

      for (const ref of byReferent.values()) {
        const grossCents = grossCentsByReferent.get(ref.driverId)!;
        const withholdingCents = Math.round(
          grossCents * BUSINESS_RULES.REFERRAL_RETENTION_RATE,
        );
        if (
          !Number.isSafeInteger(withholdingCents) ||
          withholdingCents < 0 ||
          withholdingCents > grossCents
        ) {
          throw new ConflictException(
            `Settlement ${periodKey} has invalid withholding amounts`,
          );
        }
        ref.withholding = withholdingCents / 100;
        ref.netAmount = (grossCents - withholdingCents) / 100;
        totalGrossCents += grossCents;
        totalWithholdingCents += withholdingCents;
        if (
          !Number.isSafeInteger(totalGrossCents) ||
          !Number.isSafeInteger(totalWithholdingCents)
        ) {
          throw new ConflictException(
            `Settlement ${periodKey} exceeds the safe cent range`,
          );
        }
      }

      const totalGross = totalGrossCents / 100;
      const totalWithholdings = totalWithholdingCents / 100;
      const totalNet = (totalGrossCents - totalWithholdingCents) / 100;

      // 5. Crear lote de liquidación
      const batch = await tx.settlementBatch.create({
        data: {
          period: periodKey,
          status: "DRAFT", // Requiere aprobación manual
          grossTotal: totalGross,
          netTotal: totalNet,
          withholdings: totalWithholdings,
          referentsCount: byReferent.size,
          commissionsCount: commissions.length,
          generatedBy,
          referents: JSON.parse(
            JSON.stringify(Array.from(byReferent.values())),
          ),
          commissions: JSON.parse(
            JSON.stringify(
              commissions.map((c) => ({
                id: c.id,
                driverId: c.driverId,
                amount: c.amount,
                sourceType: c.sourceType,
                reference: c.reference,
              })),
            ),
          ),
        },
      });

      // 6. Claim exactly the approved, still-unbatched commissions read above.
      // PostgreSQL READ COMMITTED can observe a concurrent revoke/batch claim
      // between findMany() and updateMany(). A plain update by ID would link
      // ineligible rows and publish incorrect settlement totals.
      const claimed = await tx.commission.updateMany({
        where: {
          id: { in: commissions.map((c) => c.id) },
          status: CommissionStatus.APPROVED,
          settlementBatchId: null,
        },
        data: { settlementBatchId: batch.id },
      });
      if (claimed.count !== commissions.length) {
        // The batch creation AND any partial links must roll back together.
        // Do not recalculate totals from a stale snapshot or retry silently.
        throw new ConflictException(
          `Settlement ${periodKey} changed during generation; retry after reconciliation`,
        );
      }

      this.logger.log(
        `[SETTLEMENT] Generated batch ${batch.id} for ${periodKey}: ${commissions.length} commissions, ${byReferent.size} referents, Net: ${totalNet} RD$`,
      );

      return this.mapBatchToOutput(batch);
    });
  }

  /**
   * Aprueba un lote de liquidación (DRAFT → APPROVED)
   * Inmutable después de aprobación salvo ajuste compensatorio auditado.
   */
  async approveSettlementBatch(batchId: string, approvedBy: string) {
    this.logger.log(`[SETTLEMENT] Approving batch ${batchId} by ${approvedBy}`);
    return this.prisma.$transaction(async (tx) => {
      const batch = await tx.settlementBatch.findUnique({
        where: { id: batchId },
      });
      if (!batch) {
        throw new NotFoundException(`Settlement batch ${batchId} not found`);
      }
      if (batch.status !== "DRAFT") {
        throw new ConflictException(
          `Settlement batch ${batchId} already processed`,
        );
      }
      // Approving a DRAFT freezes the operator's financial snapshot.
      // New APPROVED commissions for the same calendar period may have
      // appeared after generation. Never approve totals that omit them.
      const periodMatch = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(batch.period);
      if (!periodMatch) {
        throw new ConflictException(
          `Settlement batch ${batchId} has an invalid period; reconcile first`,
        );
      }
      const periodYear = Number(periodMatch[1]);
      const periodMonth = Number(periodMatch[2]);
      const unbatchedApproved = await tx.commission.count({
        where: {
          status: CommissionStatus.APPROVED,
          createdAt: {
            gte: new Date(periodYear, periodMonth - 1, 1),
            lt: new Date(periodYear, periodMonth, 1),
          },
          settlementBatchId: null,
        },
      });
      if (unbatchedApproved > 0) {
        throw new ConflictException(
          `Settlement ${batch.period} has approved commissions outside its batch; reconcile before approval`,
        );
      }
      // APPROVED is a review decision, not evidence of an external payout.
      // Never change member commission statuses or paidAt at this stage.
      const claimed = await tx.settlementBatch.updateMany({
        where: { id: batchId, status: "DRAFT" },
        data: { status: "APPROVED", approvedAt: new Date(), approvedBy },
      });
      if (claimed.count !== 1) {
        throw new ConflictException(
          `Settlement batch ${batchId} approved concurrently`,
        );
      }
      const updated = await tx.settlementBatch.findUniqueOrThrow({
        where: { id: batchId },
      });
      this.logger.log(`[SETTLEMENT] Batch ${batchId} approved (not paid)`);
      return this.mapBatchToOutput(updated);
    });
  }

  /**
   * Legacy payout endpoint is suspended until bank-confirmed reconciliation
   * can update each beneficiary and its ledger idempotently.
   */
  async paySettlementBatch(
    batchId: string,
    paidBy: string,
    referenceNum?: string,
  ) {
    // #309: This method never confirmed a bank transfer; it wrote PAID and
    // COMPLETED directly, and reused a unique reference across beneficiaries.
    // Preserve its contract for callers, but fail closed before any DB write.
    void batchId;
    void paidBy;
    void referenceNum;
    throw new ConflictException(
      "Pago de liquidaciones suspendido en esta ruta: requiere confirmación " +
        "bancaria por beneficiario y conciliación financiera.",
    );
  }

  /**
   * Reconciliación: Comisiones ↔ Pagos Confirmados ↔ Pagos Efectuados
   * Detecta discrepancias para auditoría.
   */
  async reconcileCommissions(month: number, year: number) {
    // Internal callers bypass HTTP param validation. Date() normalizes
    // months 0/13 or fractional inputs into a different accounting period,
    // which could otherwise produce a falsely clean reconciliation report.
    // Keep the service domain bound aligned with monthly batch generation.
    if (
      !Number.isInteger(month) ||
      month < 1 ||
      month > 12 ||
      !Number.isInteger(year) ||
      year < 2020 ||
      year > 2100
    ) {
      throw new BadRequestException(
        "month/year deben representar un período válido",
      );
    }
    const periodKey = `${year}-${String(month).padStart(2, "0")}`;

    this.logger.log(`[RECONCILIATION] Running reconciliation for ${periodKey}`);

    // 1. Comisiones en el periodo
    const commissions = await this.prisma.commission.findMany({
      where: {
        createdAt: {
          gte: new Date(year, month - 1, 1),
          lt: new Date(year, month, 1),
        },
      },
      select: {
        id: true,
        driverId: true,
        amount: true,
        sourceType: true,
        status: true,
        reference: true,
        settlementBatchId: true,
        createdAt: true,
        approvedAt: true,
        paidAt: true,
      },
    });

    // 2. Transacciones financieras OPEX_COMMISSION del periodo
    const ledgerEntries = await this.prisma.financialTransaction.findMany({
      where: {
        category: "OPEX_COMMISSION",
        createdAt: {
          gte: new Date(year, month - 1, 1),
          lt: new Date(year, month, 1),
        },
      },
      select: {
        id: true,
        reference: true,
        type: true,
        amount: true,
        netAmount: true,
        taxAmount: true,
        currency: true,
        status: true,
        entityId: true,
        createdAt: true,
      },
    });

    // 3. Lotes de liquidación del periodo
    const batches = await this.prisma.settlementBatch.findMany({
      where: { period: periodKey },
    });

    // 4. Pagos de comisiones (OPEX_COMMISSION_PAYOUT)
    const payouts = await this.prisma.financialTransaction.findMany({
      where: {
        category: "OPEX_COMMISSION_PAYOUT",
        createdAt: {
          gte: new Date(year, month - 1, 1),
          lt: new Date(year, month, 1),
        },
      },
      select: {
        id: true,
        reference: true,
        amount: true,
        netAmount: true,
        taxAmount: true,
        entityId: true,
        status: true,
        createdAt: true,
      },
    });

    // Reversals may be posted months after the original commission.
    // Look them up by the exact immutable source reference, NOT by the
    // reconciliation month's ledger createdAt window. The reference column
    // has a unique index and avoids scanning unrelated financial rows.
    // Bound each IN-list to avoid unbounded SQL parameters at 10x volume.
    const reversalReferences = [
      ...new Set(commissions.map((c) => `REV-${c.reference}`)),
    ];
    const reversals: Array<{
      id: string;
      reference: string | null;
      entityId: string | null;
      type: string;
      amount: number;
      netAmount: number;
      taxAmount: number;
      currency: string;
      status: string;
    }> = [];
    for (let offset = 0; offset < reversalReferences.length; offset += 500) {
      const matches = await this.prisma.financialTransaction.findMany({
        where: {
          category: "OPEX_COMMISSION_REVERSAL",
          reference: { in: reversalReferences.slice(offset, offset + 500) },
        },
        select: {
          id: true,
          reference: true,
          entityId: true,
          type: true,
          currency: true,
          amount: true,
          netAmount: true,
          taxAmount: true,
          status: true,
        },
      });
      reversals.push(...matches);
    }

    // Análisis de discrepancias
    const discrepancies: string[] = [];

    // Index source records by their unique reference. Avoid quadratic scans
    // as driver/commission volume grows 10x, and never confuse a reference
    // match with a valid economic event.
    const ledgerByReference = new Map(
      ledgerEntries.map((entry) => [entry.reference, entry] as const),
    );
    const commissionByReference = new Map(
      commissions.map(
        (commission) => [commission.reference, commission] as const,
      ),
    );
    const reversalByReference = new Map(
      reversals.map((entry) => [entry.reference, entry] as const),
    );

    for (const c of commissions) {
      const ledger = ledgerByReference.get(c.reference);
      if (!ledger) {
        discrepancies.push(
          `Commission ${c.id} (${c.reference}) has no ledger entry`,
        );
        continue;
      }
      if (ledger.amount !== c.amount) {
        discrepancies.push(
          `Commission ${c.id} amount mismatch: commission=${c.amount}, ledger=${ledger.amount}`,
        );
      }
      if (ledger.entityId !== c.driverId) {
        discrepancies.push(`Commission ${c.id} ledger beneficiary mismatch`);
      }
      if (ledger.type !== "OUTGOING" || ledger.currency !== "DOP") {
        discrepancies.push(`Commission ${c.id} ledger type/currency mismatch`);
      }
      if (ledger.netAmount !== c.amount || ledger.taxAmount !== 0) {
        discrepancies.push(`Commission ${c.id} ledger net/tax mismatch`);
      }
      // Approved credits must have exactly one completed source ledger
      // entry. Pending commissions must not masquerade as completed credits.
      const expectedStatus =
        c.status === CommissionStatus.PENDING ||
        (c.status === CommissionStatus.REVOKED && !c.approvedAt)
          ? "PENDING"
          : c.status === CommissionStatus.APPROVED ||
              c.status === CommissionStatus.PAID ||
              (c.status === CommissionStatus.REVOKED && !!c.approvedAt)
            ? "COMPLETED"
            : null;
      if (expectedStatus && ledger.status !== expectedStatus) {
        discrepancies.push(`Commission ${c.id} source ledger status mismatch`);
      }
    }

    // Ledger entries with no related commission must never be ignored.
    for (const l of ledgerEntries) {
      if (!l.reference || !commissionByReference.has(l.reference)) {
        discrepancies.push(
          `Ledger entry ${l.id} (${l.reference}) has no matching commission`,
        );
      }
    }

    // A revoked credit has to have its exact, completed compensating
    // financial entry. A PENDING commission was never wallet-credited,
    // therefore a reversal would instead be an unexpected money movement.
    // This verifies ledger consistency, not the bank or current wallet state.
    for (const c of commissions) {
      const reversal = reversalByReference.get(`REV-${c.reference}`);
      const fundedRevocation =
        c.status === CommissionStatus.REVOKED && !!c.approvedAt;
      if (fundedRevocation && !reversal) {
        discrepancies.push(
          `Commission ${c.id} revoked after approval but has no reversal ledger entry`,
        );
        continue;
      }
      if (!fundedRevocation && reversal) {
        discrepancies.push(
          `Commission ${c.id} has an unexpected reversal ledger entry`,
        );
        continue;
      }
      if (fundedRevocation && reversal) {
        if (
          reversal.entityId !== c.driverId ||
          reversal.type !== "INCOMING" ||
          reversal.currency !== "DOP" ||
          reversal.amount !== c.amount ||
          reversal.netAmount !== c.amount ||
          reversal.taxAmount !== 0 ||
          reversal.status !== "COMPLETED"
        ) {
          discrepancies.push(
            `Commission ${c.id} reversal ledger attribution/amount/status mismatch`,
          );
        }
      }
    }

    // Comisiones APPROVED sin lote
    const approvedWithoutBatch = commissions.filter(
      (c) => c.status === "APPROVED" && !c.settlementBatchId,
    );
    if (approvedWithoutBatch.length > 0) {
      discrepancies.push(
        `${approvedWithoutBatch.length} APPROVED commissions not assigned to settlement batch`,
      );
    }

    // A payout reference containing an ID prefix is NOT bank evidence.
    // The legacy payout route and individual mark-paid method are disabled
    // until per-beneficiary bank confirmation exists (#309/#338). Therefore
    // a historical PAID commission cannot be declared reconciled here,
    // even if an unverified OPEX_COMMISSION_PAYOUT row happens to exist.
    for (const c of commissions) {
      if (c.status === CommissionStatus.PAID) {
        discrepancies.push(
          `Commission ${c.id} marked PAID without verified bank evidence; manual reconciliation required`,
        );
      }
    }

    return {
      period: periodKey,
      summary: {
        totalCommissions: commissions.length,
        totalLedgerEntries: ledgerEntries.length,
        totalBatches: batches.length,
        totalPayouts: payouts.length,
        commissionsByStatus: this.groupBy(commissions, "status"),
        ledgerByStatus: this.groupBy(ledgerEntries, "status"),
      },
      discrepancies,
      isClean: discrepancies.length === 0,
    };
  }

  /**
   * Obtiene comisiones pendientes de aprobación para un conductor
   */
  async getPendingCommissions(driverId: string) {
    return this.prisma.commission.findMany({
      where: { driverId, status: CommissionStatus.PENDING },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Obtiene historial de comisiones de un conductor
   */
  async getDriverCommissionHistory(driverId: string) {
    return this.prisma.commission.findMany({
      where: { driverId },
      orderBy: { createdAt: "desc" },
      include: {
        settlementBatch: { select: { id: true, period: true, status: true } },
      },
    });
  }

  /**
   * The same unique reference can only identify one economic event.
   * Metadata notes/timestamps are not identity fields; the referred driver
   * and campaign are. Reject mismatched replays rather than leaking someone
   * else's commission or silently accepting a different amount.
   */
  private assertMatchingCommissionReplay(
    existing: {
      driverId: string;
      amount: number;
      sourceType: string;
      metadata: unknown;
    },
    input: CreateCommissionInput,
  ): void {
    const eventId = (value: unknown, key: string): string | undefined => {
      if (value === null || typeof value !== "object" || Array.isArray(value)) {
        return undefined;
      }
      const field = (value as Record<string, unknown>)[key];
      return typeof field === "string" ? field : undefined;
    };

    if (
      existing.driverId !== input.driverId ||
      existing.amount !== input.amount ||
      existing.sourceType !== input.sourceType ||
      eventId(existing.metadata, "referredDriverId") !==
        eventId(input.metadata, "referredDriverId") ||
      eventId(existing.metadata, "campaignId") !==
        eventId(input.metadata, "campaignId")
    ) {
      throw new ConflictException(
        "Commission reference belongs to another economic event",
      );
    }
  }

  private groupBy<T>(array: T[], key: keyof T): Record<string, number> {
    return array.reduce(
      (acc, item) => {
        const k = String(item[key]);
        acc[k] = (acc[k] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  }

  private relatedEntityId(metadata: Prisma.JsonValue): string | undefined {
    if (
      typeof metadata !== "object" ||
      metadata === null ||
      Array.isArray(metadata)
    )
      return undefined;
    const id = metadata.campaignId || metadata.referredDriverId;
    return typeof id === "string" ? id : undefined;
  }

  private mapBatchToOutput(batch: StoredSettlementBatch): SettlementBatch {
    return {
      id: batch.id,
      period: batch.period,
      // This JSON is produced from SettlementReferent[] by generateMonthlySettlement.
      referents: (batch.referents || []) as unknown as SettlementReferent[],
      grossTotal: batch.grossTotal,
      netTotal: batch.netTotal,
      withholdings: batch.withholdings,
      status: batch.status as SettlementBatch["status"],
      approvedAt: batch.approvedAt,
      paidAt: batch.paidAt,
      createdAt: batch.createdAt,
    };
  }
}
