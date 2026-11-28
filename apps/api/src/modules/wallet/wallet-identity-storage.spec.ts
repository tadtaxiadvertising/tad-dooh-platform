import { WalletService } from "./wallet.service";

describe("wallet canonical driver identity", () => {
  it("locks, debits and verifies the same TEXT driver wallet without using its legacy UUID", async () => {
    const driverId = "driver-with-text-key";
    let balance = 12000;
    const queries: string[] = [];
    const tx = {
      $queryRaw: jest.fn(async (parts: TemplateStringsArray, key: string) => {
        const sql = parts.join("?");
        queries.push(sql);
        if (!sql.includes("driver_id_text_217") || key !== driverId) return [];
        return [
          {
            id: "wallet-fixture",
            available_balance: balance,
            bank_info: { fixture: true },
          },
        ];
      }),
      $executeRaw: jest.fn(
        async (parts: TemplateStringsArray, amount: number, key: string) => {
          const sql = parts.join("?");
          if (!sql.includes("driver_id_text_217") || key !== driverId) return 0;
          balance -= amount;
          return 1;
        },
      ),
      driver: { findUnique: jest.fn().mockResolvedValue({ id: driverId }) },
      wallet: { create: jest.fn() },
      financialTransaction: {
        create: jest
          .fn()
          .mockResolvedValue({ id: "tx-fixture", reference: "SYNTHETIC" }),
      },
    };
    const transaction = jest.fn();
    transaction.mockImplementation(async (run) => run(tx));
    const service = new WalletService({ $transaction: transaction } as never);
    await expect(service.withdraw(driverId, 5000)).resolves.toMatchObject({
      success: true,
      newBalance: 7000,
    });
    expect(balance).toBe(7000);
    expect(queries[0]).toContain("FOR UPDATE");
    expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
    expect(tx.financialTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          entityId: driverId,
          amount: 5000,
          status: "PENDING",
        }),
      }),
    );
    expect(transaction.mock.calls[0][1]).toEqual({
      isolationLevel: "ReadCommitted",
      timeout: 10000,
    });
  });
});
