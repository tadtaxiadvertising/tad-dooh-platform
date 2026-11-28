/**
 * Payment Evidence Service
 *
 * Maneja la recepción, validación y revisión humana de comprobantes de pago.
 * Según Plan Maestro TAD v1: "El comprobante enviado por WhatsApp no es una prueba
 * financiera definitiva. Es una evidencia pendiente de revisión."
 *
 * Estados: SUBMITTED → UNDER_REVIEW → PAYMENT_CONFIRMED | REJECTED
 */
import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { ConfigService } from "@nestjs/config";
import { Prisma, type PaymentIntent } from "@prisma/client";

export interface CreatePaymentEvidenceInput {
  paymentIntentId: string;
  fileUrl: string;
  fileHash?: string;
  fileSize?: number;
  mimeType?: string;
  submittedBy: string;
  metadata?: Prisma.InputJsonObject;
}

export interface ReviewPaymentEvidenceInput {
  evidenceId: string;
  expectedSubmittedAt: Date;
  reviewedBy: string;
  status: "PAYMENT_CONFIRMED" | "REJECTED";
  reviewNote?: string;
  amountConfirmed?: number;
}

@Injectable()
export class PaymentEvidenceService {
  private readonly logger = new Logger(PaymentEvidenceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Recibe un comprobante de pago y lo asocia a una PaymentIntent
   * Una evidencia por intención; las sustituciones crean una nueva versión.
   */
  async submitEvidence(input: CreatePaymentEvidenceInput) {
    this.logger.log(
      `Submitting payment evidence for intent: ${input.paymentIntentId}`,
    );

    const result = await this.prisma.$transaction(async (tx) => {
      // Verificar que la intención de pago existe
      const paymentIntent = await tx.paymentIntent.findUnique({
        where: { id: input.paymentIntentId },
      });

      if (!paymentIntent) {
        throw new NotFoundException(
          `PaymentIntent ${input.paymentIntentId} not found`,
        );
      }

      if (
        ["PAID", "REJECTED", "REFUNDED", "FAILED", "EXPIRED"].includes(
          paymentIntent.status,
        )
      ) {
        throw new ConflictException("Payment intent is already resolved");
      }

      // Idempotente: si ya hay una evidencia pendiente, la actualizamos en
      // lugar de crear una duplicada dentro de la misma transacción.
      const existing = await tx.paymentEvidence.findFirst({
        where: {
          paymentIntentId: input.paymentIntentId,
          reviewStatus: { in: ["SUBMITTED", "UNDER_REVIEW"] },
        },
      });
      if (existing) {
        this.logger.warn(
          `Evidence already exists for ${input.paymentIntentId}, updating`,
        );
        // Preserve a strictly increasing version even on same-ms retries
        // or when a previous writer's clock is ahead of this process.
        const nextSubmittedAt = new Date(
          Math.max(Date.now(), existing.submittedAt.getTime() + 1),
        );
        // A stale submission must never reopen a reviewed evidence row.
        const updated = await tx.paymentEvidence.updateMany({
          where: {
            id: existing.id,
            reviewStatus: existing.reviewStatus,
            submittedAt: existing.submittedAt,
          },
          data: {
            fileUrl: input.fileUrl,
            // A replacement is a new file, not a patch of its predecessor.
            // Prisma omits undefined fields; explicitly clear absent descriptors.
            fileHash: input.fileHash ?? null,
            fileSize: input.fileSize ?? null,
            mimeType: input.mimeType ?? null,
            submittedBy: input.submittedBy,
            submittedAt: nextSubmittedAt,
            reviewStatus: "SUBMITTED",
            metadata: input.metadata ?? Prisma.DbNull,
          },
        });
        if (updated.count !== 1) {
          throw new ConflictException("Payment evidence changed during submit");
        }
        const task = await tx.humanReviewTask.updateMany({
          where: {
            type: "PAYMENT_VERIFICATION",
            entityId: existing.id,
            entityType: "PaymentEvidence",
            status: "PENDING",
          },
          data: {
            payload: this.reviewSnapshot(paymentIntent, input, nextSubmittedAt),
          },
        });
        if (task.count !== 1) {
          throw new ConflictException(
            "Payment review task requires reconciliation",
          );
        }
        return tx.paymentEvidence.findUniqueOrThrow({
          where: { id: existing.id },
        });
      }

      // Crear nueva evidencia
      const submittedAt = new Date();
      const evidence = await tx.paymentEvidence.create({
        data: {
          paymentIntentId: input.paymentIntentId,
          fileUrl: input.fileUrl,
          fileHash: input.fileHash,
          fileSize: input.fileSize,
          mimeType: input.mimeType,
          submittedBy: input.submittedBy,
          submittedAt,
          reviewStatus: "SUBMITTED",
          metadata: input.metadata,
        },
      });

      // Crear HumanReviewTask para revisión obligatoria
      await tx.humanReviewTask.create({
        data: {
          type: "PAYMENT_VERIFICATION",
          entityId: evidence.id,
          entityType: "PaymentEvidence",
          status: "PENDING",
          payload: this.reviewSnapshot(paymentIntent, input, submittedAt),
        },
      });

      // Actualizar PaymentIntent status a UNDER_REVIEW
      const claimed = await tx.paymentIntent.updateMany({
        where: { id: input.paymentIntentId, status: paymentIntent.status },
        data: { status: "UNDER_REVIEW" },
      });
      if (claimed.count !== 1) {
        throw new ConflictException("Payment intent changed during submit");
      }

      this.logger.log(
        `Payment evidence ${evidence.id} submitted, HumanReviewTask created`,
      );
      return evidence;
    });

    return result;
  }

  private reviewSnapshot(
    intent: PaymentIntent,
    input: CreatePaymentEvidenceInput,
    submittedAt: Date,
  ): Prisma.InputJsonObject {
    return {
      paymentIntentId: intent.id,
      fileUrl: input.fileUrl,
      amount: intent.amount,
      currency: intent.currency,
      type: intent.type,
      leadId: intent.leadId,
      submittedAt: submittedAt.toISOString(),
    };
  }

  /**
   * Revisión humana de la evidencia
   * Solo ADMIN puede llamar esto
   */
  async reviewEvidence(input: ReviewPaymentEvidenceInput) {
    this.logger.log(
      `Reviewing payment evidence ${input.evidenceId} by ${input.reviewedBy}: ${input.status}`,
    );

    const evidence = await this.prisma.paymentEvidence.findUnique({
      where: { id: input.evidenceId },
      include: { paymentIntent: true },
    });

    if (!evidence) {
      throw new NotFoundException(
        `PaymentEvidence ${input.evidenceId} not found`,
      );
    }

    // Bind the decision to the exact evidence version displayed to the operator.
    // Check before the terminal-state replay as well as the transaction claim.
    if (
      !(input.expectedSubmittedAt instanceof Date) ||
      input.expectedSubmittedAt.getTime() !== evidence.submittedAt.getTime()
    ) {
      throw new ConflictException({
        code: "PAYMENT_EVIDENCE_VERSION_CONFLICT",
        message: "Reload the payment evidence before reviewing it.",
      });
    }

    if (evidence.reviewStatus === input.status) return evidence;
    if (!["SUBMITTED", "UNDER_REVIEW"].includes(evidence.reviewStatus)) {
      throw new ConflictException("Payment evidence decision already resolved");
    }

    const result = await this.prisma.$transaction(
      async (tx) => {
        // Only one reviewer can claim this exact pending evidence version.
        const claimed = await tx.paymentEvidence.updateMany({
          where: {
            id: input.evidenceId,
            reviewStatus: evidence.reviewStatus,
            submittedAt: evidence.submittedAt,
          },
          data: {
            reviewStatus: input.status,
            reviewedBy: input.reviewedBy,
            reviewedAt: new Date(),
            reviewNote: input.reviewNote,
          },
        });
        const updatedEvidence = await tx.paymentEvidence.findUnique({
          where: { id: input.evidenceId },
        });
        if (!updatedEvidence || updatedEvidence.reviewStatus !== input.status) {
          throw new ConflictException("Payment evidence changed during review");
        }
        if (claimed.count === 0) {
          if (
            updatedEvidence.submittedAt.getTime() !==
            evidence.submittedAt.getTime()
          ) {
            throw new ConflictException("Payment evidence version changed");
          }
          return updatedEvidence;
        }
        if (claimed.count !== 1) {
          throw new ConflictException(
            "Unexpected payment evidence claim count",
          );
        }

        // Actualizar HumanReviewTask
        const task = await tx.humanReviewTask.updateMany({
          where: {
            type: "PAYMENT_VERIFICATION",
            entityId: input.evidenceId,
            entityType: "PaymentEvidence",
            status: "PENDING",
          },
          data: {
            status:
              input.status === "PAYMENT_CONFIRMED" ? "APPROVED" : "REJECTED",
            reviewerId: input.reviewedBy,
            reviewedAt: new Date(),
            reviewNote: input.reviewNote,
          },
        });

        if (task.count !== 1) {
          throw new ConflictException(
            "Payment review task requires reconciliation",
          );
        }

        // Si confirmado, crear PaymentVerification y actualizar PaymentIntent
        if (input.status === "PAYMENT_CONFIRMED") {
          await this.confirmPayment(
            tx,
            evidence.paymentIntentId,
            input.reviewedBy,
            input.amountConfirmed,
          );
        } else {
          // Rechazado
          await tx.paymentIntent.update({
            where: { id: evidence.paymentIntentId },
            data: { status: "REJECTED" },
          });
        }

        return updatedEvidence;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );

    return result;
  }

  /**
   * Confirma el pago tras revisión humana exitosa.
   * Es idempotente: si el intento ya estaba PAID no vuelve a crear la
   * verificación ni a re-actualizar el proceso de pago.
   * @internal
   */
  private async confirmPayment(
    tx: Prisma.TransactionClient,
    paymentIntentId: string,
    verifiedBy: string,
    amountConfirmed?: number,
  ) {
    const paymentIntent = await tx.paymentIntent.findUnique({
      where: { id: paymentIntentId },
    });

    if (!paymentIntent) {
      throw new NotFoundException(`PaymentIntent ${paymentIntentId} not found`);
    }

    // Idempotente: ya estaba pagado, no crear verificación duplicada ni
    // re-ejecutar los flujos de confirmación.
    if (paymentIntent.status === "PAID") {
      this.logger.log(
        `Payment ${paymentIntentId} already PAID, skipping re-confirm`,
      );
      return;
    }

    const confirmedAmount = amountConfirmed || paymentIntent.amount;

    // Crear PaymentVerification
    await tx.paymentVerification.create({
      data: {
        paymentIntentId,
        verifiedBy,
        status: "PAYMENT_CONFIRMED",
        amountConfirmed: confirmedAmount,
        note: `Confirmed by human operator ${verifiedBy}`,
      },
    });

    // Actualizar PaymentIntent
    await tx.paymentIntent.update({
      where: { id: paymentIntentId },
      data: {
        status: "PAID",
        paidAt: new Date(),
        providerRef: `MANUAL-${verifiedBy}-${Date.now()}`,
      },
    });

    // Disparar flujo según tipo
    if (paymentIntent.type === "DRIVER_SUBSCRIPTION") {
      await this.handleDriverSubscriptionConfirmed(
        tx,
        paymentIntent,
        confirmedAmount,
      );
    } else if (paymentIntent.type === "ADVERTISER_CAMPAIGN") {
      await this.handleAdvertiserCampaignConfirmed(
        tx,
        paymentIntent,
        confirmedAmount,
      );
    }

    this.logger.log(
      `Payment ${paymentIntentId} confirmed by ${verifiedBy}, amount: ${confirmedAmount}`,
    );
  }

  /**
   * Maneja suscripción de conductor confirmada
   * - Actualiza driver.subscriptionPaid = true
   * - Crea comisión de referido si aplica (RD$500)
   * - Actualiza onboardingStatus
   */
  private async handleDriverSubscriptionConfirmed(
    tx: Prisma.TransactionClient,
    paymentIntent: PaymentIntent,
    amount: number,
  ) {
    this.logger.log(
      `Handling driver subscription confirmed for lead: ${paymentIntent.leadId}`,
    );

    if (!paymentIntent.leadId) {
      this.logger.warn(`No leadId on paymentIntent ${paymentIntent.id}`);
      return;
    }

    // Buscar lead
    const lead = await tx.lead.findUnique({
      where: { id: paymentIntent.leadId },
    });

    if (!lead || !lead.referrerId) {
      this.logger.log(`No referrer for lead ${paymentIntent.leadId}`);
      return;
    }

    // Verificar si ya se creó comisión para este referido
    const commissionRef = `REF-DRIVER-${paymentIntent.leadId}-${Date.now()}`;
    const claimed = await this.claimReferralCommission(
      tx,
      paymentIntent.leadId,
      lead.referrerId,
      lead.referrerCode ?? "",
      "DRIVER_SUBSCRIPTION",
      commissionRef,
    );
    if (!claimed) return;

    await tx.commission.create({
      data: {
        driverId: lead.referrerId,
        amount: 500,
        sourceType: "DRIVER_REFERRAL",
        reference: commissionRef,
        status: "PENDING",
        metadata: {
          leadId: paymentIntent.leadId,
          paymentIntentId: paymentIntent.id,
          amount,
        },
      },
    });

    await tx.lead.update({
      where: { id: paymentIntent.leadId },
      data: { status: "CONVERTED" },
    });

    this.logger.log(
      `Driver referral commission created for referrer ${lead.referrerId}`,
    );
  }

  /**
   * Maneja campaña de anunciante confirmada
   * - Actualiza campaña status = ACTIVE
   * - Crea comisión de referido si aplica
   */
  private async handleAdvertiserCampaignConfirmed(
    tx: Prisma.TransactionClient,
    paymentIntent: PaymentIntent,
    amount: number,
  ) {
    this.logger.log(
      `Handling advertiser campaign confirmed for lead: ${paymentIntent.leadId}`,
    );

    if (!paymentIntent.leadId) return;

    const lead = await tx.lead.findUnique({
      where: { id: paymentIntent.leadId },
    });

    if (!lead || !lead.referrerId) return;

    const commissionRef = `REF-ADV-${paymentIntent.leadId}-${Date.now()}`;
    const claimed = await this.claimReferralCommission(
      tx,
      paymentIntent.leadId,
      lead.referrerId,
      lead.referrerCode ?? "",
      "ADVERTISER_CAMPAIGN",
      commissionRef,
    );
    if (!claimed) return;

    await tx.commission.create({
      data: {
        driverId: lead.referrerId,
        amount: 500,
        sourceType: "ADVERTISER_SALE",
        reference: commissionRef,
        status: "PENDING",
        metadata: {
          leadId: paymentIntent.leadId,
          paymentIntentId: paymentIntent.id,
          amount,
        },
      },
    });

    await tx.lead.update({
      where: { id: paymentIntent.leadId },
      data: { status: "CONVERTED" },
    });

    this.logger.log(
      `Advertiser referral commission created for referrer ${lead.referrerId}`,
    );
  }

  /**
   * Reserve the unique lead attribution before creating its commission.
   * The reservation and the commission commit or roll back together.
   */
  private async claimReferralCommission(
    tx: Prisma.TransactionClient,
    leadId: string,
    referrerId: string,
    referrerCode: string,
    conversionType: "DRIVER_SUBSCRIPTION" | "ADVERTISER_CAMPAIGN",
    commissionRef: string,
  ): Promise<boolean> {
    await tx.referralAttribution.createMany({
      data: [{ leadId, referrerId, referrerCode }],
      skipDuplicates: true,
    });
    const claimed = await tx.referralAttribution.updateMany({
      where: { leadId, commissionCreated: false, commissionId: null },
      data: {
        conversionAt: new Date(),
        conversionType,
        commissionCreated: true,
        commissionId: commissionRef,
      },
    });
    if (claimed.count === 1) return true;

    const current = await tx.referralAttribution.findUnique({
      where: { leadId },
    });
    if (claimed.count === 0 && current?.commissionCreated) return false;
    throw new ConflictException("Referral attribution requires reconciliation");
  }

  /**
   * Lista evidencias pendientes de revisión (Admin)
   */
  async getPendingEvidence() {
    return this.prisma.paymentEvidence.findMany({
      where: { reviewStatus: { in: ["SUBMITTED", "UNDER_REVIEW"] } },
      include: {
        paymentIntent: {
          include: { lead: true },
        },
      },
      orderBy: { submittedAt: "asc" },
    });
  }

  /**
   * Obtiene evidencia por ID
   */
  async getEvidenceById(id: string) {
    return this.prisma.paymentEvidence.findUnique({
      where: { id },
      include: {
        paymentIntent: {
          include: {
            paymentVerification: true,
          },
        },
      },
    });
  }
}
