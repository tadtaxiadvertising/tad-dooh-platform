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
    settlementBatchId: "batch-1",
    createdAt: new Date("2026-11-05T12:00:00.000Z"),
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
  let currentPayouts: Array<Record<string, unknown>> = [];

  beforeEach(() => {
    jest.resetAllMocks();
    currentCommissions = [commission];
    currentSourceLedger = [sourceLedger];
    currentPayouts = [];
    commissionsRead.mockImplementation(async () => currentCommissions);
    batchesRead.mockResolvedValue([{ id: "batch-1", period: "2026-11" }]);
    financialRead.mockImplementation(async ({ where }) => {
      if (where.category === "OPEX_COMMISSION") return currentSourceLedger;
      if (where.category === "OPEX_COMMISSION_PAYOUT") return currentPayouts;
      throw new Error("Unexpected financial category");
    });
  });

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
    expect(financialRead).toHaveBeenCalledTimes(2);
  });

  it("recognizes a valid PENDING event only with pending source ledger", async () => {
    currentCommissions = [{ ...commission, status: CommissionStatus.PENDING, settlementBatchId: null }];
    currentSourceLedger = [{ ...sourceLedger, status: "PENDING" }];
    const result = await service.reconcileCommissions(11, 2026);
    expect(result.isClean).toBe(true);
  });

  it.each([
    ["wrong driver", { entityId: "other-driver" }, /beneficiary mismatch/],
    ["wrong type", { type: "INCOMING" }, /type\/currency mismatch/],
    ["wrong currency", { currency: "USD" }, /type\/currency mismatch/],
    ["wrong amount", { amount: 450 }, /amount mismatch/],
    ["wrong net amount", { netAmount: 450 }, /net\/tax mismatch/],
    ["wrong withholding", { taxAmount: 50 }, /net\/tax mismatch/],
    ["pending ledger behind approved wallet credit", { status: "PENDING" }, /status mismatch/],
  ])("flags %s rather than returning a clean financial report", async (_name, changed, pattern) => {
    currentSourceLedger = [{ ...sourceLedger, ...changed }];
    const result = await service.reconcileCommissions(11, 2026);
    expect(result.isClean).toBe(false);
    expect(result.discrepancies.some((item) => pattern.test(item))).toBe(true);
  });

  it("does not treat a completed source ledger as valid for a PENDING commission", async () => {
    currentCommissions = [{ ...commission, status: CommissionStatus.PENDING, settlementBatchId: null }];
    const result = await service.reconcileCommissions(11, 2026);
    expect(result.isClean).toBe(false);
    expect(result.discrepancies).toContain("Commission commission-1 source ledger status mismatch");
  });

  it("does not infer bank transfer from a payout reference containing a driver prefix", async () => {
    currentCommissions = [{ ...commission, status: CommissionStatus.PAID }];
    currentPayouts = [{
      id: "fake-payout-1",
      reference: `PAYOUT-2026-11-${commission.driverId.slice(0, 8)}-unverified`,
      entityId: "another-driver",
      status: "COMPLETED",
      amount: 450,
      netAmount: 450,
      taxAmount: 50,
    }];
    const result = await service.reconcileCommissions(11, 2026);
    expect(result.isClean).toBe(false);
    expect(result.summary.totalPayouts).toBe(1);
    expect(result.discrepancies).toContain(
      "Commission commission-1 marked PAID without verified bank evidence; manual reconciliation required",
    );
  });

  it("flags PAID without verified bank evidence even when payout entity matches driver", async () => {
    currentCommissions = [{ ...commission, status: CommissionStatus.PAID }];
    currentPayouts = [{
      id: "unverified-payout-1",
      reference: "bank-looking-reference",
      entityId: commission.driverId,
      status: "COMPLETED",
      amount: 450,
      netAmount: 450,
      taxAmount: 50,
    }];
    const result = await service.reconcileCommissions(11, 2026);
    expect(result.isClean).toBe(false);
    expect(result.discrepancies.some((item) => item.includes("verified bank evidence"))).toBe(true);
  });

  it("retains missing ledger and unmatched ledger discrepancy checks", async () => {
    currentSourceLedger = [{ ...sourceLedger, reference: "ANOTHER-REFERENCE" }];
    const result = await service.reconcileCommissions(11, 2026);
    expect(result.isClean).toBe(false);
    expect(result.discrepancies.some((item) => item.includes("has no ledger entry"))).toBe(true);
    expect(result.discrepancies.some((item) => item.includes("has no matching commission"))).toBe(true);
  });

  it("retains reporting of APPROVED commissions without settlement batch", async () => {
    currentCommissions = [{ ...commission, settlementBatchId: null }];
    const result = await service.reconcileCommissions(11, 2026);
    expect(result.isClean).toBe(false);
    expect(result.discrepancies).toContain("1 APPROVED commissions not assigned to settlement batch");
  });
});
