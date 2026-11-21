import { BadRequestException } from "@nestjs/common";
import {
  CommissionService,
  CommissionSourceType,
  CommissionStatus,
} from "./commission.service";

describe("CommissionService financial amount validation before idempotent create", () => {
  const findExisting = jest.fn();
  const createCommission = jest.fn();
  const findDriver = jest.fn();
  const createLedgerEntry = jest.fn();
  const tx = {
    commission: {
      findFirst: findExisting,
      create: createCommission,
    },
    driver: { findUnique: findDriver },
    financialTransaction: { create: createLedgerEntry },
  };
  const prisma = {
    $transaction: jest.fn(
      async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
    ),
  };
  const service = new CommissionService(prisma as never);

  const input = (amount: number) => ({
    driverId: "driver-fixture-1",
    amount,
    sourceType: CommissionSourceType.DRIVER_REFERRAL,
    reference: "REF-FIXTURE-1",
  });

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation(async (callback) => callback(tx));
    findExisting.mockResolvedValue(null);
    findDriver.mockResolvedValue({
      id: "driver-fixture-1",
      fullName: "Conductor de prueba",
    });
    createCommission.mockImplementation(async ({ data }) => ({
      id: "commission-fixture-1",
      ...data,
    }));
    createLedgerEntry.mockResolvedValue({ id: "ledger-fixture-1" });
  });

  it.each([
    0,
    -500,
    -0.01,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    0.001,
    1.234,
    0.009,
    Number.MAX_SAFE_INTEGER,
  ])(
    "rejects invalid amount %s before opening a transaction",
    async (amount) => {
      await expect(
        service.createIdempotent(input(amount)),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(findDriver).not.toHaveBeenCalled();
      expect(createCommission).not.toHaveBeenCalled();
      expect(createLedgerEntry).not.toHaveBeenCalled();
    },
  );

  it.each(["500", null, undefined, {}, []])(
    "rejects non-number amount %p without touching DB",
    async (amount) => {
      await expect(
        service.createIdempotent({
          ...input(500),
          amount: amount as number,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(createLedgerEntry).not.toHaveBeenCalled();
    },
  );

  it.each([0.01, 0.29, 1.25, 500, 1000000.23])(
    "accepts finite cent-denominated RD$ %s and creates matching ledger",
    async (amount) => {
      const result = await service.createIdempotent(input(amount));
      expect(result.created).toBe(true);
      expect(result.commission.amount).toBe(amount);
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(createCommission).toHaveBeenCalledWith({
        data: expect.objectContaining({
          amount,
          status: CommissionStatus.PENDING,
        }),
      });
      expect(createLedgerEntry).toHaveBeenCalledWith({
        data: expect.objectContaining({
          amount,
          netAmount: amount,
          taxAmount: 0,
          status: "PENDING",
          category: "OPEX_COMMISSION",
        }),
      });
    },
  );

  it("keeps exact idempotent replay without creating an extra ledger entry", async () => {
    findExisting.mockResolvedValue({
      id: "commission-original",
      driverId: "driver-fixture-1",
      amount: 500,
      sourceType: CommissionSourceType.DRIVER_REFERRAL,
      reference: "REF-FIXTURE-1",
    });
    const result = await service.createIdempotent(input(500));
    expect(result.created).toBe(false);
    expect(createCommission).not.toHaveBeenCalled();
    expect(createLedgerEntry).not.toHaveBeenCalled();
  });
});
