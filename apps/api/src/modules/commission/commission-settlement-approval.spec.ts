import { ConflictException, NotFoundException } from "@nestjs/common";
import { CommissionService } from "./commission.service";

describe("Commission settlement must not claim bank payment during review", () => {
  const findUnique = jest.fn();
  const findUniqueOrThrow = jest.fn();
  const updateMany = jest.fn();
  const commissionUpdateMany = jest.fn();
  const countUnbatched = jest.fn();
  const financialCreate = jest.fn();

  const tx = {
    settlementBatch: { findUnique, findUniqueOrThrow, updateMany },
    commission: {
      updateMany: commissionUpdateMany,
      count: countUnbatched,
    },
    financialTransaction: { create: financialCreate },
  };
  const prisma = {
    $transaction: jest.fn(
      async (fn: (transaction: typeof tx) => Promise<unknown>) => fn(tx),
    ),
    settlementBatch: tx.settlementBatch,
    commission: tx.commission,
    financialTransaction: tx.financialTransaction,
  };
  const service = new CommissionService(prisma as never);

  const draft = {
    id: "batch-1",
    period: "2026-11",
    status: "DRAFT",
    grossTotal: 1000,
    netTotal: 900,
    withholdings: 100,
    commissionsCount: 2,
    referents: [],
    createdAt: new Date("2026-11-18T12:00:00.000Z"),
    approvedAt: null,
    paidAt: null,
  };

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation(async (fn) => fn(tx));
    findUnique.mockResolvedValue(draft);
    findUniqueOrThrow.mockResolvedValue({
      ...draft,
      status: "APPROVED",
      approvedAt: new Date("2026-11-18T13:00:00.000Z"),
    });
    updateMany.mockResolvedValue({ count: 1 });
    countUnbatched.mockResolvedValue(0);
  });

  it("approves only the batch with a DRAFT compare-and-set", async () => {
    const result = await service.approveSettlementBatch("batch-1", "admin-1");
    expect(result.status).toBe("APPROVED");
    expect(result.paidAt).toBeNull();
    expect(countUnbatched).toHaveBeenCalledTimes(1);
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "batch-1", status: "DRAFT" },
      data: {
        status: "APPROVED",
        approvedAt: expect.any(Date),
        approvedBy: "admin-1",
      },
    });
    expect(commissionUpdateMany).not.toHaveBeenCalled();
    expect(financialCreate).not.toHaveBeenCalled();
  });

  it("refuses to approve a DRAFT batch when new APPROVED commissions remain unbatched", async () => {
    countUnbatched.mockResolvedValue(2);
    await expect(
      service.approveSettlementBatch("batch-1", "admin-1"),
    ).rejects.toThrow("approved commissions outside its batch");

    expect(countUnbatched).toHaveBeenCalledWith({
      where: {
        status: "APPROVED",
        createdAt: {
          gte: new Date(2026, 10, 1),
          lt: new Date(2026, 11, 1),
        },
        settlementBatchId: null,
      },
    });
    expect(updateMany).not.toHaveBeenCalled();
    expect(commissionUpdateMany).not.toHaveBeenCalled();
    expect(financialCreate).not.toHaveBeenCalled();
  });

  it("rejects a corrupt stored period before approving or modifying the batch", async () => {
    findUnique.mockResolvedValue({ ...draft, period: "2026-13" });

    await expect(
      service.approveSettlementBatch("batch-1", "admin-1"),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(countUnbatched).not.toHaveBeenCalled();
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("does not create a payment transaction or alter commission statuses", async () => {
    await service.approveSettlementBatch("batch-1", "admin-1");
    expect(commissionUpdateMany).not.toHaveBeenCalled();
    expect(financialCreate).not.toHaveBeenCalled();
  });

  it("rejects already-approved and PAID batches without any mutation", async () => {
    for (const status of ["APPROVED", "PAID"]) {
      jest.clearAllMocks();
      findUnique.mockResolvedValue({ ...draft, status });
      await expect(
        service.approveSettlementBatch("batch-1", "admin-2"),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(updateMany).not.toHaveBeenCalled();
      expect(commissionUpdateMany).not.toHaveBeenCalled();
    }
  });

  it("rejects a competing admin after the DRAFT CAS loses", async () => {
    updateMany.mockResolvedValue({ count: 0 });
    await expect(
      service.approveSettlementBatch("batch-1", "admin-2"),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(findUniqueOrThrow).not.toHaveBeenCalled();
    expect(commissionUpdateMany).not.toHaveBeenCalled();
  });

  it("allows only one of two concurrent administrators to approve", async () => {
    let claims = 0;
    updateMany.mockImplementation(async () => ({
      count: ++claims === 1 ? 1 : 0,
    }));
    const results = await Promise.allSettled([
      service.approveSettlementBatch("batch-1", "admin-1"),
      service.approveSettlementBatch("batch-1", "admin-2"),
    ]);
    expect(results.filter((v) => v.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((v) => v.status === "rejected")).toHaveLength(1);
    expect(commissionUpdateMany).not.toHaveBeenCalled();
    expect(financialCreate).not.toHaveBeenCalled();
  });

  it("returns not found without performing any financial operation", async () => {
    findUnique.mockResolvedValue(null);
    await expect(
      service.approveSettlementBatch("missing", "admin-1"),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(updateMany).not.toHaveBeenCalled();
    expect(commissionUpdateMany).not.toHaveBeenCalled();
  });

  it("refuses to claim PAID without bank confirmation, before any DB transaction", async () => {
    await expect(
      service.paySettlementBatch("batch-1", "admin-1", "bank-ref-1"),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(updateMany).not.toHaveBeenCalled();
    expect(commissionUpdateMany).not.toHaveBeenCalled();
    expect(financialCreate).not.toHaveBeenCalled();
  });

  it("blocks payout even with an empty or reused client reference", async () => {
    await expect(
      service.paySettlementBatch("batch-1", "admin-2"),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      service.paySettlementBatch("batch-1", "admin-3", "same-ref"),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
