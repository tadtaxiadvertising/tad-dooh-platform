import { ConflictException } from "@nestjs/common";
import {
  CommissionService,
  CommissionSourceType,
  CommissionStatus,
} from "./commission.service";

describe("Commission monthly settlement atomic membership claim", () => {
  const findBatch = jest.fn();
  const findCommissions = jest.fn();
  const createBatch = jest.fn();
  const claimCommissions = jest.fn();

  const tx = {
    settlementBatch: {
      findUnique: findBatch,
      create: createBatch,
    },
    commission: {
      findMany: findCommissions,
      updateMany: claimCommissions,
    },
  };
  const prisma = {
    $transaction: jest.fn(
      async (callback: (client: typeof tx) => Promise<unknown>) =>
        callback(tx),
    ),
  };
  const service = new CommissionService(prisma as never);

  const eligible = {
    id: "commission-1",
    driverId: "driver-1",
    driver: { id: "driver-1", fullName: "Conductor de prueba" },
    sourceType: CommissionSourceType.DRIVER_REFERRAL,
    status: CommissionStatus.APPROVED,
    amount: 500,
    reference: "DRIVER-REF-1",
    metadata: {},
    createdAt: new Date("2026-11-11T12:00:00.000Z"),
    settlementBatchId: null,
  };

  const draftBatch = {
    id: "batch-1",
    period: "2026-11",
    status: "DRAFT",
    grossTotal: 500,
    netTotal: 450,
    withholdings: 50,
    referents: [],
    createdAt: new Date("2026-11-18T20:00:00.000Z"),
    approvedAt: null,
    paidAt: null,
  };

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation(async (fn) => fn(tx));
    findBatch.mockResolvedValue(null);
    findCommissions.mockResolvedValue([eligible]);
    createBatch.mockResolvedValue(draftBatch);
    claimCommissions.mockResolvedValue({ count: 1 });
  });

  it("claims only still-APPROVED and unbatched members before publishing totals", async () => {
    const result = await service.generateMonthlySettlement({
      month: 11,
      year: 2026,
      generatedBy: "admin-1",
    });

    expect(result.id).toBe("batch-1");
    expect(result.status).toBe("DRAFT");
    expect(createBatch).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: "DRAFT",
        commissionsCount: 1,
        grossTotal: 500,
        netTotal: 450,
      }),
    });
    expect(claimCommissions).toHaveBeenCalledWith({
      where: {
        id: { in: ["commission-1"] },
        status: CommissionStatus.APPROVED,
        settlementBatchId: null,
      },
      data: { settlementBatchId: "batch-1" },
    });
    expect(createBatch.mock.invocationCallOrder[0])
      .toBeLessThan(claimCommissions.mock.invocationCallOrder[0]);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it.each([0, 2])(
    "rejects when %s commissions are claimed instead of exactly one",
    async (count) => {
      claimCommissions.mockResolvedValue({ count });

      await expect(
        service.generateMonthlySettlement({
          month: 11,
          year: 2026,
          generatedBy: "admin-1",
        }),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(claimCommissions).toHaveBeenCalledTimes(1);
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      // A mocked transaction cannot prove database rollback. Real PostgreSQL
      // integration must show no batch/partial links survive this exception.
    },
  );

  it("does not overwrite a commission revoked after initial selection", async () => {
    // READ COMMITTED may read APPROVED and see REVOKED by the time the claim
    // is attempted. The DB's conditional UPDATE must then match zero rows.
    claimCommissions.mockResolvedValue({ count: 0 });
    await expect(
      service.generateMonthlySettlement({
        month: 11,
        year: 2026,
        generatedBy: "admin-1",
      }),
    ).rejects.toThrow("changed during generation");
    expect(claimCommissions).toHaveBeenCalledWith({
      where: expect.objectContaining({
        status: CommissionStatus.APPROVED,
        settlementBatchId: null,
      }),
      data: { settlementBatchId: "batch-1" },
    });
  });

  it("reuses the existing period batch without creating or claiming anything", async () => {
    findBatch.mockResolvedValue({ ...draftBatch, status: "APPROVED" });

    const batch = await service.generateMonthlySettlement({
      month: 11,
      year: 2026,
      generatedBy: "admin-2",
    });

    expect(batch.status).toBe("APPROVED");
    expect(findCommissions).not.toHaveBeenCalled();
    expect(createBatch).not.toHaveBeenCalled();
    expect(claimCommissions).not.toHaveBeenCalled();
  });

  it("preserves the existing empty-period semantics without a membership claim", async () => {
    findCommissions.mockResolvedValue([]);
    createBatch.mockResolvedValue({
      ...draftBatch,
      status: "APPROVED",
      grossTotal: 0,
      netTotal: 0,
      withholdings: 0,
    });

    const batch = await service.generateMonthlySettlement({
      month: 11,
      year: 2026,
      generatedBy: "admin-1",
    });

    expect(batch.grossTotal).toBe(0);
    expect(claimCommissions).not.toHaveBeenCalled();
    expect(createBatch).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: "APPROVED",
        commissionsCount: 0,
      }),
    });
  });
});
