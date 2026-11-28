import { ConflictException, ServiceUnavailableException } from "@nestjs/common";
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
  const config = new ConfigService({
    TAD_BANK_ACCOUNT: account,
    TAD_BANK_ACCOUNT_NAME: "Synthetic account holder",
  });
  return new ManualTransferProvider(config);
}

describe("ManualTransferProvider", () => {
  it.each(["", "   ", "XXXXXXXXXX", "000000", "123abc"])(
    "rejects invalid account configuration (%j)",
    async (account) => {
      const adapter = provider(account);
      const creation = adapter.createPaymentIntent(input);
      await expect(creation).rejects.toThrow(ServiceUnavailableException);
      const health = await adapter.healthCheck();
      expect(health).toEqual({
        healthy: false,
        error: "Manual transfer account configuration is unavailable",
      });
    },
  );

  it("uses the configured account without initialize", async () => {
    const adapter = provider("123456789");
    const result = await adapter.createPaymentIntent(input);
    expect(result.status).toBe("CREATED");
    expect(result.id).toBe(input.reference);
    expect(result.paymentInstructions).toContain("123456789");
    expect(result.paymentInstructions).toContain("Synthetic account holder");
    expect(result.paymentInstructions).not.toContain("XXXXXXXXXX");
    const health = await adapter.healthCheck();
    expect(health).toMatchObject({ healthy: true });
  });

  it("rejects a mismatched currency", async () => {
    const adapter = provider("123456789");
    const usd = { ...input, currency: "USD" };
    const creation = adapter.createPaymentIntent(usd);
    await expect(creation).rejects.toThrow(ConflictException);
  });

  it("refuses unsupported financial operations", async () => {
    const adapter = provider("123456789");
    const reference = input.reference;
    const status = adapter.getPaymentIntentStatus(reference);
    await expect(status).rejects.toThrow(ConflictException);
    const verification = adapter.verifyPayment(reference);
    await expect(verification).rejects.toThrow(ConflictException);
    const webhook = adapter.processWebhook({ reference, amount: 1000 });
    await expect(webhook).rejects.toThrow(ConflictException);
    const refund = adapter.refundPayment(reference, 1000);
    await expect(refund).rejects.toThrow(ConflictException);
    const reconciliation = adapter.reconcileDaily(new Date());
    await expect(reconciliation).rejects.toThrow(ConflictException);
  });
});
