import { Injectable, BadRequestException, NotFoundException, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { BUSINESS_RULES } from "../../common/constants/business-rules";

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
  metadata?: Record<string, any>;
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
  approvedAt?: Date;
  paidAt?: Date;
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
    this.logger.log(
      `[COMMISSION] Creating idempotent commission: ${input.reference} for driver ${input.driverId}`,
    );

    return this.prisma.$transaction(async (tx) => {
      // 1. Verificar si ya existe por reference (idempotencia)
      const existing = await tx.commission.findFirst({
        where: { reference: input.reference },
      });

      if (existing) {
        this.logger.warn(
          `[COMMISSION] Duplicate reference ${input.reference} - returning existing commission ${existing.id}`,
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
  }

  /**
   * Aprueba una comisión pendiente (cambio de estado PENDING → APPROVED)
   * Solo operable por ADMIN.
   */
  async approveCommission(commissionId: string, approvedBy: string) {
    this.logger.log(`[COMMISSION] Approving commission ${commissionId} by ${approvedBy}`);

    return this.prisma.$transaction(async (tx) => {
      const commission = await tx.commission.findUnique({
        where: { id: commissionId },
      });

      if (!commission) {
        throw new NotFoundException(`Commission ${commissionId} not found`);
      }

      if (commission.status !== CommissionStatus.PENDING) {
        throw new BadRequestException(
          `Commission ${commissionId} is not in PENDING status (current: ${commission.status})`,
        );
      }

      // Actualizar comisión a APPROVED
      const updated = await tx.commission.update({
        where: { id: commissionId },
        data: {
          status: CommissionStatus.APPROVED,
          approvedAt: new Date(),
          approvedBy,
        },
      });

      // Actualizar ledger a COMPLETED
      await tx.financialTransaction.updateMany({
        where: { reference: commission.reference },
        data: { status: "COMPLETED" },
      });

      // Incrementar wallet del conductor
      await tx.wallet.upsert({
        where: { driverId: commission.driverId },
        update: { availableBalance: { increment: commission.amount } },
        create: { driverId: commission.driverId, availableBalance: commission.amount },
      });

      this.logger.log(`[COMMISSION] Approved commission ${commissionId}, wallet incremented`);

      return updated;
    });
  }

  /**
   * Marca comisión como pagada (APPROVED → PAID)
   * Se ejecuta durante el cierre mensual.
   */
  async markCommissionPaid(commissionId: string, paidAt: Date = new Date()) {
    const commission = await this.prisma.commission.findUnique({
      where: { id: commissionId },
    });

    if (!commission) {
      throw new NotFoundException(`Commission ${commissionId} not found`);
    }

    if (commission.status !== CommissionStatus.APPROVED) {
      throw new BadRequestException(
        `Commission ${commissionId} must be APPROVED before marking PAID (current: ${commission.status})`,
      );
    }

    return this.prisma.commission.update({
      where: { id: commissionId },
      data: {
        status: CommissionStatus.PAID,
        paidAt,
      },
    });
  }

  /**
   * Revoca una comisión (fraude, reembolso, anulación)
   * Crea entrada compensatoria en ledger y revierte wallet si ya se pagó.
   */
  async revokeCommission(commissionId: string, reason: string, revokedBy: string) {
    this.logger.warn(`[COMMISSION] Revoking commission ${commissionId}: ${reason}`);

    return this.prisma.$transaction(async (tx) => {
      const commission = await tx.commission.findUnique({
        where: { id: commissionId },
      });

      if (!commission) {
        throw new NotFoundException(`Commission ${commissionId} not found`);
      }

      if (commission.status === CommissionStatus.REVOKED) {
        throw new BadRequestException(`Commission ${commissionId} already revoked`);
      }

      // Marcar comisión como REVOKED
      await tx.commission.update({
        where: { id: commissionId },
        data: {
          status: CommissionStatus.REVOKED,
          revokedAt: new Date(),
          revokedBy,
          revocationReason: reason,
        },
      });

      // Si ya estaba APROBADA/PAGADA, crear entrada compensatoria en ledger
      if ([CommissionStatus.APPROVED, CommissionStatus.PAID].includes(commission.status as CommissionStatus)) {
        await tx.financialTransaction.create({
          data: {
            type: "INCOMING", // Reversión: entrada positiva para la empresa
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

        // Revertir wallet si ya se había abonado
        if (commission.status === CommissionStatus.PAID) {
          await tx.wallet.update({
            where: { driverId: commission.driverId },
            data: { availableBalance: { decrement: commission.amount } },
          });
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
  async generateMonthlySettlement(input: MonthlySettlementInput): Promise<SettlementBatch> {
    const { month, year, generatedBy } = input;
    const periodKey = `${year}-${String(month).padStart(2, "0")}`;

    this.logger.log(`[SETTLEMENT] Generating monthly settlement for ${periodKey}`);

    return this.prisma.$transaction(async (tx) => {
      // 1. Verificar idempotencia: ¿ya existe lote para este periodo?
      const existingBatch = await tx.settlementBatch.findUnique({
        where: { period: periodKey },
      });

      if (existingBatch) {
        this.logger.warn(`[SETTLEMENT] Batch for ${periodKey} already exists, returning existing`);
        return this.mapBatchToOutput(existingBatch);
      }

      // 2. Obtener comisiones APPROVED del periodo que no estén en un lote
      const commissions = await tx.commission.findMany({
        where: {
          status: CommissionStatus.APPROVED,
          createdAt: {
            gte: new Date(year, month - 1, 1),
            lt: new Date(year, month, 1),
          },
          settlementBatchId: null,
        },
        include: {
          driver: { select: { id: true, fullName: true } },
        },
        orderBy: { driverId: "asc" },
      });

      if (commissions.length === 0) {
        this.logger.log(`[SETTLEMENT] No approved commissions for ${periodKey}`);
        // Crear lote vacío para marcar periodo como procesado
        const emptyBatch = await tx.settlementBatch.create({
          data: {
            period: periodKey,
            status: "APPROVED",
            grossTotal: 0,
            netTotal: 0,
            withholdings: 0,
            referentsCount: 0,
            commissionsCount: 0,
            generatedBy,
            approvedAt: new Date(),
            approvedBy: generatedBy,
            createdAt: new Date(),
          },
        });
        return this.mapBatchToOutput(emptyBatch);
      }

      // 3. Agrupar por referente (driverId)
      const byReferent = new Map<string, SettlementReferent>();

      for (const c of commissions) {
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
          relatedEntityId: (c.metadata as Record<string, any>)?.campaignId || (c.metadata as Record<string, any>)?.referredDriverId,
        });
        ref.grossAmount += c.amount;
      }

      // 4. Calcular retenciones (10% según BUSINESS_RULES.REFERRAL_RETENTION_RATE)
      let totalGross = 0;
      let totalWithholdings = 0;

      for (const ref of byReferent.values()) {
        ref.withholding = Math.round(ref.grossAmount * BUSINESS_RULES.REFERRAL_RETENTION_RATE);
        ref.netAmount = ref.grossAmount - ref.withholding;
        totalGross += ref.grossAmount;
        totalWithholdings += ref.withholding;
      }

      const totalNet = totalGross - totalWithholdings;

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
          referents: JSON.parse(JSON.stringify(Array.from(byReferent.values()))),
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

      // 6. Vincular comisiones al lote
      await tx.commission.updateMany({
        where: {
          id: { in: commissions.map((c) => c.id) },
        },
        data: { settlementBatchId: batch.id },
      });

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
        throw new BadRequestException(`Batch ${batchId} is not in DRAFT status`);
      }

      // Marcar comisiones como PAID
      await tx.commission.updateMany({
        where: { settlementBatchId: batchId },
        data: {
          status: CommissionStatus.PAID,
          paidAt: new Date(),
        },
      });

      // Actualizar lote a APPROVED
      const updated = await tx.settlementBatch.update({
        where: { id: batchId },
        data: {
          status: "APPROVED",
          approvedAt: new Date(),
          approvedBy,
        },
      });

      this.logger.log(`[SETTLEMENT] Batch ${batchId} approved, ${batch.commissionsCount} commissions marked PAID`);

      return this.mapBatchToOutput(updated);
    });
  }

  /**
   * Paga un lote aprobado (APPROVED → PAID)
   * Genera las órdenes de pago reales (transferencias bancarias).
   */
  async paySettlementBatch(batchId: string, paidBy: string, referenceNum?: string) {
    this.logger.log(`[SETTLEMENT] Paying batch ${batchId} by ${paidBy}`);

    return this.prisma.$transaction(async (tx) => {
      const batch = await tx.settlementBatch.findUnique({
        where: { id: batchId },
      });

      if (!batch) {
        throw new NotFoundException(`Settlement batch ${batchId} not found`);
      }

      if (batch.status !== "APPROVED") {
        throw new BadRequestException(`Batch ${batchId} must be APPROVED before paying`);
      }

      const referents = (batch.referents as unknown) as SettlementReferent[];

      // Procesar pago por referente
      for (const ref of referents) {
        // Crear registro de pago en financialTransaction
        await tx.financialTransaction.create({
          data: {
            type: "OUTGOING",
            category: "OPEX_COMMISSION_PAYOUT",
            amount: ref.netAmount,
            netAmount: ref.netAmount,
            taxAmount: ref.withholding,
            entityId: ref.driverId,
            reference: referenceNum || `SETTLE-${batch.period}-${ref.driverId.slice(0, 8)}`,
            note: `Pago liquidación comisiones ${batch.period} - ${ref.commissions.length} comisiones`,
            status: "COMPLETED",
          },
        });

        // Notificar al conductor (fire-and-forget)
        // await this.notificationsService.sendDriverNotification(...)
      }

      const updated = await tx.settlementBatch.update({
        where: { id: batchId },
        data: {
          status: "PAID",
          paidAt: new Date(),
          paidBy,
          paymentReference: referenceNum,
        },
      });

      this.logger.log(`[SETTLEMENT] Batch ${batchId} marked as PAID`);

      return this.mapBatchToOutput(updated);
    });
  }

  /**
   * Reconciliación: Comisiones ↔ Pagos Confirmados ↔ Pagos Efectuados
   * Detecta discrepancias para auditoría.
   */
  async reconcileCommissions(month: number, year: number) {
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
        amount: true,
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

    // Análisis de discrepancias
    const discrepancies: string[] = [];

    // Comisión sin entrada en ledger
    for (const c of commissions) {
      const ledger = ledgerEntries.find((l) => l.reference === c.reference);
      if (!ledger) {
        discrepancies.push(`Commission ${c.id} (${c.reference}) has no ledger entry`);
      } else if (ledger.amount !== c.amount) {
        discrepancies.push(`Commission ${c.id} amount mismatch: commission=${c.amount}, ledger=${ledger.amount}`);
      }
    }

    // Entrada en ledger sin comisión
    for (const l of ledgerEntries) {
      const commission = commissions.find((c) => c.reference === l.reference);
      if (!commission) {
        discrepancies.push(`Ledger entry ${l.id} (${l.reference}) has no matching commission`);
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

    // Comisiones PAID sin payout correspondiente
    const paidCommissions = commissions.filter((c) => c.status === "PAID");
    for (const c of paidCommissions) {
      const payout = payouts.find((p) => p.reference?.includes(c.driverId.slice(0, 8)));
      if (!payout) {
        discrepancies.push(`Commission ${c.id} marked PAID but no payout found for driver ${c.driverId}`);
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

  private groupBy<T>(array: T[], key: keyof T): Record<string, number> {
    return array.reduce((acc, item) => {
      const k = String(item[key]);
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private mapBatchToOutput(batch: any): SettlementBatch {
    return {
      id: batch.id,
      period: batch.period,
      referents: batch.referents || [],
      grossTotal: batch.grossTotal,
      netTotal: batch.netTotal,
      withholdings: batch.withholdings,
      status: batch.status,
      approvedAt: batch.approvedAt,
      paidAt: batch.paidAt,
      createdAt: batch.createdAt,
    };
  }
}