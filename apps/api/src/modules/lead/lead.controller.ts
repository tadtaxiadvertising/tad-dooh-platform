import type { AuthenticatedRequest } from "../auth/auth.types";
import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  Request,
  ValidationPipe,
} from "@nestjs/common";
import { LeadService } from "./lead.service";
import { Roles, UserRole } from "../auth/decorators/roles.decorator";
import { z } from "zod";

// DTOs para crear lead
const CreateLeadDto = z.object({
  type: z.enum(["ADVERTISER", "DRIVER"]),
  source: z.enum(["QR", "WHATSAPP", "MANUAL", "OTHER"]),
  qrCode: z.string().optional(),
  referentId: z.string().optional(),
  referentType: z.enum(["DRIVER", "ADVERTISER"]).optional(),
  channel: z.enum(["WHATSAPP", "WEB", "ADMIN_PANEL"]).optional(),
  contactName: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().optional(),
  city: z.string().optional(),
  consentGiven: z.boolean().optional(),
});

const UpdateLeadStatusDto = z.object({
  status: z.enum(["SUBMITTED", "UNDER_REVIEW", "CONFIRMED", "REJECTED"]),
});

const RegisterEvidenceDto = z.object({
  paymentIntentId: z.string(),
  leadId: z.string(),
  type: z.enum(["WHATSAPP_RECEIPT", "BANK_TRANSFER", "CARD_PAYMENT", "OTHER"]),
  fileUrl: z.string(),
  hash: z.string().optional(),
  mimeType: z.string().optional(),
  fileSize: z.number().optional(),
  reviewerId: z.string().optional(),
  reviewNotes: z.string().optional(),
});

const VerifyPaymentDto = z.object({
  paymentIntentId: z.string(),
  status: z.enum(["CONFIRMED", "REJECTED", "REFUNDED"]),
  reviewerNotes: z.string().optional(),
});

@Controller("lead")
export class LeadController {
  constructor(private readonly leadService: LeadService) {}

  /**
   * Create a new lead from QR scan or WhatsApp contact.
   * POST /lead
   */
  @Post()
  async createLead(
    @Body(new ValidationPipe()) dto: z.infer<typeof CreateLeadDto>,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.leadService.createLead(
      {
        type: dto.type,
        source: dto.source,
        qrCode: dto.qrCode,
        referentId: dto.referentId,
        referentType: dto.referentType,
        channel: dto.channel,
        contactName: dto.contactName,
        contactPhone: dto.contactPhone,
        contactEmail: dto.contactEmail,
        city: dto.city,
        consentGiven: dto.consentGiven,
      },
      req.ip,
      req.get("User-Agent"),
    );
  }

  /**
   * Get lead by ID
   * GET /lead/:id
   */
  @Get(":id")
  @Roles(UserRole.ADMIN)
  async getLead(@Param("id") id: string) {
    return this.leadService.getLead(id);
  }

  /**
   * Update lead status
   * PATCH /lead/:id/status
   */
  @Patch(":id/status")
  @Roles(UserRole.ADMIN)
  async updateLeadStatus(
    @Param("id") id: string,
    @Body(new ValidationPipe()) dto: z.infer<typeof UpdateLeadStatusDto>,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.leadService.updateLeadStatus(
      id,
      dto.status,
      req.user?.entityId,
    );
  }

  /**
   * Register payment evidence
   * POST /lead/evidence
   */
  @Post("evidence")
  @Roles(UserRole.ADMIN)
  async registerPaymentEvidence(
    @Body(new ValidationPipe()) dto: z.infer<typeof RegisterEvidenceDto>,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.leadService.registerPaymentEvidence({
      paymentIntentId: dto.paymentIntentId,
      leadId: dto.leadId,
      type: dto.type,
      fileUrl: dto.fileUrl,
      hash: dto.hash,
      mimeType: dto.mimeType,
      fileSize: dto.fileSize,
      reviewerId: req.user?.entityId || dto.reviewerId,
      reviewNotes: dto.reviewNotes,
    });
  }

  /**
   * Verify payment (human review)
   * POST /lead/verify
   */
  @Post("verify")
  @Roles(UserRole.ADMIN)
  async verifyPayment(
    @Body(new ValidationPipe()) dto: z.infer<typeof VerifyPaymentDto>,
    @Request() _req: AuthenticatedRequest,
  ) {
    return this.leadService.verifyPayment(
      dto.paymentIntentId,
      dto.status,
      dto.reviewerNotes,
    );
  }

  /**
   * Get leads with filtering
   * GET /lead?type=DRIVER&status=CONFIRMED&referentId=xxx
   */
  @Get()
  @Roles(UserRole.ADMIN)
  async getLeads(
    @Query()
    filters: {
      type?: "ADVERTISER" | "DRIVER";
      status?: "SUBMITTED" | "UNDER_REVIEW" | "CONFIRMED" | "REJECTED";
      referentId?: string;
      search?: string;
    },
  ) {
    return this.leadService.getLeads(filters);
  }
}
