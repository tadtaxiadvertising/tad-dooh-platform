import { BadRequestException } from "@nestjs/common";
import { CommissionService, CommissionStatus } from "./commission.service";

describe("Commission reconciliation must not report false-clean financial status", () => {
  const commissionsRead = jest.fn();
  const financialRead = jest.fn();
  const batchesRead = jest.fn();

  const prisma = {
    commission: { findMany: commissionsRead },
    financialTransaction: { findMany: financialRead },
    settlementBatch: { findMany: batchesRead },
  };
  const service = new CommissionService(prisma as never);

  const commission = {
    id: "commission-1",
    driverId: "driver-1",
    reference: "REF-1",
    amount: 500,
    sourceType: "DRIVER_REFERRAL",
    status: CommissionStatus.APPROVED,
    settlementBatchId: "batch-1" as string | null,
    createdAt: new Date("2026-11-05T12:00:00.000Z"),
    approvedAt: new Date("2026-11-06T12:00:00.000Z") as Date | null,
    paidAt: null,
  };
  const sourceLedger = {
    id: "ledger-1",
    reference: commission.reference,
    entityId: commission.driverId,
    type: "OUTGOING",
    category: "OPEX_COMMISSION",
    currency: "DOP",
    amount: 500,
    netAmount: 500,
    taxAmount: 0,
    status: "COMPLETED",
    createdAt: new Date("2026-11-05T12:00:00.000Z"),
  };
  let currentCommissions = [commission];
  let currentSourceLedger = [sourceLedger];
  const validReversal = {
    id: "reversal-1",
    reference: `REV-${commission.reference}`,
    entityId: commission.driverId,
    type: "INCOMING",
    currency: "DOP",
    amount: 500,
    netAmount: 500,
    taxAmount: 0,
    status: "COMPLETED",
  };
  let currentReversals: Array<typeof validReversal | typeof sourceLedger> = [];
  let currentPayouts: Array<Record<string, unknown>> = [];

  beforeEach(() => {
    jest.resetAllMocks();
    currentCommissions = [commission];
    currentSourceLedger = [sourceLedger];
    currentPayouts = [];
    currentReversals = [];
    commissionsRead.mockImplementation(async () => currentCommissions);
    batchesRead.mockResolvedValue([{ id: "batch-1", period: "2026-11" }]);
    financialRead.mockImplementation(async ({ where }) => {
      if (where.category === "OPEX_COMMISSION") return currentSourceLedger;
      if (where.category === "OPEX_COMMISSION_PAYOUT") return currentPayouts;
      if (where.category === "OPEX_COMMISSION_REVERSAL") {
        // Simulate indexed lookup by exact reference, regardless of date.
        return currentReversals.filter((entry) =>
          where.reference.in.includes(entry.reference),
        );
      }
      throw new Error("Unexpected financial category");
    });
  });

  it.each([
    [0, 2026],
    [13, 2026],
    [1.5, 2026],
    [Number.NaN, 2026],
    [11, 2019],
    [11, 2101],
    [11, 2026.5],
    [11, Number.NaN],
  ])(
    "rejects invalid reconciliation period month=%s year=%s before any financial reads",
    async (month, year) => {
      await expect(
        service.reconcileCommissions(month, year),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(commissionsRead).not.toHaveBeenCalled();
      expect(financialRead).not.toHaveBeenCalled();
      expect(batchesRead).not.toHaveBeenCalled();
    },
  );

  it("keeps a properly attributed APPROVED commission reconciled", async () => {
    const result = await service.reconcileCommissions(11, 2026);
    expect(result.isClean).toBe(true);
    expect(result.discrepancies).toEqual([]);
    expect(result.summary).toMatchObject({
      totalCommissions: 1,
      totalLedgerEntries: 1,
      totalBatches: 1,
      totalPayouts: 0,
    });
    expect(financialRead).toHaveBeenCalledTimes(3);
  });

  it("recognizes a valid PENDING event only with pending source ledger", async () => {
    currentCommissions = [
      {
        ...commission,
        status: CommissionStatus.PENDING,
        settlementBatchId: null,
      },
    ];
    currentSourceLedger = [{ ...sourceLedger, status: "PENDING" }];
    const result = await service.reconcileCommissions(11, 2026);
    expect(result.isClean).toBe(true);
  });

  const invalidLedgerCases: Array<
    [string, Partial<typeof sourceLedger>, RegExp]
  > = [
    ["wrong driver", { entityId: "other-driver" }, /beneficiary mismatch/],
    ["wrong type", { type: "INCOMING" }, /type\/currency mismatch/],
    ["wrong currency", { currency: "USD" }, /type\/currency mismatch/],
    ["wrong amount", { amount: 450 }, /amount mismatch/],
    ["wrong net amount", { netAmount: 450 }, /net\/tax mismatch/],
    ["wrong withholding", { taxAmount: 50 }, /net\/tax mismatch/],
    [
      "pending ledger behind approved wallet credit",
      { status: "PENDING" },
      /status mismatch/,
    ],
  ];

  it.each(invalidLedgerCases)(
    "flags %s rather than returning a clean financial report",
    async (_name, changed, pattern) => {
      currentSourceLedger = [{ ...sourceLedger, ...changed }];
      const result = await service.reconcileCommissions(11, 2026);
      expect(result.isClean).toBe(false);
      expect(result.discrepancies.some((item) => pattern.test(item))).toBe(
        true,
      );
    },
  );

  it("does not treat a completed source ledger as valid for a PENDING commission", async () => {
    currentCommissions = [
      {
        ...commission,
        status: CommissionStatus.PENDING,
        settlementBatchId: null,
      },
    ];
    const result = await service.reconcileCommissions(11, 2026);
    expect(result.isClean).toBe(false);
    expect(result.discrepancies).toContain(
      "Commission commission-1 source ledger status mismatch",
    );
  });

  it("does not infer bank transfer from a payout reference containing a driver prefix", async () => {
    currentCommissions = [{ ...commission, status: CommissionStatus.PAID }];
    currentPayouts = [
      {
        id: "fake-payout-1",
        reference: `PAYOUT-2026-11-${commission.driverId.slice(0, 8)}-unverified`,
        entityId: "another-driver",
        status: "COMPLETED",
        amount: 450,
        netAmount: 450,
        taxAmount: 50,
      },
    ];
    const result = await service.reconcileCommissions(11, 2026);
    expect(result.isClean).toBe(false);
    expect(result.summary.totalPayouts).toBe(1);
    expect(result.discrepancies).toContain(
      "Commission commission-1 marked PAID without verified bank evidence; manual reconciliation required",
    );
  });

  it("flags PAID without verified bank evidence even when payout entity matches driver", async () => {
    currentCommissions = [{ ...commission, status: CommissionStatus.PAID }];
    currentPayouts = [
      {
        id: "unverified-payout-1",
        reference: "bank-looking-reference",
        entityId: commission.driverId,
        status: "COMPLETED",
        amount: 450,
        netAmount: 450,
        taxAmount: 50,
      },
    ];
    const result = await service.reconcileCommissions(11, 2026);
    expect(result.isClean).toBe(false);
    expect(
      result.discrepancies.some((item) =>
        item.includes("verified bank evidence"),
      ),
    ).toBe(true);
  });

  it("retains missing ledger and unmatched ledger discrepancy checks", async () => {
    currentSourceLedger = [{ ...sourceLedger, reference: "ANOTHER-REFERENCE" }];
    const result = await service.reconcileCommissions(11, 2026);
    expect(result.isClean).toBe(false);
    expect(
      result.discrepancies.some((item) => item.includes("has no ledger entry")),
    ).toBe(true);
    expect(
      result.discrepancies.some((item) =>
        item.includes("has no matching commission"),
      ),
    ).toBe(true);
  });

  it("requires a completed cross-month reversal ledger for an approved-then-revoked commission", async () => {
    currentCommissions = [
      {
        ...commission,
        status: CommissionStatus.REVOKED,
        approvedAt: new Date("2026-11-06T12:00:00.000Z"),
        settlementBatchId: null,
      },
    ];
    currentReversals = [
      {
        ...sourceLedger,
        id: "reversal-1",
        reference: "REV-REF-1",
        type: "INCOMING",
        createdAt: new Date("2026-12-03T12:00:00.000Z"),
      },
    ];
    const result = await service.reconcileCommissions(11, 2026);
    expect(result.isClean).toBe(true);
    expect(financialRead).toHaveBeenCalledWith({
      where: {
        category: "OPEX_COMMISSION_REVERSAL",
        reference: { in: ["REV-REF-1"] },
      },
      select: expect.objectContaining({
        reference: true,
        entityId: true,
        amount: true,
        netAmount: true,
        taxAmount: true,
        status: true,
      }),
    });
  });

  it("reports an approved-then-revoked commission without its reversal ledger", async () => {
    currentCommissions = [
      {
        ...commission,
        status: CommissionStatus.REVOKED,
        approvedAt: new Date("2026-11-06T12:00:00.000Z"),
        settlementBatchId: null,
      },
    ];
    const result = await service.reconcileCommissions(11, 2026);
    expect(result.isClean).toBe(false);
    expect(result.discrepancies).toContain(
      "Commission commission-1 revoked after approval but has no reversal ledger entry",
    );
  });

  const corruptReversalCases: Array<[string, Partial<typeof sourceLedger>]> = [
    ["wrong owner", { entityId: "other-driver" }],
    ["wrong direction", { type: "OUTGOING" }],
    ["wrong currency", { currency: "USD" }],
    ["wrong gross", { amount: 400 }],
    ["wrong net", { netAmount: 400 }],
    ["wrong tax", { taxAmount: 45 }],
    ["uncompleted", { status: "PENDING" }],
  ];

  it.each(corruptReversalCases)(
    "rejects financially invalid %s in a purported reversal ledger",
    async (_name, changed) => {
      currentCommissions = [
        {
          ...commission,
          status: CommissionStatus.REVOKED,
          approvedAt: new Date("2026-11-06T12:00:00.000Z"),
          settlementBatchId: null,
        },
      ];
      currentReversals = [
        {
          ...sourceLedger,
          id: "reversal-1",
          reference: "REV-REF-1",
          type: "INCOMING",
          ...changed,
        },
      ];
      const result = await service.reconcileCommissions(11, 2026);
      expect(result.isClean).toBe(false);
      expect(result.discrepancies).toContain(
        "Commission commission-1 reversal ledger attribution/amount/status mismatch",
      );
    },
  );

  it("does not expect a reversal for REVOKED commissions never approved", async () => {
    currentCommissions = [
      {
        ...commission,
        status: CommissionStatus.REVOKED,
        approvedAt: null,
        settlementBatchId: null,
      },
    ];
    currentSourceLedger = [{ ...sourceLedger, status: "PENDING" }];
    const result = await service.reconcileCommissions(11, 2026);
    expect(result.isClean).toBe(true);
  });

  it("flags an unexpected reversal on PENDING or APPROVED commissions", async () => {
    currentReversals = [
      {
        ...sourceLedger,
        id: "reversal-1",
        type: "INCOMING",
        reference: "REV-REF-1",
      },
    ];
    const result = await service.reconcileCommissions(11, 2026);
    expect(result.isClean).toBe(false);
    expect(result.discrepancies).toContain(
      "Commission commission-1 has an unexpected reversal ledger entry",
    );
  });

  it("flags an unexpected reversal for a pending-then-revoked commission", async () => {
    currentCommissions = [
      {
        ...commission,
        status: CommissionStatus.REVOKED,
        approvedAt: null,
        settlementBatchId: null,
      },
    ];
    currentSourceLedger = [{ ...sourceLedger, status: "PENDING" }];
    currentReversals = [
      {
        ...sourceLedger,
        id: "reversal-1",
        type: "INCOMING",
        reference: "REV-REF-1",
      },
    ];
    const result = await service.reconcileCommissions(11, 2026);
    expect(result.isClean).toBe(false);
    expect(result.discrepancies).toContain(
      "Commission commission-1 has an unexpected reversal ledger entry",
    );
  });

  it("splits 501 reversal reference lookups into bounded batches", async () => {
    currentCommissions = Array.from({ length: 501 }, (_, index) => ({
      ...commission,
      id: `commission-${index}`,
      reference: `REF-${index}`,
      status: CommissionStatus.PENDING,
      settlementBatchId: null,
    }));
    currentSourceLedger = currentCommissions.map((item, index) => ({
      ...sourceLedger,
      id: `ledger-${index}`,
      reference: item.reference,
      status: "PENDING",
    }));
    const result = await service.reconcileCommissions(11, 2026);
    expect(result.isClean).toBe(true);
    const calls = financialRead.mock.calls.filter(
      ([arg]) => arg.where.category === "OPEX_COMMISSION_REVERSAL",
    );
    expect(calls).toHaveLength(2);
    expect(calls[0][0].where.reference.in).toHaveLength(500);
    expect(calls[1][0].where.reference.in).toHaveLength(1);
  });

  it("retains reporting of APPROVED commissions without settlement batch", async () => {
    currentCommissions = [{ ...commission, settlementBatchId: null }];
    const result = await service.reconcileCommissions(11, 2026);
    expect(result.isClean).toBe(false);
    expect(result.discrepancies).toContain(
      "1 APPROVED commissions not assigned to settlement batch",
    );
  });
  it("fails reconciliation when an approved credit was revoked without a reversal ledger", async () => {
    currentCommissions = [
      {
        ...commission,
        status: CommissionStatus.REVOKED,
        settlementBatchId: null,
      },
    ];
    const result = await service.reconcileCommissions(11, 2026);
    expect(result.isClean).toBe(false);
    expect(result.discrepancies).toContain(
      "Commission commission-1 revoked after approval but has no reversal ledger entry",
    );
  });

  it("accepts a revoked previously credited commission only with exact compensation", async () => {
    currentCommissions = [
      {
        ...commission,
        status: CommissionStatus.REVOKED,
        settlementBatchId: null,
      },
    ];
    currentReversals = [validReversal];

    const result = await service.reconcileCommissions(11, 2026);
    expect(result.isClean).toBe(true);
    expect(result.discrepancies).toEqual([]);
    expect(financialRead).toHaveBeenCalledWith({
      where: {
        category: "OPEX_COMMISSION_REVERSAL",
        reference: { in: ["REV-REF-1"] },
      },
      select: expect.objectContaining({
        reference: true,
        entityId: true,
        amount: true,
        currency: true,
        status: true,
      }),
    });
  });

  it("accepts PENDING to REVOKED without a wallet credit or compensating ledger", async () => {
    currentCommissions = [
      {
        ...commission,
        status: CommissionStatus.REVOKED,
        settlementBatchId: null,
        approvedAt: null,
      },
    ];
    currentSourceLedger = [{ ...sourceLedger, status: "PENDING" }];
    const result = await service.reconcileCommissions(11, 2026);
    expect(result.isClean).toBe(true);
  });

  it("rejects a PENDING to REVOKED record with a completed source ledger", async () => {
    currentCommissions = [
      {
        ...commission,
        status: CommissionStatus.REVOKED,
        settlementBatchId: null,
        approvedAt: null,
      },
    ];
    const result = await service.reconcileCommissions(11, 2026);
    expect(result.isClean).toBe(false);
    expect(result.discrepancies).toContain(
      "Commission commission-1 source ledger status mismatch",
    );
  });

  const invalidReversalCases: Array<[string, Partial<typeof validReversal>]> = [
    ["another beneficiary", { entityId: "another-driver" }],
    ["wrong direction", { type: "OUTGOING" }],
    ["wrong currency", { currency: "USD" }],
    ["wrong amount", { amount: 499 }],
    ["wrong net amount", { netAmount: 499 }],
    ["fabricated tax", { taxAmount: 1 }],
    ["pending reversal", { status: "PENDING" }],
  ];

  it.each(invalidReversalCases)(
    "rejects %s in a financial reversal rather than marking it clean",
    async (_label, change) => {
      currentCommissions = [
        {
          ...commission,
          status: CommissionStatus.REVOKED,
          settlementBatchId: null,
        },
      ];
      currentReversals = [{ ...validReversal, ...change }];

      const result = await service.reconcileCommissions(11, 2026);
      expect(result.isClean).toBe(false);
      expect(result.discrepancies).toContain(
        "Commission commission-1 reversal ledger attribution/amount/status mismatch",
      );
    },
  );

  it("flags unexpected reversal of an uncredited or still-approved commission", async () => {
    currentReversals = [validReversal];
    const result = await service.reconcileCommissions(11, 2026);
    expect(result.isClean).toBe(false);
    expect(result.discrepancies).toContain(
      "Commission commission-1 has an unexpected reversal ledger entry",
    );
  });

  it("flags unexpected reversal after revoking a never-approved commission", async () => {
    currentCommissions = [
      {
        ...commission,
        status: CommissionStatus.REVOKED,
        settlementBatchId: null,
        approvedAt: null,
      },
    ];
    currentSourceLedger = [{ ...sourceLedger, status: "PENDING" }];
    currentReversals = [validReversal];
    const result = await service.reconcileCommissions(11, 2026);
    expect(result.isClean).toBe(false);
    expect(result.discrepancies).toContain(
      "Commission commission-1 has an unexpected reversal ledger entry",
    );
  });

  it("reads reversals by exact reference even if revoked in a later month", async () => {
    currentCommissions = [
      {
        ...commission,
        status: CommissionStatus.REVOKED,
        settlementBatchId: null,
      },
    ];
    currentReversals = [validReversal];
    await service.reconcileCommissions(11, 2026);
    const reversalCalls = financialRead.mock.calls
      .map(([args]) => args)
      .filter((args) => args.where.category === "OPEX_COMMISSION_REVERSAL");
    expect(reversalCalls).toHaveLength(1);
    expect(reversalCalls[0].where.reference).toEqual({ in: ["REV-REF-1"] });
    expect(reversalCalls[0].where.createdAt).toBeUndefined();
  });

  it("bounds reference predicates into 500-member chunks at 10x volume", async () => {
    currentCommissions = Array.from({ length: 501 }, (_, index) => ({
      ...commission,
      id: `commission-${index}`,
      reference: `REF-${index}`,
    }));
    await service.reconcileCommissions(11, 2026);
    const reversalCalls = financialRead.mock.calls
      .map(([args]) => args)
      .filter((args) => args.where.category === "OPEX_COMMISSION_REVERSAL");
    expect(reversalCalls).toHaveLength(2);
    expect(reversalCalls[0].where.reference.in).toHaveLength(500);
    expect(reversalCalls[1].where.reference.in).toHaveLength(1);
  });
});
