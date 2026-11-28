import {
  Injectable,
  BadRequestException,
  ConflictException,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import * as crypto from "crypto";

@Injectable()
export class LeadService {
  private readonly logger = new Logger(LeadService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new lead from QR scan or WhatsApp contact.
   * type: "ADVERTISER" | "DRIVER"
   * source: "QR" | "WHATSAPP" | "MANUAL" | "OTHER"
   */
  async createLead(
    dto: {
      type: "ADVERTISER" | "DRIVER";
      source: "QR" | "WHATSAPP" | "MANUAL" | "OTHER";
      qrCode?: string;
      referentId?: string; // ID del conductor/anunciante referente
      referentType?: "DRIVER" | "ADVERTISER";
      channel?: "WHATSAPP" | "WEB" | "ADMIN_PANEL";
      contactName?: string;
      contactPhone?: string;
      contactEmail?: string;
      city?: string;
      consentGiven?: boolean;
    },
    ipAddress?: string,
    userAgent?: string,
  ) {
    this.logger.log(`Creating lead: type=${dto.type}, source=${dto.source}`);

    // Check for duplicate: same type + same phone/email + same referent
    const existingLead = await this.prisma.lead.findFirst({
      where: {
        type: dto.type,
        OR: [
          ...(dto.contactPhone ? [{ contactPhone: dto.contactPhone }] : []),
          ...(dto.contactEmail ? [{ contactEmail: dto.contactEmail }] : []),
        ],
        referrerId: dto.referentId,
      },
    });

    if (existingLead) {
      this.logger.warn(
        `Duplicate lead detected for type=${dto.type}, referent=${dto.referentId}`,
      );
      throw new BadRequestException(
        "Ya existe un lead registrado con estos datos",
      );
    }

    const lead = await this.prisma.lead.create({
      data: {
        type: dto.type,
        source: dto.source,
        referrerCode: dto.qrCode,
        referrerId: dto.referentId,
        contactName: dto.contactName,
        contactPhone: dto.contactPhone,
        contactEmail: dto.contactEmail,
        city: dto.city,
        metadata: {
          referentType: dto.referentType,
          channel: dto.channel,
          consentGiven: dto.consentGiven ?? false,
          ipAddress,
          userAgent,
        },
      },
    });

    // Create referral attribution if there's a referent
    if (dto.referentId) {
      await this.prisma.referralAttribution.create({
        data: {
          leadId: lead.id,
          referrerId: dto.referentId,
          referrerCode: dto.qrCode || "",
          metadata: {
            referentType: dto.referentType,
            consentGiven: dto.consentGiven ?? false,
          },
        },
      });
    }

    this.logger.log(`Lead created successfully: id=${lead.id}`);
    return { lead, status: "created" };
  }

  /**
   * Get lead by ID
   */
  async getLead(id: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      include: {
        referralAttribution: true,
        paymentIntents: true,
      },
    });

    if (!lead) {
      throw new NotFoundException(`Lead with id ${id} not found`);
    }

    return lead;
  }

  /**
   * Update lead status (SUBMITTED -> UNDER_REVIEW -> CONFIRMED/REJECTED)
   */
  async updateLeadStatus(
    id: string,
    status: "SUBMITTED" | "UNDER_REVIEW" | "CONFIRMED" | "REJECTED",
    _reviewerId?: string,
  ) {
    const lead = await this.prisma.lead.update({
      where: { id },
      data: { status, updatedAt: new Date() },
    });

    // If confirming a lead, create payment intent
    if (status === "CONFIRMED" && lead.type === "DRIVER") {
      await this.createDriverPaymentIntent(lead.id);
    }

    return lead;
  }

  /**
   * Create a PaymentIntent for a driver lead (RD$6,000 subscription)
   */
  private async createDriverPaymentIntent(leadId: string) {
    // Check if already has a payment intent
    const existingIntent = await this.prisma.paymentIntent.findFirst({
      where: { leadId },
    });

    if (existingIntent) {
      return existingIntent;
    }

    const ref = `PI-DRV-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
    const paymentIntent = await this.prisma.paymentIntent.create({
      data: {
        leadId,
        type: "DRIVER_SUBSCRIPTION",
        amount: 6000.0,
        currency: "DOP",
        status: "CREATED",
        reference: ref,
        idempotencyKey: ref,
      },
    });

    return paymentIntent;
  }

  /**
   * Create a PaymentIntent for an advertiser lead (campaign payment)
   */
  private async createAdvertiserPaymentIntent(leadId: string, amount: number) {
    const existingIntent = await this.prisma.paymentIntent.findFirst({
      where: { leadId },
    });

    if (existingIntent) {
      return existingIntent;
    }

    const ref = `PI-ADV-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
    const paymentIntent = await this.prisma.paymentIntent.create({
      data: {
        leadId,
        type: "ADVERTISER_CAMPAIGN",
        amount,
        currency: "DOP",
        status: "CREATED",
        reference: ref,
        idempotencyKey: ref,
      },
    });

    return paymentIntent;
  }

  /**
   * Legacy writer: keep the contract fail-closed until ledger reconciliation.
   * The canonical PaymentEvidenceService is the supported review path.
   */
  async registerPaymentEvidence(_dto: {
    paymentIntentId: string;
    leadId: string;
    type: "WHATSAPP_RECEIPT" | "BANK_TRANSFER" | "CARD_PAYMENT" | "OTHER";
    fileUrl: string;
    hash?: string;
    mimeType?: string;
    fileSize?: number;
    reviewerId?: string;
    reviewNotes?: string;
  }) {
    throw new ConflictException(
      "Legacy payment evidence disabled; use the canonical payment workflow",
    );
  }

  /**
   * Legacy verification cannot guarantee atomicity or consistent ledger state.
   */
  async verifyPayment(
    _paymentIntentId: string,
    _status: "CONFIRMED" | "REJECTED" | "REFUNDED",
    _reviewerNotes?: string,
    _verificationMethod:
      "MANUAL_REVIEW" | "WEBHOOK" | "AUTOMATED" = "MANUAL_REVIEW",
  ) {
    throw new ConflictException(
      "Legacy payment verification disabled; financial reconciliation required",
    );
  }

  /**
   * Get leads with filtering
   */
  async getLeads(filters: {
    type?: "ADVERTISER" | "DRIVER";
    status?: "SUBMITTED" | "UNDER_REVIEW" | "CONFIRMED" | "REJECTED";
    referentId?: string;
    search?: string;
  }) {
    const where: import("@prisma/client").Prisma.LeadWhereInput = {};

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.referentId) {
      where.referrerId = filters.referentId;
    }

    if (filters.search) {
      where.OR = [
        { contactName: { contains: filters.search, mode: "insensitive" } },
        { contactPhone: { contains: filters.search, mode: "insensitive" } },
        { contactEmail: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    return this.prisma.lead.findMany({
      where,
      include: {
        referralAttribution: true,
        paymentIntents: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }
}
