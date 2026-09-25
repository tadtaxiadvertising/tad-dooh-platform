import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { BUSINESS_RULES } from "../../common/constants/business-rules";
import {
  CloseCommissionBatchDto,
  ConfirmPaymentEvidenceDto,
  CreateReferralConversionDto,
  ReversePaymentEvidenceDto,
  SubmitPaymentEvidenceDto,
} from "./referral-payment.dto";

@Injectable()
export class ReferralService {
  constructor(private readonly prisma: PrismaService) {}

  async generate(driverId: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
      select: { referralCode: true },
    });

    if (!driver) throw new NotFoundException("Driver not found");

    const code = driver.referralCode;
    const url = `https://tad-advertiser.rewvid.easypanel.host/register?ref=${code}`;

    return {
      driverId,
      referralCode: code,
      url,
      qrPayload: url,
    };
  }

  async getStats() {
    const topRecruiters = await this.prisma.driver.findMany({
      where: { referrals: { some: {} } },
      select: {
        id: true,
        fullName: true,
        referralCode: true,
        _count: {
          select: { referrals: true },
        },
      },
      orderBy: { referrals: { _count: "desc" } },
      take: 10,
    });

    const totalReferrals = await this.prisma.driver.count({
      where: { referredBy: { not: null } },
    });

    const pendingCommissions = await this.prisma.commission.aggregate({
      where: { status: "PENDING", sourceType: "DRIVER_REFERRAL" },
      _sum: { amount: true },
    });

    return {
      topRecruiters,
      totalReferrals,
      pendingCommissions: pendingCommissions._sum.amount || 0,
    };
  }

  async getNetwork() {
    return this.prisma.driver.findMany({
      where: { referredBy: { not: null } },
      select: {
        id: true,
        fullName: true,
        referredBy: true,
        createdAt: true,
        status: true,
        referredByDriver: {
          select: {
            fullName: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async createConversion(dto: CreateReferralConversionDto) {
    const referrer = await this.prisma.driver.findFirst({
      where: { id: dto.referrerDriverId, referralCode: dto.referralCode },
      select: { id: true },
    });
    if (!referrer) {
      throw new BadRequestException("El código de referido no pertenece al referente indicado");
    }
    if (dto.conversionType === "DRIVER" && !dto.referredDriverId) {
      throw new BadRequestException("El referido de conductor requiere el conductor referido");
    }
    if (dto.conversionType === "ADVERTISER" && !dto.referredAdvertiserId) {
      throw new BadRequestException("El referido de anunciante requiere el anunciante referido");
    }
    if (dto.conversionType === "DRIVER" && dto.referredDriverId === dto.referrerDriverId) {
      throw new BadRequestException("Un conductor no puede referirse a sí mismo");
    }
    const existing = await this.prisma.referralConversion.findFirst({
      where:
        dto.conversionType === "DRIVER"
          ? { referredDriverId: dto.referredDriverId }
          : { referredAdvertiserId: dto.referredAdvertiserId },
      select: { id: true },
    });
    if (existing) {
      throw new BadRequestException("Este referido ya tiene una conversión registrada");
    }

    return this.prisma.referralConversion.create({
      data: {
        referralCode: dto.referralCode,
        conversionType: dto.conversionType,
        referrerDriverId: dto.referrerDriverId,
        referredDriverId: dto.referredDriverId,
        referredAdvertiserId: dto.referredAdvertiserId,
      },
    });
  }

  async submitPaymentEvidence(dto: SubmitPaymentEvidenceDto) {
    const conversion = await this.prisma.referralConversion.findUnique({
      where: { id: dto.referralConversionId },
    });
    if (!conversion) throw new NotFoundException("Conversión referida no encontrada");
    if (conversion.paymentEvidenceId) {
      throw new BadRequestException("La conversión ya tiene un comprobante asociado");
    }

    const paymentType =
      conversion.conversionType === "DRIVER" ? "DRIVER_SUBSCRIPTION" : "ADVERTISER_CAMPAIGN";
    return this.prisma.$transaction(async (tx) => {
      const evidence = await tx.paymentEvidence.create({
        data: {
          paymentType,
          amount: dto.amount,
          currency: dto.currency ?? "DOP",
          receiptUrl: dto.receiptUrl,
          externalReference: dto.externalReference,
          submittedBy: dto.submittedBy,
          status: "SUBMITTED",
        },
      });
      await tx.paymentEvidenceReview.create({
        data: {
          paymentEvidenceId: evidence.id,
          action: "SUBMITTED",
          actor: dto.submittedBy,
        },
      });
      await tx.referralConversion.update({
        where: { id: conversion.id },
        data: { paymentEvidenceId: evidence.id, status: "PENDING_PAYMENT" },
      });
      return evidence;
    });
  }

  async confirmPaymentEvidence(id: string, dto: ConfirmPaymentEvidenceDto) {
    return this.prisma.$transaction(async (tx) => {
      const evidence = await tx.paymentEvidence.findUnique({
        where: { id },
        include: { referralConversion: true },
      });
      if (!evidence || !evidence.referralConversion) {
        throw new NotFoundException("Comprobante o conversión referida no encontrada");
      }
      if (evidence.status === "CONFIRMED") return evidence;
      if (evidence.status !== "SUBMITTED" && evidence.status !== "UNDER_REVIEW") {
        throw new BadRequestException(`El comprobante está en estado ${evidence.status}`);
      }

      const conversion = evidence.referralConversion;
      if (
        conversion.conversionType === "DRIVER" &&
        evidence.amount !== BUSINESS_RULES.STARTER_KIT_ANNUAL_FEE_RD
      ) {
        throw new BadRequestException(
          `La suscripción del conductor debe ser de RD$${BUSINESS_RULES.STARTER_KIT_ANNUAL_FEE_RD}`,
        );
      }

      const confirmedAt = new Date();
      await tx.paymentEvidence.update({
        where: { id },
        data: {
          status: "CONFIRMED",
          confirmedAt,
          reviewedBy: dto.reviewedBy,
          reviewNote: dto.reviewNote,
        },
      });
      await tx.paymentEvidenceReview.create({
        data: {
          paymentEvidenceId: id,
          action: "CONFIRMED",
          actor: dto.reviewedBy,
          note: dto.reviewNote,
        },
      });
      await tx.referralConversion.update({
        where: { id: conversion.id },
        data: { status: "PAYMENT_CONFIRMED" },
      });

      const existingCommission = await tx.commission.findUnique({
        where: { referralConversionId: conversion.id },
      });
      if (!existingCommission) {
        await tx.commission.create({
          data: {
            driverId: conversion.referrerDriverId,
            amount:
              conversion.conversionType === "DRIVER"
                ? BUSINESS_RULES.DRIVER_REFERRAL_BONUS_RD
                : BUSINESS_RULES.ADVERTISER_REFERRAL_BONUS_RD,
            sourceType:
              conversion.conversionType === "DRIVER"
                ? "DRIVER_REFERRAL"
                : "ADVERTISER_SALE",
            status: "PENDING",
            referralConversionId: conversion.id,
          },
        });
      }

      await tx.referralConversion.update({
        where: { id: conversion.id },
        data: { status: "COMMISSION_CREATED" },
      });

      return tx.paymentEvidence.findUnique({
        where: { id },
        include: { referralConversion: { include: { commission: true } } },
      });
    });
  }

  async rejectPaymentEvidence(id: string, dto: ConfirmPaymentEvidenceDto) {
    return this.prisma.$transaction(async (tx) => {
      const evidence = await tx.paymentEvidence.findUnique({
        where: { id },
        include: { referralConversion: true },
      });
      if (!evidence || !evidence.referralConversion) {
        throw new NotFoundException("Comprobante o conversión referida no encontrada");
      }
      if (evidence.status === "CONFIRMED" || evidence.status === "REFUNDED") {
        throw new BadRequestException("Un pago confirmado no puede rechazarse; use reversión");
      }
      const rejected = await tx.paymentEvidence.update({
        where: { id },
        data: { status: "REJECTED", reviewedBy: dto.reviewedBy, reviewNote: dto.reviewNote },
      });
      await tx.paymentEvidenceReview.create({
        data: { paymentEvidenceId: id, action: "REJECTED", actor: dto.reviewedBy, note: dto.reviewNote },
      });
      await tx.referralConversion.update({
        where: { id: evidence.referralConversion.id },
        data: { status: "PENDING_PAYMENT" },
      });
      return rejected;
    });
  }

  async reversePaymentEvidence(id: string, dto: ReversePaymentEvidenceDto) {
    return this.prisma.$transaction(async (tx) => {
      const evidence = await tx.paymentEvidence.findUnique({
        where: { id },
        include: { referralConversion: { include: { commission: true } } },
      });
      if (!evidence || !evidence.referralConversion) {
        throw new NotFoundException("Comprobante o conversión referida no encontrada");
      }
      if (evidence.status !== "CONFIRMED") {
        throw new BadRequestException("Solo un pago confirmado puede revertirse");
      }
      const reversed = await tx.paymentEvidence.update({
        where: { id },
        data: { status: "REFUNDED", reviewedBy: dto.reviewedBy, reviewNote: dto.reviewNote },
      });
      await tx.paymentEvidenceReview.create({
        data: { paymentEvidenceId: id, action: "REFUNDED", actor: dto.reviewedBy, note: dto.reviewNote },
      });
      if (evidence.referralConversion.commission) {
        await tx.commission.update({
          where: { id: evidence.referralConversion.commission.id },
          data: { status: "REVERSED" },
        });
      }
      await tx.referralConversion.update({
        where: { id: evidence.referralConversion.id },
        data: { status: "REVERSED" },
      });
      return reversed;
    });
  }

  async closeCommissionBatch(dto: CloseCommissionBatchDto) {
    const cutoff = new Date(dto.cutoffDate);
    if (Number.isNaN(cutoff.getTime()) || cutoff.getDate() !== 27) {
      throw new BadRequestException("El cierre de comisiones solo puede ejecutarse con fecha día 27");
    }
    cutoff.setHours(23, 59, 59, 999);
    const periodEnd = new Date(cutoff);
    const periodStart = new Date(cutoff.getFullYear(), cutoff.getMonth() - 1, 28);
    periodStart.setHours(0, 0, 0, 0);
    const payoutDate = new Date(cutoff.getFullYear(), cutoff.getMonth() + 1, 5);
    payoutDate.setHours(0, 0, 0, 0);
    const periodKey = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, "0")}`;

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.commissionPayoutBatch.findUnique({
        where: { periodKey },
        include: { commissions: true },
      });
      if (existing) return existing;

      const commissions = await tx.commission.findMany({
        where: {
          status: "PENDING",
          payoutBatchId: null,
          createdAt: { gte: periodStart, lte: periodEnd },
        },
        select: { id: true, amount: true },
      });
      const totalAmount = commissions.reduce((total, item) => total + item.amount, 0);
      const batch = await tx.commissionPayoutBatch.create({
        data: {
          periodKey,
          periodStart,
          periodEnd,
          payoutDate,
          status: "DRAFT",
          totalAmount,
        },
      });
      if (commissions.length > 0) {
        await tx.commission.updateMany({
          where: { id: { in: commissions.map((item) => item.id) }, payoutBatchId: null },
          data: { payoutBatchId: batch.id },
        });
      }
      return tx.commissionPayoutBatch.findUnique({
        where: { id: batch.id },
        include: { commissions: true },
      });
    });
  }
}
