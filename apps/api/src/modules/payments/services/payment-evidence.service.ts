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
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { ConfigService } from "@nestjs/config";
import type { PaymentIntent, Prisma } from "@prisma/client";

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
   * Idempotente por paymentIntentId + fileHash
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
        return tx.paymentEvidence.update({
          where: { id: existing.id },
          data: {
            fileUrl: input.fileUrl,
            fileHash: input.fileHash,
            fileSize: input.fileSize,
            mimeType: input.mimeType,
            submittedBy: input.submittedBy,
            submittedAt: new Date(),
            reviewStatus: "SUBMITTED",
            metadata: input.metadata,
          },
        });
      }

      // Crear nueva evidencia
      const evidence = await tx.paymentEvidence.create({
        data: {
          paymentIntentId: input.paymentIntentId,
          fileUrl: input.fileUrl,
          fileHash: input.fileHash,
          fileSize: input.fileSize,
          mimeType: input.mimeType,
          submittedBy: input.submittedBy,
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
          payload: {
            paymentIntentId: input.paymentIntentId,
            fileUrl: input.fileUrl,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
            type: paymentIntent.type,
            leadId: paymentIntent.leadId,
          },
        },
      });

      // Actualizar PaymentIntent status a UNDER_REVIEW
      await tx.paymentIntent.update({
        where: { id: input.paymentIntentId },
        data: { status: "UNDER_REVIEW" },
      });

      this.logger.log(
        `Payment evidence ${evidence.id} submitted, HumanReviewTask created`,
      );
      return evidence;
    });

    return result;
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

    // Idempotente: si ya está confirmada o rechazada, solo devolvemos el
    // estado anterior; el flujo no se reejecuta.
    if (evidence.reviewStatus === "PAYMENT_CONFIRMED") {
      return evidence;
    }
    if (evidence.reviewStatus === "REJECTED") {
      return evidence;
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // Actualizar evidencia
      const updatedEvidence = await tx.paymentEvidence.update({
        where: { id: input.evidenceId },
        data: {
          reviewStatus: input.status,
          reviewedBy: input.reviewedBy,
          reviewedAt: new Date(),
          reviewNote: input.reviewNote,
        },
      });

      // Actualizar HumanReviewTask
      await tx.humanReviewTask.updateMany({
        where: {
          entityId: input.evidenceId,
          entityType: "PaymentEvidence",
          status: "PENDING",
        },
        data: {
          status: input.status === "PAYMENT_CONFIRMED" ? "APPROVED" : "REJECTED",
          reviewerId: input.reviewedBy,
          reviewedAt: new Date(),
          reviewNote: input.reviewNote,
        },
      });

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
    });

    return result;
  }

  /**
   * Confirma el pago tras revisión humana exitosa.
   * Es idempotente: si el intento ya estaba PAID no vuelve a crear la
   * verificación ni a re-actualizar el proceso de pago.
   * @internal
   */
  private async confirmPayment(
    tx: any,
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
        paymentIntent,
        confirmedAmount,
      );
    } else if (paymentIntent.type === "ADVERTISER_CAMPAIGN") {
      await this.handleAdvertiserCampaignConfirmed(
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
    const lead = await this.prisma.lead.findUnique({
      where: { id: paymentIntent.leadId },
    });

    if (!lead || !lead.referrerId) {
      this.logger.log(`No referrer for lead ${paymentIntent.leadId}`);
      return;
    }

    // Verificar si ya se creó comisión para este referido
    const existingAttribution =
      await this.prisma.referralAttribution.findUnique({
        where: { leadId: paymentIntent.leadId },
      });

    if (existingAttribution?.commissionCreated) {
      this.logger.log(
        `Commission already created for lead ${paymentIntent.leadId}`,
      );
      return;
    }

    // Crear comisión para el referente (RD$500)
    const commissionRef = `REF-DRIVER-${paymentIntent.leadId}-${Date.now()}`;

    await this.prisma.commission.create({
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

    // Actualizar ReferralAttribution
    if (existingAttribution) {
      await this.prisma.referralAttribution.update({
        where: { id: existingAttribution.id },
        data: {
          conversionAt: new Date(),
          conversionType: "DRIVER_SUBSCRIPTION",
          commissionCreated: true,
          commissionId: commissionRef,
        },
      });
    } else {
      await this.prisma.referralAttribution.create({
        data: {
          leadId: paymentIntent.leadId,
          referrerId: lead.referrerId ?? "",
          referrerCode: lead.referrerCode ?? "",
          conversionAt: new Date(),
          conversionType: "DRIVER_SUBSCRIPTION",
          commissionCreated: true,
          commissionId: commissionRef,
        },
      });
    }

    // Actualizar lead
    await this.prisma.lead.update({
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
    paymentIntent: PaymentIntent,
    amount: number,
  ) {
    this.logger.log(
      `Handling advertiser campaign confirmed for lead: ${paymentIntent.leadId}`,
    );

    if (!paymentIntent.leadId) return;

    const lead = await this.prisma.lead.findUnique({
      where: { id: paymentIntent.leadId },
    });

    if (!lead || !lead.referrerId) return;

    const existingAttribution =
      await this.prisma.referralAttribution.findUnique({
        where: { leadId: paymentIntent.leadId },
      });

    if (existingAttribution?.commissionCreated) return;

    // Crear comisión para referente (RD$500)
    const commissionRef = `REF-ADV-${paymentIntent.leadId}-${Date.now()}`;

    await this.prisma.commission.create({
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

    if (existingAttribution) {
      await this.prisma.referralAttribution.update({
        where: { id: existingAttribution.id },
        data: {
          conversionAt: new Date(),
          conversionType: "ADVERTISER_CAMPAIGN",
          commissionCreated: true,
          commissionId: commissionRef,
        },
      });
    } else {
      await this.prisma.referralAttribution.create({
        data: {
          leadId: paymentIntent.leadId,
          referrerId: lead.referrerId ?? "",
          referrerCode: lead.referrerCode ?? "",
          conversionAt: new Date(),
          conversionType: "ADVERTISER_CAMPAIGN",
          commissionCreated: true,
          commissionId: commissionRef,
        },
      });
    }

    await this.prisma.lead.update({
      where: { id: paymentIntent.leadId },
      data: { status: "CONVERTED" },
    });

    this.logger.log(
      `Advertiser referral commission created for referrer ${lead.referrerId}`,
    );
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
