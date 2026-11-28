import { WalletService } from "./wallet.service";
import type { PrismaService } from "../prisma/prisma.service";

type Row = {
  id: string;
  type: string;
  category: string;
  status: string;
  entityId: string | null;
  amount: number;
  note?: string;
};

function gate() {
  let open!: () => void;
  const promise = new Promise<void>((resolve) => {
    open = resolve;
  });
  return { promise, open };
}

// Simulates the relevant READ COMMITTED predicate recheck and rollback.
// This does not replace an integration test on two PostgreSQL connections.
function fixture(
  participants: number,
  options: {
    walletCount?: number;
    creditThrows?: boolean;
    row?: Partial<Row>;
  } = {},
) {
  let row: Row = {
    id: "synthetic-withdrawal",
    type: "WITHDRAWAL",
    category: "DRIVER_PAYOUT",
    status: "PENDING",
    entityId: "synthetic-driver",
    amount: 5000,
    ...options.row,
  };
  let balance = 1000;
  let credits = 0;
  let claims = 0;
  let arrivals = 0;
  let next = 0;
  const barrier = gate();
  const turns = Array.from({ length: participants }, gate);
  turns[0].open();

  const prisma = {
    $transaction: async <T>(callback: (tx: unknown) => Promise<T>) => {
      const i = next++;
      const initial = { ...row };
      let first = true;
      let pending: Row | undefined;
      let delta = 0;
      const tx = {
        financialTransaction: {
          findUnique: async () => {
            if (first) {
              first = false;
              if (++arrivals === participants) barrier.open();
              await barrier.promise;
              await turns[i].promise;
              return { ...initial };
            }
            return { ...row };
          },
          updateMany: async ({
            where,
            data,
          }: {
            where: Partial<Row>;
            data: Partial<Row>;
          }) => {
            const matches = Object.entries(where).every(
              ([key, value]) => row[key as keyof Row] === value,
            );
            if (!matches) return { count: 0 };
            pending = { ...row, ...data };
            return { count: 1 };
          },
        },
        $executeRaw: async (
          _sql: TemplateStringsArray,
          amount: number,
          driverId: string,
        ) => {
          if (options.creditThrows) throw new Error("synthetic credit failure");
          if (driverId !== row.entityId) throw new Error("wrong wallet");
          const count = options.walletCount ?? 1;
          delta = amount * count;
          return count;
        },
      };
      try {
        const result = await callback(tx);
        if (pending) {
          row = pending;
          claims++;
        }
        if (delta !== 0) {
          balance += delta;
          credits++;
        }
        return result;
      } finally {
        turns[i + 1]?.open();
      }
    },
  };
  return {
    service: new WalletService(prisma as unknown as PrismaService),
    state: () => ({ status: row.status, balance, credits, claims }),
  };
}

describe("WalletService terminal withdrawal decisions (#563)", () => {
  const id = "synthetic-withdrawal";

  it("credits a concurrent duplicate rejection exactly once", async () => {
    const { service, state } = fixture(2);
    const results = await Promise.all([
      service.refundFailedWithdrawal(id),
      service.refundFailedWithdrawal(id),
    ]);
    expect(results.map((result) => result.idempotent)).toEqual([false, true]);
    expect(state()).toEqual({
      status: "FAILED",
      balance: 6000,
      credits: 1,
      claims: 1,
    });
  });

  it("claims a concurrent duplicate confirmation exactly once", async () => {
    const { service, state } = fixture(2);
    const results = await Promise.all([
      service.confirmWithdrawal(id),
      service.confirmWithdrawal(id),
    ]);
    expect(results.map((result) => result.idempotent)).toEqual([false, true]);
    expect(state()).toEqual({
      status: "COMPLETED",
      balance: 1000,
      credits: 0,
      claims: 1,
    });
  });

  it.each(["confirm-first", "reject-first"])(
    "rejects the incompatible concurrent decision (%s)",
    async (order) => {
      const { service, state } = fixture(2);
      const results = await Promise.allSettled(
        order === "confirm-first"
          ? [service.confirmWithdrawal(id), service.refundFailedWithdrawal(id)]
          : [service.refundFailedWithdrawal(id), service.confirmWithdrawal(id)],
      );
      expect(results.map((result) => result.status)).toEqual([
        "fulfilled",
        "rejected",
      ]);
      const refunded = order === "reject-first";
      expect(state()).toEqual({
        status: refunded ? "FAILED" : "COMPLETED",
        balance: refunded ? 6000 : 1000,
        credits: refunded ? 1 : 0,
        claims: 1,
      });
    },
  );

  it.each([0, 2])(
    "rolls back when the credit affects %i wallets",
    async (walletCount) => {
      const { service, state } = fixture(1, { walletCount });
      await expect(service.refundFailedWithdrawal(id)).rejects.toThrow();
      expect(state()).toEqual({
        status: "PENDING",
        balance: 1000,
        credits: 0,
        claims: 0,
      });
    },
  );

  it("rolls back when the credit fails", async () => {
    const { service, state } = fixture(1, { creditThrows: true });
    await expect(service.refundFailedWithdrawal(id)).rejects.toThrow();
    expect(state()).toEqual({
      status: "PENDING",
      balance: 1000,
      credits: 0,
      claims: 0,
    });
  });

  it("does not credit a missing driver identity", async () => {
    const { service, state } = fixture(1, { row: { entityId: null } });
    await expect(service.refundFailedWithdrawal(id)).rejects.toThrow();
    expect(state()).toEqual({
      status: "PENDING",
      balance: 1000,
      credits: 0,
      claims: 0,
    });
  });

  it("does not accept an invalid stored amount", async () => {
    const { service, state } = fixture(1, { row: { amount: -1 } });
    await expect(service.refundFailedWithdrawal(id)).rejects.toThrow();
    expect(state()).toEqual({
      status: "PENDING",
      balance: 1000,
      credits: 0,
      claims: 0,
    });
  });

  it("does not change a non-withdrawal transaction", async () => {
    const { service, state } = fixture(1, { row: { type: "INCOMING" } });
    await expect(service.confirmWithdrawal(id)).rejects.toThrow();
    expect(state()).toEqual({
      status: "PENDING",
      balance: 1000,
      credits: 0,
      claims: 0,
    });
  });
});
