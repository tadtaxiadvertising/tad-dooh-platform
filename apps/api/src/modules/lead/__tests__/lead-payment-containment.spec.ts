import { ConflictException } from "@nestjs/common";
import type { PrismaService } from "../../prisma/prisma.service";
import { LeadService } from "../lead.service";

describe("Legacy lead payment writer containment", () => {
  let service: LeadService;
  let access: jest.Mock;

  beforeEach(() => {
    access = jest.fn(() => {
      throw new Error("Unexpected database access");
    });
    const prisma = new Proxy({}, { get: access });
    service = new LeadService(prisma as PrismaService);
  });

  it("rejects legacy evidence registration without database access", async () => {
    await expect(
      service.registerPaymentEvidence({
        paymentIntentId: "fixture-intent",
        leadId: "fixture-lead",
        type: "BANK_TRANSFER",
        fileUrl: "https://fixture.invalid/receipt",
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(access).not.toHaveBeenCalled();
  });

  it.each(["CONFIRMED", "REJECTED", "REFUNDED"] as const)(
    "rejects legacy %s verification without database access",
    async (status) => {
      await expect(
        service.verifyPayment("fixture-intent", status),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(access).not.toHaveBeenCalled();
    },
  );
});
