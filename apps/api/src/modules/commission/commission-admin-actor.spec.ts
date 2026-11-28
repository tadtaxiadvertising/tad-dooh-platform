import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from "@nestjs/common";
import { CommissionController } from "./commission.controller";
import type { CommissionService } from "./commission.service";
import type { AuthUser } from "../auth/auth.types";
import { UserRole } from "../auth/decorators/roles.decorator";

describe("CommissionController authenticated financial audit attribution", () => {
  const approveCommission = jest.fn();
  const revokeCommission = jest.fn();
  const generateMonthlySettlement = jest.fn();
  const approveSettlementBatch = jest.fn();
  const paySettlementBatch = jest.fn();

  const controller = new CommissionController({
    approveCommission,
    revokeCommission,
    generateMonthlySettlement,
    approveSettlementBatch,
    paySettlementBatch,
    prisma: {},
  } as unknown as CommissionService);

  const req = (role: UserRole = UserRole.ADMIN, id?: string) => ({
    user: {
      id: id === undefined ? "trusted-admin-123" : id,
      role,
      email: "admin@example.test",
    } as AuthUser,
  });
  const trusted = req();

  beforeEach(() => {
    jest.resetAllMocks();
    approveCommission.mockResolvedValue({ id: "commission-1" });
    revokeCommission.mockResolvedValue({ success: true });
    generateMonthlySettlement.mockResolvedValue({ id: "batch-1" });
    approveSettlementBatch.mockResolvedValue({ id: "batch-1" });
    paySettlementBatch.mockRejectedValue(
      new ConflictException("Bank confirmation required"),
    );
  });

  it("attributes a commission approval to the verified admin ID", async () => {
    await expect(
      controller.approveCommission("commission-1", trusted),
    ).resolves.toHaveProperty("success", true);
    expect(approveCommission).toHaveBeenCalledWith(
      "commission-1",
      "trusted-admin-123",
    );
  });

  it("ignores forged revokedBy while recording a verified actor and reason", async () => {
    await controller.revokeCommission(
      "commission-1",
      { reason: "  fraude documentado  ", revokedBy: "forged-admin" } as never,
      trusted,
    );
    expect(revokeCommission).toHaveBeenCalledWith(
      "commission-1",
      "fraude documentado",
      "trusted-admin-123",
    );
  });

  it("ignores forged generatedBy, taking the actor from the JWT principal", async () => {
    await controller.generateSettlement(
      { month: 11, year: 2026, generatedBy: "forged-admin" } as never,
      trusted,
    );
    expect(generateMonthlySettlement).toHaveBeenCalledWith({
      month: 11,
      year: 2026,
      generatedBy: "trusted-admin-123",
    });
  });

  it("attributes settlement approval to the authenticated admin", async () => {
    await controller.approveSettlement("batch-1", trusted);
    expect(approveSettlementBatch).toHaveBeenCalledWith(
      "batch-1",
      "trusted-admin-123",
    );
  });

  it("does not trust paidBy and preserves the bank payout gate", async () => {
    await expect(
      controller.paySettlement(
        "batch-1",
        { referenceNum: "bank-claimed", paidBy: "fake-admin" } as never,
        trusted,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(paySettlementBatch).toHaveBeenCalledWith(
      "batch-1",
      "trusted-admin-123",
      "bank-claimed",
    );
  });

  it.each([
    { user: undefined },
    { user: { role: UserRole.ADMIN, id: "" } },
    { user: { role: UserRole.ADMIN, id: "   " } },
    { user: { role: UserRole.DRIVER, id: "driver-1" } },
    { user: { role: UserRole.ADVERTISER, id: "advertiser-1" } },
  ])(
    "rejects missing, invalid or non-admin audit principals",
    async (context) => {
      await expect(
        controller.approveCommission("commission-1", context as never),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(approveCommission).not.toHaveBeenCalled();
    },
  );

  it("denies a non-admin revoke before any service mutation", async () => {
    await expect(
      controller.revokeCommission(
        "commission-1",
        { reason: "fraude" },
        req(UserRole.DRIVER),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(revokeCommission).not.toHaveBeenCalled();
  });

  it("rejects missing or invalid revoke reason", async () => {
    for (const reason of ["", " ", null, 123]) {
      await expect(
        controller.revokeCommission(
          "commission-1",
          { reason } as never,
          trusted,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    }
    expect(revokeCommission).not.toHaveBeenCalled();
  });

  it.each([
    { month: 0, year: 2026 },
    { month: 13, year: 2026 },
    { month: 11.5, year: 2026 },
    { month: 11, year: 2026.5 },
    { month: 11, year: 2019 },
    { month: "11", year: 2026 },
  ])(
    "rejects invalid settlement periods and never calls finance",
    async (input) => {
      await expect(
        controller.generateSettlement(input as never, trusted),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(generateMonthlySettlement).not.toHaveBeenCalled();
    },
  );

  it("requires admin actor for settlements even with valid input", async () => {
    await expect(
      controller.generateSettlement({ month: 11, year: 2026 }, {
        user: { role: UserRole.ADMIN, id: "" },
      } as never),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(generateMonthlySettlement).not.toHaveBeenCalled();
  });
});
