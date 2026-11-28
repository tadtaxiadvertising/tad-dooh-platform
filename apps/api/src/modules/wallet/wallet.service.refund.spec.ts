import { BadRequestException } from "@nestjs/common";
import { WalletService } from "./wallet.service";

describe("WalletService - idempotencia de reembolso de retiro (F3)", () => {
  let service: WalletService;
  let currentTransactions: any[];

  beforeEach(() => {
    currentTransactions = [];
  });

  function createPrismaService() {
    // Una sola transacción (el mismo retiro es la víctima de la carrera).
    // Se posiciona aquí antes de crear el servicio, para que el test
    // pueda configurar los mocks ANTES de invocar al servicio.
    const tx = {
      financialTransaction: {
        findUnique: jest.fn(),
        updateMany: jest.fn(),
        update: jest.fn(),
      },
      $executeRaw: jest.fn().mockResolvedValue(1),
    };
    currentTransactions.push(tx);
    return {
      $transaction: jest.fn(async (callback) => {
        return callback(tx);
      }),
    } as unknown as WalletService["prisma"];
  }

  beforeEach(async () => {
    currentTransactions = [];
    const prismaService = createPrismaService();
    service = new WalletService(prismaService as any);
  });

  it("solo reembolsa una sola vez sobre dos solicitudes concurrentes", async () => {
    const pending: any = {
      id: "tx-1",
      type: "WITHDRAWAL",
      category: "DRIVER_PAYOUT",
      amount: 5000,
      entityId: "driver-1",
      status: "PENDING",
    };

    const tx = currentTransactions[0];

    // La condición de carrera del audit F3: ambas vistas PENDING.
    // El guardia atómico (updateMany WHERE status=PENDING) deja pasar la
    // primera y devuelve count=0 a la segunda (idempotente).
    tx.financialTransaction.findUnique
      .mockResolvedValueOnce(pending)
      .mockResolvedValueOnce(pending)
      .mockResolvedValueOnce({ ...pending, status: "FAILED" });
    tx.financialTransaction.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });

    const results = await Promise.all([
      service.refundFailedWithdrawal("tx-1", "fallo bancario"),
      service.refundFailedWithdrawal("tx-1", "fallo bancario"),
    ]);

    // Solo la primera petición abona el balance; la segunda es idempotente.
    expect(results.map((result) => result.idempotent).sort()).toEqual([
      false,
      true,
    ]);
    expect(tx.financialTransaction.findUnique).toHaveBeenCalledTimes(3);
    expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
    expect(tx.financialTransaction.updateMany).toHaveBeenCalledTimes(2);
    expect(tx.financialTransaction.updateMany).toHaveBeenCalledWith({
      where: {
        id: "tx-1",
        type: "WITHDRAWAL",
        status: "PENDING",
        category: "DRIVER_PAYOUT",
        entityId: "driver-1",
        amount: 5000,
      },
      data: { status: "FAILED", note: expect.stringContaining("fallo") },
    });
  });

  it("retorna idempotente al reítere sobre una transacción ya FAILED", async () => {
    const tx = currentTransactions[0];
    tx.financialTransaction.updateMany.mockResolvedValue({ count: 1 });
    tx.financialTransaction.findUnique.mockResolvedValue({
      id: "tx-1",
      type: "WITHDRAWAL",
      amount: 3000,
      entityId: "driver-2",
      status: "FAILED",
    });

    const result = await service.refundFailedWithdrawal("tx-1");
    expect(result.idempotent).toBe(true);
    expect(result.status).toBe("FAILED");
    expect(tx.financialTransaction.updateMany).not.toHaveBeenCalled();
    expect(tx.$executeRaw).not.toHaveBeenCalled();
  });

  it("rechaza cuando la transacción no pertenece a un retiro", async () => {
    const tx = currentTransactions[0];
    tx.financialTransaction.updateMany.mockResolvedValue({ count: 1 });
    tx.financialTransaction.findUnique.mockResolvedValue({
      id: "tx-1",
      type: "PAYMENT",
      amount: 5000,
      entityId: null,
      status: "PENDING",
    });

    await expect(service.refundFailedWithdrawal("tx-1")).rejects.toThrow(
      BadRequestException,
    );
  });
});
