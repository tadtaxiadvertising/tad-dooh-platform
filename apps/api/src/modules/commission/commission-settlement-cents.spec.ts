import { ConflictException } from "@nestjs/common";
import {
  CommissionService,
  CommissionSourceType,
  CommissionStatus,
} from "./commission.service";

describe("Monthly settlement uses exact integer cents", () => {
  const findBatch = jest.fn();
  const findCommissions = jest.fn();
  const createBatch = jest.fn();
  const claimCommissions = jest.fn();
  const tx = {
    settlementBatch: { findUnique: findBatch, create: createBatch },
    commission: { findMany: findCommissions, updateMany: claimCommissions },
  };
  const prisma = {
    $transaction: jest.fn(
      async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
    ),
  };
  const service = new CommissionService(prisma as never);

  const commission = (id: string, amount: number, driverId = "driver-1") => ({
    id,
    driverId,
    driver: { id: driverId, fullName: "Test Driver" },
    sourceType: CommissionSourceType.DRIVER_REFERRAL,
    amount,
    status: CommissionStatus.APPROVED,
    settlementBatchId: null,
    reference: `TEST-${id}`,
    metadata: {},
    createdAt: new Date("2026-11-11T12:00:00.000Z"),
  });

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation(async (callback) => callback(tx));
    findBatch.mockResolvedValue(null);
    findCommissions.mockResolvedValue([commission("c-1", 500)]);
    createBatch.mockImplementation(async ({ data }) => ({
      id: "batch-1",
      createdAt: new Date("2026-11-18T12:00:00.000Z"),
      approvedAt: null,
      paidAt: null,
      ...data,
    }));
    claimCommissions.mockImplementation(async ({ where }) => ({
      count: where.id.in.length,
    }));
  });

  it.each([
    [0.29, 0.03, 0.26],
    [1.25, 0.13, 1.12],
    [500, 50, 450],
  ])(
    "withholds 10%% of RD$ %s rounded to cents, not whole pesos",
    async (amount, withholding, net) => {
      findCommissions.mockResolvedValue([commission("c-1", amount)]);
      const batch = await service.generateMonthlySettlement({
        month: 11,
        year: 2026,
        generatedBy: "admin-1",
      });
      expect(batch.grossTotal).toBe(amount);
      expect(batch.withholdings).toBe(withholding);
      expect(batch.netTotal).toBe(net);
      expect(batch.referents[0]).toEqual(
        expect.objectContaining({
          grossAmount: amount,
          withholding,
          netAmount: net,
        }),
      );
      expect(createBatch).toHaveBeenCalledTimes(1);
      expect(claimCommissions).toHaveBeenCalledTimes(1);
    },
  );

  it("aggregates cents per referent without floating-point residue", async () => {
    findCommissions.mockResolvedValue([
      commission("c-1", 0.1),
      commission("c-2", 0.2),
      commission("c-3", 0.29),
      commission("c-4", 1.25, "driver-2"),
      commission("c-5", 500, "driver-2"),
    ]);
    const batch = await service.generateMonthlySettlement({
      month: 11,
      year: 2026,
      generatedBy: "admin-1",
    });
    expect(batch.grossTotal).toBe(501.84);
    expect(batch.withholdings).toBe(50.19);
    expect(batch.netTotal).toBe(451.65);
    expect(batch.grossTotal - batch.withholdings).toBeCloseTo(
      batch.netTotal,
      10,
    );
    expect(batch.referents).toEqual([
      expect.objectContaining({
        driverId: "driver-1",
        grossAmount: 0.59,
        withholding: 0.06,
        netAmount: 0.53,
      }),
      expect.objectContaining({
        driverId: "driver-2",
        grossAmount: 501.25,
        withholding: 50.13,
        netAmount: 451.12,
      }),
    ]);
    expect(createBatch).toHaveBeenCalledWith({
      data: expect.objectContaining({
        commissionsCount: 5,
        grossTotal: 501.84,
        withholdings: 50.19,
        netTotal: 451.65,
        status: "DRAFT",
      }),
    });
    expect(claimCommissions).toHaveBeenCalledWith({
      where: {
        id: { in: ["c-1", "c-2", "c-3", "c-4", "c-5"] },
        status: CommissionStatus.APPROVED,
        settlementBatchId: null,
      },
      data: { settlementBatchId: "batch-1" },
    });
  });

  it.each([0, -500, 0.001, 1.234, Number.NaN, Number.POSITIVE_INFINITY])(
    "refuses legacy approved commission amount %s before batch write",
    async (amount) => {
      findCommissions.mockResolvedValue([commission("legacy", amount)]);
      await expect(
        service.generateMonthlySettlement({
          month: 11,
          year: 2026,
          generatedBy: "admin-1",
        }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(createBatch).not.toHaveBeenCalled();
      expect(claimCommissions).not.toHaveBeenCalled();
    },
  );

  it("refuses a total exceeding safe integer cents", async () => {
    findCommissions.mockResolvedValue([
      commission("large-1", 50_000_000_000_000),
      commission("large-2", 50_000_000_000_000),
    ]);
    await expect(
      service.generateMonthlySettlement({
        month: 11,
        year: 2026,
        generatedBy: "admin-1",
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(createBatch).not.toHaveBeenCalled();
    expect(claimCommissions).not.toHaveBeenCalled();
  });

  it("refuses an empty period without creating an automatically approved batch", async () => {
    // PR #341 deliberately refuses to seal empty months. If commissions
    // become APPROVED later, the operator must be able to retry generation.
    findCommissions.mockResolvedValue([]);

    await expect(
      service.generateMonthlySettlement({
        month: 11,
        year: 2026,
        generatedBy: "admin-1",
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(createBatch).not.toHaveBeenCalled();
    expect(claimCommissions).not.toHaveBeenCalled();
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });
});
