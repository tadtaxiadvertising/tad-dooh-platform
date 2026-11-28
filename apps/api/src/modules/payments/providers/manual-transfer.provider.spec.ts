import {
  ConflictException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ManualTransferProvider } from "./manual-transfer.provider";

const input = {
  type: "DRIVER_SUBSCRIPTION" as const,
  amount: 1000,
  currency: "DOP",
  reference: "FIXTURE-REFERENCE",
  idempotencyKey: "fixture-key",
};

function provider(account: string) {
  return new ManualTransferProvider(
    new ConfigService({
      TAD_BANK_ACCOUNT: account,
      TAD_BANK_ACCOUNT_NAME: "Synthetic account holder",
    }),
  );
}

describe("ManualTransferProvider", () => {
  it.each(["", "   ", "XXXXXXXXXX", "000000", "123abc"])(
    "refuses unavailable or placeholder account configuration (%j)",
    async (account) => {
      const adapter = provider(account);
      await expect(adapter.createPaymentIntent(input)).rejects.toThrow(
        ServiceUnavailableException,
      );
      await expect(adapter.healthCheck()).resolves.toEqual({
        healthy: false,
        error: "Manual transfer account configuration is unavailable",
      });
    },
  );

  it("uses configured account without requiring initialize", async () => {
    const adapter = provider("123456789");
    const result = await adapter.createPaymentIntent(input);
    expect(result.status).toBe("CREATED");
    expect(result.id).toBe(input.reference);
    expect(result.paymentInstructions).toContain("123456789");
    expect(result.paymentInstructions).toContain("Synthetic account holder");
    expect(result.paymentInstructions).not.toContain("XXXXXXXXXX");
    await expect(adapter.healthCheck()).resolves.toMatchObject({
      healthy: true,
    });
  });

  it("rejects currency mismatched to the manual bank account", async () => {
    await expect(
      provider("123456789").createPaymentIntent({ ...input, currency: "USD" }),
    ).rejects.toThrow(ConflictException);
  });

  it("refuses unsupported financial operations", async () => {
    const adapter = provider("123456789");
    const reference = input.reference;
    await expect(adapter.getPaymentIntentStatus(reference)).rejects.toThrow(
      ConflictException,
    );
    await expect(adapter.verifyPayment(input.reference)).rejects.toThrow(
      ConflictException,
    );
    await expect(
      adapter.processWebhook({ reference: input.reference, amount: 1000 }),
    ).rejects.toThrow(ConflictException);
    await expect(adapter.refundPayment(reference, 1000)).rejects.toThrow(
      ConflictException,
    );
    await expect(adapter.reconcileDaily(new Date())).rejects.toThrow(
      ConflictException,
    );
  });
});
