import {
  Injectable,
  BadRequestException,
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
   * Register payment evidence (receipt from WhatsApp or bank transfer)
   */
  async registerPaymentEvidence(dto: {
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
    const evidence = await this.prisma.paymentEvidence.create({
      data: {
        paymentIntentId: dto.paymentIntentId,
        fileUrl: dto.fileUrl,
        fileHash: dto.hash,
        fileSize: dto.fileSize ? BigInt(dto.fileSize) : undefined,
        mimeType: dto.mimeType,
        reviewStatus: "SUBMITTED",
        reviewedBy: dto.reviewerId,
        reviewNote: dto.reviewNotes,
        metadata: {
          type: dto.type,
          leadId: dto.leadId,
        },
      },
    });

    return evidence;
  }

  /**
   * Verify a payment (human review result)
   */
  async verifyPayment(
    paymentIntentId: string,
    status: "CONFIRMED" | "REJECTED" | "REFUNDED",
    reviewerNotes?: string,
    verificationMethod:
      "MANUAL_REVIEW" | "WEBHOOK" | "AUTOMATED" = "MANUAL_REVIEW",
  ) {
    const paymentIntent = await this.prisma.paymentIntent.findUnique({
      where: { id: paymentIntentId },
      include: {
        lead: true,
      },
    });

    if (!paymentIntent) {
      throw new NotFoundException(
        `PaymentIntent with id ${paymentIntentId} not found`,
      );
    }

    const intentStatus =
      status === "CONFIRMED"
        ? "PAID"
        : status === "REJECTED"
          ? "FAILED"
          : "REFUNDED";

    // Update payment intent status
    const updatedIntent = await this.prisma.paymentIntent.update({
      where: { id: paymentIntentId },
      data: {
        status: intentStatus,
        paidAt: status === "CONFIRMED" ? new Date() : undefined,
        updatedAt: new Date(),
      },
    });

    // Create payment verification record
    await this.prisma.paymentVerification.create({
      data: {
        paymentIntentId,
        verifiedBy: "ADMIN",
        status: intentStatus,
        note: reviewerNotes,
        metadata: { verificationMethod },
      },
    });

    // If confirmed, process accordingly
    if (status === "CONFIRMED" && paymentIntent.leadId) {
      if (paymentIntent.type === "DRIVER_SUBSCRIPTION") {
        await this.processDriverSubscriptionConfirmed(paymentIntent.leadId);
      } else if (paymentIntent.type === "ADVERTISER_CAMPAIGN") {
        await this.processAdvertiserCampaignConfirmed(paymentIntent.leadId);
      }
    }

    return { paymentIntent: updatedIntent, status };
  }

  /**
   * Process driver subscription confirmation
   */
  private async processDriverSubscriptionConfirmed(leadId: string) {
    // Update lead status
    const lead = await this.prisma.lead.update({
      where: { id: leadId },
      data: { status: "CONFIRMED" },
    });

    if (lead.referrerId) {
      const now = new Date();
      const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const ref = `COMM-DRV-${leadId}`;

      // Create commission ledger entry for driver referral
      await this.prisma.commissionLedger.create({
        data: {
          driverId: lead.referrerId,
          amount: 500.0,
          sourceType: "DRIVER_REFERRAL",
          reference: ref,
          status: "PENDING",
          period,
        },
      });
    }
  }

  /**
   * Process advertiser campaign confirmation
   */
  private async processAdvertiserCampaignConfirmed(leadId: string) {
    // Update lead status
    const lead = await this.prisma.lead.update({
      where: { id: leadId },
      data: { status: "CONFIRMED" },
    });

    const key = `CONV-ADV-${leadId}-${Date.now()}`;
    // Create conversion event
    await this.prisma.conversionEvent.create({
      data: {
        type: "CAMPAIGN_ACTIVATION",
        entityId: leadId,
        entityType: "LEAD",
        referrerId: lead.referrerId,
        referrerCode: lead.referrerCode,
        idempotencyKey: key,
      },
    });

    if (lead.referrerId) {
      const now = new Date();
      const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const ref = `COMM-ADV-${leadId}`;

      await this.prisma.commissionLedger.create({
        data: {
          driverId: lead.referrerId,
          amount: 500.0,
          sourceType: "ADVERTISER_REFERRAL",
          reference: ref,
          status: "PENDING",
          period,
        },
      });
    }
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
