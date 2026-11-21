import { ConflictException } from "@nestjs/common";
import {
  CommissionService,
  CommissionSourceType,
  type CreateCommissionInput,
} from "./commission.service";

describe("CommissionService reference binds one economic event", () => {
  const findFirst = jest.fn();
  const commissionCreate = jest.fn();
  const driverFindUnique = jest.fn();
  const ledgerCreate = jest.fn();
  const winnerFindUnique = jest.fn();
  const tx = {
    commission: { findFirst, create: commissionCreate },
    driver: { findUnique: driverFindUnique },
    financialTransaction: { create: ledgerCreate },
  };
  const prisma = {
    $transaction: jest.fn(async (cb: (client: typeof tx) => Promise<unknown>) =>
      cb(tx),
    ),
    commission: { findUnique: winnerFindUnique },
  };
  const service = new CommissionService(prisma as never);
  const input: CreateCommissionInput = {
    driverId: "driver-1",
    amount: 500,
    sourceType: CommissionSourceType.DRIVER_REFERRAL,
    reference: "DRIVER-REF-fixture-1",
    metadata: { referredDriverId: "new-driver-1", note: "Fixture" },
  };
  const existing = {
    id: "commission-1",
    driverId: input.driverId,
    amount: input.amount,
    sourceType: input.sourceType,
    reference: input.reference,
    metadata: { referredDriverId: "new-driver-1", note: "Original note" },
  };

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation(async (cb) => cb(tx));
    findFirst.mockResolvedValue(null);
    driverFindUnique.mockResolvedValue({ id: input.driverId });
    commissionCreate.mockResolvedValue(existing);
    ledgerCreate.mockResolvedValue({ id: "ledger-fixture" });
    winnerFindUnique.mockResolvedValue(null);
  });

  it("returns an exact replay without creating an additional ledger entry", async () => {
    findFirst.mockResolvedValue(existing);
    const result = await service.createIdempotent(input);
    expect(result).toEqual({ commission: existing, created: false });
    expect(commissionCreate).not.toHaveBeenCalled();
    expect(ledgerCreate).not.toHaveBeenCalled();
  });

  it.each([
    ["other driver", { driverId: "driver-2" }],
    ["different amount", { amount: 501 }],
    ["different source", { sourceType: CommissionSourceType.ADVERTISER_SALE }],
    [
      "different referred driver",
      { metadata: { referredDriverId: "new-driver-2" } },
    ],
    ["missing referred driver", { metadata: {} }],
    [
      "different campaign",
      {
        metadata: {
          referredDriverId: "new-driver-1",
          campaignId: "campaign-1",
        },
      },
    ],
  ])(
    "rejects reference replay for %s before any financial write",
    async (_description, change) => {
      findFirst.mockResolvedValue(existing);
      await expect(
        service.createIdempotent({
          ...input,
          ...(change as Partial<CreateCommissionInput>),
        }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(commissionCreate).not.toHaveBeenCalled();
      expect(ledgerCreate).not.toHaveBeenCalled();
      expect(winnerFindUnique).not.toHaveBeenCalled();
    },
  );

  it("creates one commission and one pending ledger when reference is new", async () => {
    const result = await service.createIdempotent(input);
    expect(result.created).toBe(true);
    expect(commissionCreate).toHaveBeenCalledTimes(1);
    expect(ledgerCreate).toHaveBeenCalledTimes(1);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(winnerFindUnique).not.toHaveBeenCalled();
  });

  it("returns the same concurrent winner after a P2002 collision", async () => {
    commissionCreate.mockRejectedValue({ code: "P2002" });
    winnerFindUnique.mockResolvedValue(existing);
    const result = await service.createIdempotent(input);
    expect(result).toEqual({ commission: existing, created: false });
    expect(winnerFindUnique).toHaveBeenCalledWith({
      where: { reference: input.reference },
    });
    expect(ledgerCreate).not.toHaveBeenCalled();
  });

  it("refuses a concurrent P2002 winner for a different event", async () => {
    commissionCreate.mockRejectedValue({ code: "P2002" });
    winnerFindUnique.mockResolvedValue({
      ...existing,
      driverId: "other-driver",
    });
    await expect(service.createIdempotent(input)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(ledgerCreate).not.toHaveBeenCalled();
  });

  it("preserves P2002 when no commission winner exists", async () => {
    const dbError = { code: "P2002" };
    commissionCreate.mockRejectedValue(dbError);
    winnerFindUnique.mockResolvedValue(null);
    await expect(service.createIdempotent(input)).rejects.toBe(dbError);
    expect(ledgerCreate).not.toHaveBeenCalled();
  });

  it("does not mask database failures unrelated to unique-reference races", async () => {
    const dbError = { code: "P2022" };
    commissionCreate.mockRejectedValue(dbError);
    await expect(service.createIdempotent(input)).rejects.toBe(dbError);
    expect(winnerFindUnique).not.toHaveBeenCalled();
    expect(ledgerCreate).not.toHaveBeenCalled();
  });
});
