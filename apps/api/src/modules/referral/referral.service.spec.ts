import { BadRequestException } from "@nestjs/common";
import { describe, expect, it, jest } from "@jest/globals";
import { ReferralService } from "./referral.service";

const conversion = {
  id: "conversion-1",
  referralCode: "ref-code",
  conversionType: "DRIVER",
  referrerDriverId: "referrer-1",
  referredDriverId: "driver-2",
  referredAdvertiserId: null,
  paymentEvidenceId: "evidence-1",
  status: "PENDING_PAYMENT",
};

function makePrisma(): any {
  return {
    driver: { findFirst: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), count: jest.fn() },
    referralConversion: { findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    paymentEvidence: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    paymentEvidenceReview: { create: jest.fn() },
    commission: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), findMany: jest.fn(), updateMany: jest.fn() },
    commissionPayoutBatch: { findUnique: jest.fn(), create: jest.fn() },
    $transaction: jest.fn(async (callback: (tx: any) => unknown) => callback((makePrisma() as any))),
  };
}

describe("ReferralService — reglas financieras de Fase 1", () => {
  it("rechaza el autorreferido antes de persistirlo", async () => {
    const prisma = makePrisma();
    prisma.driver.findFirst.mockResolvedValue({ id: "driver-1" });
    const service = new ReferralService(prisma as any);

    await expect(
      service.createConversion({
        referralCode: "ref-code",
        conversionType: "DRIVER",
        referrerDriverId: "driver-1",
        referredDriverId: "driver-1",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.referralConversion.create).not.toHaveBeenCalled();
  });

  it("rechaza un segundo evento para el mismo conductor referido", async () => {
    const prisma = makePrisma();
    prisma.driver.findFirst.mockResolvedValue({ id: "referrer-1" });
    prisma.referralConversion.findFirst.mockResolvedValue({ id: "existing" });
    const service = new ReferralService(prisma as any);

    await expect(
      service.createConversion({
        referralCode: "ref-code",
        conversionType: "DRIVER",
        referrerDriverId: "referrer-1",
        referredDriverId: "driver-2",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.referralConversion.create).not.toHaveBeenCalled();
  });

  it("solo genera RD$500 una vez después de la confirmación humana del RD$6,000", async () => {
    const prisma = makePrisma();
    const tx = makePrisma();
    prisma.$transaction.mockImplementation(async (callback: (inner: any) => unknown) => callback(tx));
    tx.paymentEvidence.findUnique
      .mockResolvedValueOnce({ ...{ id: "evidence-1", status: "SUBMITTED", amount: 6000 }, referralConversion: conversion })
      .mockResolvedValueOnce({ id: "evidence-1", status: "CONFIRMED", referralConversion: conversion });
    tx.commission.findUnique.mockResolvedValue(null);
    tx.paymentEvidence.update.mockResolvedValue({ id: "evidence-1", status: "CONFIRMED" });
    tx.paymentEvidence.findUnique.mockResolvedValueOnce({ id: "evidence-1", status: "CONFIRMED", referralConversion: conversion });
    const service = new ReferralService(prisma as any);

    await service.confirmPaymentEvidence("evidence-1", { reviewedBy: "admin-1", reviewNote: "Visto en banco" });
    await service.confirmPaymentEvidence("evidence-1", { reviewedBy: "admin-1" });

    expect(tx.commission.create).toHaveBeenCalledTimes(1);
    expect(tx.commission.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ amount: 500, sourceType: "DRIVER_REFERRAL", driverId: "referrer-1" }),
    }));
  });

  it("no confirma la comisión del conductor si el importe no es RD$6,000", async () => {
    const prisma = makePrisma();
    const tx = makePrisma();
    prisma.$transaction.mockImplementation(async (callback: (inner: any) => unknown) => callback(tx));
    tx.paymentEvidence.findUnique.mockResolvedValue({ id: "evidence-1", status: "SUBMITTED", amount: 5000, referralConversion: conversion });
    const service = new ReferralService(prisma as any);

    await expect(service.confirmPaymentEvidence("evidence-1", {})).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.paymentEvidence.update).not.toHaveBeenCalled();
    expect(tx.commission.create).not.toHaveBeenCalled();
  });

  it("genera RD$500 una sola vez al confirmar el primer contrato del anunciante", async () => {
    const prisma = makePrisma();
    const tx = makePrisma();
    const advertiserConversion = {
      ...conversion,
      id: "advertiser-conversion-1",
      conversionType: "ADVERTISER",
      referredDriverId: null,
      referredAdvertiserId: "advertiser-1",
    };
    prisma.$transaction.mockImplementation(async (callback: (inner: any) => unknown) => callback(tx));
    tx.paymentEvidence.findUnique
      .mockResolvedValueOnce({ id: "evidence-advertiser", status: "SUBMITTED", amount: 1500, referralConversion: advertiserConversion })
      .mockResolvedValueOnce({ id: "evidence-advertiser", status: "CONFIRMED", referralConversion: advertiserConversion });
    tx.commission.findUnique.mockResolvedValue(null);
    const service = new ReferralService(prisma as any);

    await service.confirmPaymentEvidence("evidence-advertiser", { reviewedBy: "admin-1" });

    expect(tx.commission.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ amount: 500, sourceType: "ADVERTISER_SALE" }),
    }));
  });

  it("revierte la comisión cuando un pago confirmado pasa a REFUNDED", async () => {
    const prisma = makePrisma();
    const tx = makePrisma();
    prisma.$transaction.mockImplementation(async (callback: (inner: any) => unknown) => callback(tx));
    tx.paymentEvidence.findUnique.mockResolvedValue({
      id: "evidence-1",
      status: "CONFIRMED",
      referralConversion: { ...conversion, commission: { id: "commission-1", status: "PENDING" } },
    });
    tx.paymentEvidence.update.mockResolvedValue({ id: "evidence-1", status: "REFUNDED" });
    const service = new ReferralService(prisma as any);

    await service.reversePaymentEvidence("evidence-1", { reviewedBy: "admin-1", reviewNote: "Reembolso verificado" });

    expect(tx.commission.update).toHaveBeenCalledWith({
      where: { id: "commission-1" },
      data: { status: "REVERSED" },
    });
  });

  it("solo permite cerrar el lote con corte el día 27", async () => {
    const prisma = makePrisma();
    const service = new ReferralService(prisma as any);

    await expect(service.closeCommissionBatch({ cutoffDate: "2026-09-26T12:00:00.000Z" }))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
