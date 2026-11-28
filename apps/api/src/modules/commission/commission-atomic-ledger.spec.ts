import { ConflictException, NotFoundException } from "@nestjs/common";
import { CommissionService, CommissionStatus } from "./commission.service";

describe("CommissionService atomic wallet/ledger transitions", () => {
  const findUnique = jest.fn();
  const updateMany = jest.fn();
  const ledgerUpdateMany = jest.fn();
  const ledgerCreate = jest.fn();
  const walletUpsert = jest.fn();
  const walletUpdateMany = jest.fn();
  const findUniqueOrThrow = jest.fn();

  const commission = {
    id: "commission-1",
    driverId: "driver-1",
    amount: 500,
    reference: "REF-DRIVER-1",
    status: CommissionStatus.PENDING,
    settlementBatchId: null,
  };
  const tx = {
    commission: { findUnique, updateMany },
    financialTransaction: {
      updateMany: ledgerUpdateMany,
      create: ledgerCreate,
    },
    wallet: { upsert: walletUpsert, updateMany: walletUpdateMany },
  };
  const prisma = {
    commission: {
      findUnique,
      findUniqueOrThrow,
      updateMany,
    },
    $transaction: jest.fn(
      async (callback: (transaction: typeof tx) => Promise<unknown>) =>
        callback(tx),
    ),
  };
  const service = new CommissionService(prisma as never);

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation(async (callback) => callback(tx));
    findUnique.mockResolvedValue(commission);
    findUniqueOrThrow.mockResolvedValue({
      ...commission,
      status: CommissionStatus.PAID,
    });
    updateMany.mockResolvedValue({ count: 1 });
    ledgerUpdateMany.mockResolvedValue({ count: 1 });
    walletUpsert.mockResolvedValue({
      driverId: "driver-1",
      availableBalance: 500,
    });
    walletUpdateMany.mockResolvedValue({ count: 1 });
    ledgerCreate.mockResolvedValue({ id: "reversal-1" });
  });

  it("conditionally approves once, advances matching ledger, then credits wallet", async () => {
    await service.approveCommission("commission-1", "admin-1");
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "commission-1", status: CommissionStatus.PENDING },
      data: {
        status: CommissionStatus.APPROVED,
        approvedAt: expect.any(Date),
        approvedBy: "admin-1",
      },
    });
    expect(ledgerUpdateMany).toHaveBeenCalledWith({
      where: {
        reference: "REF-DRIVER-1",
        type: "OUTGOING",
        category: "OPEX_COMMISSION",
        entityId: "driver-1",
        amount: 500,
        netAmount: 500,
        taxAmount: 0,
        currency: "DOP",
        status: "PENDING",
      },
      data: { status: "COMPLETED" },
    });
    expect(walletUpsert).toHaveBeenCalledWith({
      where: { driverId: "driver-1" },
      update: { availableBalance: { increment: 500 } },
      create: { driverId: "driver-1", availableBalance: 500 },
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(updateMany.mock.invocationCallOrder[0]).toBeLessThan(
      ledgerUpdateMany.mock.invocationCallOrder[0],
    );
    expect(ledgerUpdateMany.mock.invocationCallOrder[0]).toBeLessThan(
      walletUpsert.mock.invocationCallOrder[0],
    );
  });

  it.each([
    ["netAmount", 450],
    ["taxAmount", 50],
    ["currency", "USD"],
  ] as const)(
    "rejects a pending source ledger with inconsistent %s before wallet credit",
    async (corruptField, corruptValue) => {
      // Simulate Prisma updateMany's exact equality predicates over an
      // existing historical ledger row; omitting a field from WHERE must
      // make this regression fail, not silently return count=0.
      const ledgerRow: Record<string, string | number> = {
        reference: commission.reference,
        type: "OUTGOING",
        category: "OPEX_COMMISSION",
        entityId: commission.driverId,
        amount: commission.amount,
        netAmount: commission.amount,
        taxAmount: 0,
        currency: "DOP",
        status: "PENDING",
        [corruptField]: corruptValue,
      };
      ledgerUpdateMany.mockImplementation(
        async ({ where }: { where: Record<string, string | number> }) => ({
          count: Object.entries(where).every(
            ([key, expected]) => ledgerRow[key] === expected,
          )
            ? 1
            : 0,
        }),
      );

      await expect(
        service.approveCommission("commission-1", "admin-1"),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(ledgerUpdateMany).toHaveBeenCalledTimes(1);
      expect(walletUpsert).not.toHaveBeenCalled();
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      // Actual DB rollback of the preceding commission CAS needs staging.
    },
  );

  it("rejects already-approved commissions before writing a ledger or balance", async () => {
    findUnique.mockResolvedValue({
      ...commission,
      status: CommissionStatus.APPROVED,
    });
    await expect(
      service.approveCommission("commission-1", "admin-1"),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(updateMany).not.toHaveBeenCalled();
    expect(ledgerUpdateMany).not.toHaveBeenCalled();
    expect(walletUpsert).not.toHaveBeenCalled();
  });

  it("rejects a competing approval that loses the atomic PENDING claim", async () => {
    updateMany.mockResolvedValue({ count: 0 });
    await expect(
      service.approveCommission("commission-1", "admin-2"),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(ledgerUpdateMany).not.toHaveBeenCalled();
    expect(walletUpsert).not.toHaveBeenCalled();
  });

  it("credits only one of two concurrent approvals even when both read PENDING", async () => {
    let claims = 0;
    updateMany.mockImplementation(async () => ({
      count: ++claims === 1 ? 1 : 0,
    }));
    const attempts = await Promise.allSettled([
      service.approveCommission("commission-1", "admin-1"),
      service.approveCommission("commission-1", "admin-2"),
    ]);
    expect(attempts.filter((a) => a.status === "fulfilled")).toHaveLength(1);
    expect(attempts.filter((a) => a.status === "rejected")).toHaveLength(1);
    expect(ledgerUpdateMany).toHaveBeenCalledTimes(1);
    expect(walletUpsert).toHaveBeenCalledTimes(1);
  });

  it.each([0, 2])(
    "blocks approval when source ledger update affects %s records",
    async (count) => {
      ledgerUpdateMany.mockResolvedValue({ count });
      await expect(
        service.approveCommission("commission-1", "admin-1"),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(walletUpsert).not.toHaveBeenCalled();
      // This update is inside $transaction: actual DB rollback must be
      // checked in staging, not inferred from a mocked transaction.
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    },
  );

  it("rejects a missing commission with no balance mutation", async () => {
    findUnique.mockResolvedValue(null);
    await expect(
      service.approveCommission("missing", "admin-1"),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(walletUpsert).not.toHaveBeenCalled();
  });

  it.each([CommissionStatus.APPROVED, CommissionStatus.PAID])(
    "revokes %s and reverses the wallet credit exactly once",
    async (status) => {
      findUnique.mockResolvedValue({ ...commission, status });
      await service.revokeCommission("commission-1", "fraud", "admin-1");
      expect(updateMany).toHaveBeenCalledWith({
        where: {
          id: "commission-1",
          status,
          settlementBatchId: null,
        },
        data: {
          status: CommissionStatus.REVOKED,
          revokedAt: expect.any(Date),
          revokedBy: "admin-1",
          revocationReason: "fraud",
        },
      });
      expect(ledgerCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          reference: "REV-REF-DRIVER-1",
          type: "INCOMING",
          category: "OPEX_COMMISSION_REVERSAL",
        }),
      });
      expect(walletUpdateMany).toHaveBeenCalledWith({
        where: {
          driverId: "driver-1",
          availableBalance: { gte: 500 },
        },
        data: { availableBalance: { decrement: 500 } },
      });
    },
  );

  it.each([0, 2])(
    "fails closed when funded wallet revocation matches %s wallets",
    async (count) => {
      findUnique.mockResolvedValue({
        ...commission,
        status: CommissionStatus.APPROVED,
      });
      walletUpdateMany.mockResolvedValue({ count });

      await expect(
        service.revokeCommission("commission-1", "fraud", "admin-1"),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(walletUpdateMany).toHaveBeenCalledWith({
        where: {
          driverId: "driver-1",
          availableBalance: { gte: 500 },
        },
        data: { availableBalance: { decrement: 500 } },
      });
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      // A mocked Prisma transaction cannot prove rollback of the commission
      // status and reversal ledger. Verify on real PostgreSQL in staging.
    },
  );

  it.each([0, -500, Number.NaN, Number.POSITIVE_INFINITY, 0.001])(
    "rejects malformed historical approved amount %s before reversing",
    async (amount) => {
      findUnique.mockResolvedValue({
        ...commission,
        amount,
        status: CommissionStatus.APPROVED,
      });

      await expect(
        service.revokeCommission("commission-1", "invalid", "admin-1"),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(updateMany).not.toHaveBeenCalled();
      expect(ledgerCreate).not.toHaveBeenCalled();
      expect(walletUpdateMany).not.toHaveBeenCalled();
    },
  );

  it("revokes PENDING without debiting a wallet that was never credited", async () => {
    await service.revokeCommission("commission-1", "fraud", "admin-1");
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "commission-1",
          status: CommissionStatus.PENDING,
          settlementBatchId: null,
        },
      }),
    );
    expect(walletUpdateMany).not.toHaveBeenCalled();
    expect(ledgerCreate).not.toHaveBeenCalled();
  });

  it.each([
    CommissionStatus.PENDING,
    CommissionStatus.APPROVED,
    CommissionStatus.PAID,
  ])(
    "refuses revocation of %s commission already linked to a settlement",
    async (status) => {
      findUnique.mockResolvedValue({
        ...commission,
        status,
        settlementBatchId: "settlement-batch-1",
      });

      await expect(
        service.revokeCommission("commission-1", "fraud", "admin-1"),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(updateMany).not.toHaveBeenCalled();
      expect(ledgerCreate).not.toHaveBeenCalled();
      expect(walletUpdateMany).not.toHaveBeenCalled();
    },
  );

  it("fails closed when a concurrent settlement claims after the revocation read", async () => {
    findUnique.mockResolvedValue({
      ...commission,
      status: CommissionStatus.APPROVED,
      settlementBatchId: null,
    });
    // The real WHERE additionally requires settlementBatchId IS NULL.
    // PostgreSQL returns count=0 if a settlement generator claimed the row.
    updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.revokeCommission("commission-1", "fraud", "admin-1"),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(updateMany).toHaveBeenCalledWith({
      where: {
        id: "commission-1",
        status: CommissionStatus.APPROVED,
        settlementBatchId: null,
      },
      data: {
        status: CommissionStatus.REVOKED,
        revokedAt: expect.any(Date),
        revokedBy: "admin-1",
        revocationReason: "fraud",
      },
    });
    expect(ledgerCreate).not.toHaveBeenCalled();
    expect(walletUpdateMany).not.toHaveBeenCalled();
  });

  it("rejects conflicting revocation with no compensating ledger or debit", async () => {
    findUnique.mockResolvedValue({
      ...commission,
      status: CommissionStatus.APPROVED,
    });
    updateMany.mockResolvedValue({ count: 0 });
    await expect(
      service.revokeCommission("commission-1", "fraud", "admin-1"),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(ledgerCreate).not.toHaveBeenCalled();
    expect(walletUpdateMany).not.toHaveBeenCalled();
  });

  it("rejects replay of revoked commission with no balance debit", async () => {
    findUnique.mockResolvedValue({
      ...commission,
      status: CommissionStatus.REVOKED,
    });
    await expect(
      service.revokeCommission("commission-1", "fraud", "admin-2"),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(updateMany).not.toHaveBeenCalled();
    expect(walletUpdateMany).not.toHaveBeenCalled();
  });

  it.each([
    CommissionStatus.PENDING,
    CommissionStatus.APPROVED,
    CommissionStatus.PAID,
    CommissionStatus.REVOKED,
  ])(
    "blocks individual PAID status for %s without bank reconciliation",
    async (status) => {
      findUnique.mockResolvedValue({ ...commission, status });
      await expect(
        service.markCommissionPaid("commission-1"),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(findUnique).not.toHaveBeenCalled();
      expect(updateMany).not.toHaveBeenCalled();
      expect(findUniqueOrThrow).not.toHaveBeenCalled();
      expect(ledgerUpdateMany).not.toHaveBeenCalled();
      expect(ledgerCreate).not.toHaveBeenCalled();
      expect(walletUpsert).not.toHaveBeenCalled();
      expect(walletUpdateMany).not.toHaveBeenCalled();
    },
  );

  it("rejects a caller-supplied paidAt without checking or writing a database", async () => {
    await expect(
      service.markCommissionPaid(
        "commission-1",
        new Date("2026-11-01T12:00:00.000Z"),
      ),
    ).rejects.toThrow("confirmación bancaria");
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(findUnique).not.toHaveBeenCalled();
    expect(updateMany).not.toHaveBeenCalled();
    expect(ledgerCreate).not.toHaveBeenCalled();
    expect(walletUpdateMany).not.toHaveBeenCalled();
  });
});
