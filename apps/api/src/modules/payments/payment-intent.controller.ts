import type { AuthenticatedRequest } from "../auth/auth.types";
/**
 * Payment Intent Controller — REST endpoints para el flujo de pagos Fase 7
 *
 * Flujo (Plan Maestro TAD v1 — Fase 7):
 * 1. POST /payments/intents                → crea intención vía provider (MANUAL_TRANSFER por defecto)
 * 2. GET  /payments/intents/reference/:ref → consulta por referencia pública
 * 3. POST /payments/intents/:id/evidence    → sube comprobante (PaymentEvidence + HumanReviewTask)
 * 4. GET  /payments/evidence/pending        → cola de revisión humana (ADMIN)
 * 5. GET  /payments/evidence/:id            → detalle de evidencia (ADMIN)
 * 6. POST /payments/evidence/:id/review     → aprueba/rechaza comprobante (ADMIN)
 * 7. GET  /payments/health                  → estado del provider activo
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Req,
  UseInterceptors,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Inject,
} from "@nestjs/common";
import { z } from "zod";
import { PrismaService } from "../prisma/prisma.service";
import { PaymentEvidenceService } from "./services/payment-evidence.service";
import type {
  IPaymentProvider,
  PaymentProviderFactory,
} from "./interfaces/payment-provider.interface";
import {
  PAYMENT_PROVIDER_FACTORY,
  CURRENT_PAYMENT_PROVIDER,
} from "./payment-provider.tokens";
import { IdempotencyInterceptor } from "../../common/interceptors/idempotency.interceptor";
import { Roles, UserRole } from "../auth/decorators/roles.decorator";

// ─── Validación Zod ────────────────────────────────────────────────

const CreateIntentSchema = z.object({
  type: z.enum(["DRIVER_SUBSCRIPTION", "ADVERTISER_CAMPAIGN"]),
  amount: z
    .number()
    .int("El monto debe ser en centavos (entero)")
    .positive("El monto debe ser positivo")
    .max(100_000_000, "Monto fuera de rango"),
  currency: z.string().length(3).default("DOP"),
  reference: z
    .string()
    .min(6, "Referencia demasiado corta")
    .max(64, "Referencia demasiado larga")
    .regex(
      /^[A-Za-z0-9._-]+$/,
      "Referencia inválida (solo letras, números, . _ -)",
    ),
  leadId: z.string().uuid().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  customerInfo: z
    .object({
      name: z.string().min(2).optional(),
      email: z.string().email().optional(),
      phone: z.string().min(7).optional(),
      document: z.string().optional(),
    })
    .optional(),
});

const SubmitEvidenceSchema = z.object({
  fileUrl: z.string().url("fileUrl debe ser una URL válida"),
  fileHash: z.string().optional(),
  fileSize: z.number().int().nonnegative().optional(),
  mimeType: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

const ReviewEvidenceSchema = z.object({
  status: z.enum(["PAYMENT_CONFIRMED", "REJECTED"]),
  reviewNote: z.string().max(1000).optional(),
  amountConfirmed: z.number().positive().optional(),
});

// ─── Controller ────────────────────────────────────────────────────

@Controller("payments")
export class PaymentIntentController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly evidenceService: PaymentEvidenceService,
    @Inject(PAYMENT_PROVIDER_FACTORY)
    private readonly providerFactory: PaymentProviderFactory,
    @Inject(CURRENT_PAYMENT_PROVIDER)
    private readonly currentProvider: IPaymentProvider,
  ) {}

  /**
   * POST /payments/intents
   * Crea una PaymentIntent vía el provider configurado.
   * Idempotente por reference: si ya existe, retorna el intent existente sin duplicar.
   */
  @Post("intents")
  @UseInterceptors(IdempotencyInterceptor)
  async createIntent(
    @Req() req: AuthenticatedRequest,
    @Body() payload: unknown,
  ) {
    const parsed = CreateIntentSchema.safeParse(payload);
    if (!parsed.success) {
      throw new BadRequestException({
        code: "VALIDATION_ERROR",
        message: parsed.error.issues.map((e) => e.message).join(", "),
      });
    }
    const input = parsed.data;

    // Idempotencia por reference único (schema-level @unique)
    const existing = await this.prisma.paymentIntent.findUnique({
      where: { reference: input.reference },
    });
    if (existing) {
      // Replay limitado al mismo DTO de salida del alta (sin proveedorData ni metadatos).
      // El owner solicitante puede reutilizar la intención; nadie más puede leer su estado.
      if (existing.leadId) {
        const lead = await this.prisma.lead.findUnique({
          where: { id: existing.leadId },
        });
        const sameEntity =
          req.user?.role === "ADMIN" || (lead?.type === req.user?.role);
        if (!sameEntity) {
          throw new ForbiddenException(
            "No puedes reutilizar una intención de pago que no te pertenece.",
          );
        }
      }
      return {
        id: existing.id,
        type: existing.type,
        amount: existing.amount,
        currency: existing.currency,
        reference: existing.reference,
        status: existing.status,
        createdAt: existing.createdAt,
        paidAt: existing.paidAt,
        leadId: existing.leadId,
        idempotencyReplay: true,
      };
    }

    // Si viene leadId, verificar que existe
    if (input.leadId) {
      const lead = await this.prisma.lead.findUnique({
        where: { id: input.leadId },
      });
      if (!lead) {
        throw new NotFoundException(`Lead ${input.leadId} not found`);
      }
    }

    // idempotencyKey interna — única por intent
    const idempotencyKey = `${input.reference}-${Date.now()}`;

    // Crear vía provider activo
    const providerResult = await this.currentProvider.createPaymentIntent({
      type: input.type,
      amount: input.amount,
      currency: input.currency,
      reference: input.reference,
      idempotencyKey,
      leadId: input.leadId,
      metadata: input.metadata,
      customerInfo: input.customerInfo,
    });

    // Persistir PaymentIntent
    const intent = await this.prisma.paymentIntent.create({
      data: {
        type: input.type,
        amount: input.amount,
        currency: input.currency,
        provider: this.currentProvider.providerType,
        reference: input.reference,
        idempotencyKey,
        status: providerResult.status,
        providerRef: providerResult.id,
        providerData: {
          instructions: providerResult.paymentInstructions,
          expiresAt: providerResult.expiresAt,
          ...providerResult.providerData,
        },
        leadId: input.leadId,
        metadata: {
          ...input.metadata,
          customerInfo: input.customerInfo,
        },
      },
    });

    return {
      id: intent.id,
      type: intent.type,
      amount: intent.amount,
      currency: intent.currency,
      reference: intent.reference,
      status: intent.status,
      expiresAt: providerResult.expiresAt,
      paymentInstructions: providerResult.paymentInstructions,
    };
  }

  /**
   * GET /payments/intents/reference/:reference
   * Consulta por referencia pública (la que el usuario coloca en la transferencia).
   * No expone datos sensibles — solo estado y montos.
   */
  @Get("intents/reference/:reference")
  async getIntentByReference(@Param("reference") reference: string) {
    const intent = await this.prisma.paymentIntent.findUnique({
      where: { reference },
      select: {
        id: true,
        type: true,
        amount: true,
        currency: true,
        status: true,
        reference: true,
        createdAt: true,
        paidAt: true,
        leadId: true,
        paymentEvidence: {
          select: { id: true, reviewStatus: true, submittedAt: true },
        },
      },
    });
    if (!intent) {
      throw new NotFoundException(
        `PaymentIntent con reference ${reference} no encontrada`,
      );
    }
    return intent;
  }

  /**
   * POST /payments/intents/:id/evidence
   * Sube el comprobante de pago (URL de archivo ya subido a Storage).
   * Crea PaymentEvidence + HumanReviewTask y marca el intent UNDER_REVIEW.
   * Idempotente a nivel service (un solo evidence pendiente por intent).
   */
  @Post("intents/:id/evidence")
  @UseInterceptors(IdempotencyInterceptor)
  async submitEvidence(
    @Param("id") intentId: string,
    @Req() req: AuthenticatedRequest,
    @Body() payload: unknown,
  ) {
    const parsed = SubmitEvidenceSchema.safeParse(payload);
    if (!parsed.success) {
      throw new BadRequestException({
        code: "VALIDATION_ERROR",
        message: parsed.error.issues.map((e) => e.message).join(", "),
      });
    }

    const intent = await this.prisma.paymentIntent.findUnique({
      where: { id: intentId },
    });
    if (!intent) {
      throw new NotFoundException(`PaymentIntent ${intentId} not found`);
    }
    if (["PAID", "REJECTED", "REFUNDED"].includes(intent.status)) {
      throw new BadRequestException(
        `No se puede adjuntar evidencia a un intent en estado ${intent.status}`,
      );
    }

    const submittedBy = req?.user?.id ?? req?.user?.sub ?? "anonymous";

    // F2: la evidencia solo puede adjuntarse a una intención propia del actor.
    // El vínculo es el lead de la intención: su tipo (ADVERTISER/DRIVER) debe
    // coincidir con el rol del usuario autenticado. Los ADMIN pueden actuar
    // sobre cualquier intención porque son el propietario de la auditoría.
    const intentLead = intent.leadId
      ? await this.prisma.lead.findUnique({ where: { id: intent.leadId } })
      : null;
    const ownedByActor =
      req.user?.role === "ADMIN" || (intentLead?.type === req.user?.role);
    if (!ownedByActor) {
      throw new ForbiddenException(
        "No tienes permiso para adjuntar evidencia a esta intención de pago.",
      );
    }

    return this.evidenceService.submitEvidence({
      paymentIntentId: intentId,
      fileUrl: parsed.data.fileUrl,
      fileHash: parsed.data.fileHash,
      fileSize: parsed.data.fileSize,
      mimeType: parsed.data.mimeType,
      submittedBy,
      metadata: parsed.data.metadata,
    });
  }

  /**
   * GET /payments/evidence/pending
   * Cola de comprobantes pendientes de revisión humana. SOLO ADMIN.
   */
  @Get("evidence/pending")
  @Roles(UserRole.ADMIN)
  async getPendingEvidence() {
    return this.evidenceService.getPendingEvidence();
  }

  /**
   * GET /payments/evidence/:id
   * Detalle completo de una evidencia. SOLO ADMIN.
   */
  @Get("evidence/:id")
  @Roles(UserRole.ADMIN)
  async getEvidence(@Param("id") id: string) {
    const evidence = await this.evidenceService.getEvidenceById(id);
    if (!evidence) {
      throw new NotFoundException(`PaymentEvidence ${id} not found`);
    }
    return evidence;
  }

  /**
   * POST /payments/evidence/:id/review
   * Revisión humana: aprueba o rechaza el comprobante. SOLO ADMIN.
   * Si aprueba → PaymentVerification + commission flow + intent PAID.
   */
  @Post("evidence/:id/review")
  @Roles(UserRole.ADMIN)
  @UseInterceptors(IdempotencyInterceptor)
  async reviewEvidence(
    @Param("id") evidenceId: string,
    @Req() req: AuthenticatedRequest,
    @Body() payload: unknown,
  ) {
    const parsed = ReviewEvidenceSchema.safeParse(payload);
    if (!parsed.success) {
      throw new BadRequestException({
        code: "VALIDATION_ERROR",
        message: parsed.error.issues.map((e) => e.message).join(", "),
      });
    }

    const reviewedBy = req?.user?.id ?? req?.user?.sub;
    if (!reviewedBy) {
      throw new BadRequestException(
        "No se pudo identificar al revisor desde el JWT",
      );
    }

    return this.evidenceService.reviewEvidence({
      evidenceId,
      reviewedBy,
      status: parsed.data.status,
      reviewNote: parsed.data.reviewNote,
      amountConfirmed: parsed.data.amountConfirmed,
    });
  }

  /**
   * GET /payments/health
   * Estado del provider de pagos activo (para dashboards de monitoreo).
   */
  @Get("health")
  @Roles(UserRole.ADMIN)
  async health() {
    const health = await this.currentProvider.healthCheck();
    return {
      provider: this.currentProvider.providerType,
      healthy: health.healthy,
      latencyMs: health.latencyMs ?? null,
      error: health.error ?? null,
    };
  }
}
