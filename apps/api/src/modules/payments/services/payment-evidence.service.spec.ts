import { Test, type TestingModule } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "../../prisma/prisma.module";
import { PrismaService } from "../../prisma/prisma.service";
import { PaymentEvidenceService } from "./payment-evidence.service";

// Tipo de cliente que el servicio consumirá dentro de `$transaction`.
// Repite solamente las propiedades que usa el servicio, para aislar las
// pruebas de la interfaz completa de Prisma.
interface RecordingTx {
  paymentIntent: {
    findUnique: jest.Mock;
    update: jest.Mock;
  };
  paymentEvidence: {
    findFirst: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  humanReviewTask: {
    create: jest.Mock;
    updateMany: jest.Mock;
  };
  paymentVerification: {
    create: jest.Mock;
  };
}

function makeRecordingTx(): RecordingTx {
  return {
    paymentIntent: { findUnique: jest.fn(), update: jest.fn() },
    paymentEvidence: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    humanReviewTask: { create: jest.fn(), updateMany: jest.fn() },
    paymentVerification: { create: jest.fn() },
  };
}

describe("PaymentEvidenceService", () => {
  let service: PaymentEvidenceService;
  let module: TestingModule;
  let prisma: {
    $transaction: jest.Mock;
    paymentIntent: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
    };
    paymentEvidence: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    humanReviewTask: { create: jest.Mock; updateMany: jest.Mock };
    paymentVerification: { create: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn(),
      paymentIntent: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      paymentEvidence: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      humanReviewTask: { create: jest.fn(), updateMany: jest.fn() },
      paymentVerification: { create: jest.fn() },
    };

    const testing = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
        PrismaModule,
      ],
      providers: [PaymentEvidenceService],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();

    service = testing.get<PaymentEvidenceService>(PaymentEvidenceService);
    module = testing;
  });

  afterEach(async () => {
    await module.close();
  });

  const intent = {
    id: "int-1",
    amount: 1000,
    currency: "USD",
    type: "ADVERTISER_CAMPAIGN",
    status: "PENDING",
    leadId: "lead-1",
  };

  const input = {
    paymentIntentId: "int-1",
    fileUrl: "https://f/file.png",
    fileHash: "abc",
    fileSize: 123,
    mimeType: "image/png",
    submittedBy: "op1",
  };

  it("envía evidencia dentro de una única transacción", async () => {
    const tx = makeRecordingTx();
    (tx.paymentIntent.findUnique as jest.Mock).mockResolvedValue(intent);
    (tx.paymentEvidence.findFirst as jest.Mock).mockResolvedValue(null);
    tx.paymentEvidence.create.mockResolvedValue({ id: "ev-1" });
    (tx.humanReviewTask.create as jest.Mock).mockResolvedValue(undefined);
    (tx.paymentIntent.update as jest.Mock).mockResolvedValue(undefined);
    prisma.$transaction.mockImplementation(async (cb) => cb(tx));

    const result = await service.submitEvidence(input);

    expect(result.id).toBe("ev-1");
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.paymentEvidence.create).toHaveBeenCalledTimes(1);
    expect(tx.humanReviewTask.create).toHaveBeenCalledTimes(1);
    expect(tx.paymentIntent.update).toHaveBeenCalledTimes(1);
  });

  it("es idempotente en submitEvidence al encontrar evidencia pendiente", async () => {
    const existing = {
      id: "ev-1",
      paymentIntentId: "int-1",
      reviewStatus: "SUBMITTED",
    };
    const tx = makeRecordingTx();
    (tx.paymentIntent.findUnique as jest.Mock).mockResolvedValue(intent);
    (tx.paymentEvidence.findFirst as jest.Mock).mockResolvedValue(existing);
    (tx.paymentEvidence.update as jest.Mock).mockResolvedValue(existing);
    prisma.$transaction.mockImplementation(async (cb) => cb(tx));

    const result = await service.submitEvidence(input);

    expect(result.id).toBe("ev-1");
    expect(tx.paymentEvidence.create).not.toHaveBeenCalled();
    expect(tx.paymentEvidence.update).toHaveBeenCalledTimes(1);
  });

  it("es idempotente en reviewEvidence al confirmar ya confirmada", async () => {
    const evidence = {
      id: "ev-1",
      paymentIntentId: "int-1",
      reviewStatus: "PAYMENT_CONFIRMED",
      paymentIntent: { id: "int-1", status: "PAID" },
    };
    (prisma.paymentEvidence.findUnique as jest.Mock).mockResolvedValue(
      evidence,
    );

    const result = await service.reviewEvidence({
      evidenceId: "ev-1",
      reviewedBy: "op1",
      status: "PAYMENT_CONFIRMED",
      amountConfirmed: 1000,
    });

    expect(result.reviewStatus).toBe("PAYMENT_CONFIRMED");
    expect(prisma.paymentEvidence.findUnique).toHaveBeenCalledTimes(1);
    expect(prisma.paymentVerification.create).not.toHaveBeenCalled();
    expect(prisma.paymentIntent.update).not.toHaveBeenCalled();
    expect(prisma.humanReviewTask.updateMany).not.toHaveBeenCalled();
  });

  it("es idempotente en reviewEvidence al rechazar ya rechazada", async () => {
    const evidence = {
      id: "ev-1",
      paymentIntentId: "int-1",
      reviewStatus: "REJECTED",
    };
    (prisma.paymentEvidence.findUnique as jest.Mock).mockResolvedValue(
      evidence,
    );

    const result = await service.reviewEvidence({
      evidenceId: "ev-1",
      reviewedBy: "op1",
      status: "REJECTED",
      amountConfirmed: 1000,
    });

    expect(result.reviewStatus).toBe("REJECTED");
    expect(prisma.paymentVerification.create).not.toHaveBeenCalled();
    expect(prisma.paymentIntent.update).not.toHaveBeenCalled();
  });

  it("revisa y confirma dentro de una transacción", async () => {
    const evidence = {
      id: "ev-1",
      paymentIntentId: "int-1",
      reviewStatus: "SUBMITTED",
      paymentIntent: {
        id: "int-1",
        status: "UNDER_REVIEW",
        type: "ADVERTISER_CAMPAIGN",
        amount: 1000,
      },
    };
    const tx = makeRecordingTx();
    (prisma.paymentEvidence.findUnique as jest.Mock).mockResolvedValue(
      evidence,
    );
    (tx.paymentIntent.findUnique as jest.Mock).mockResolvedValue({
      id: "int-1",
      status: "UNDER_REVIEW",
      type: "ADVERTISER_CAMPAIGN",
      amount: 1000,
    });
    (tx.paymentEvidence.update as jest.Mock).mockResolvedValue({
      id: "ev-1",
      reviewStatus: "PAYMENT_CONFIRMED",
      reviewedBy: "op1",
    });
    (tx.humanReviewTask.updateMany as jest.Mock).mockResolvedValue({
      count: 1,
    });
    tx.paymentVerification.create.mockResolvedValue({ id: "pv-1" });
    (tx.paymentIntent.update as jest.Mock).mockResolvedValue(undefined);
    prisma.$transaction.mockImplementation(async (cb) => cb(tx));

    const result = await service.reviewEvidence({
      evidenceId: "ev-1",
      reviewedBy: "op1",
      status: "PAYMENT_CONFIRMED",
      amountConfirmed: 1000,
    });

    expect(result.reviewStatus).toBe("PAYMENT_CONFIRMED");
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.paymentEvidence.update).toHaveBeenCalledTimes(1);
    expect(tx.humanReviewTask.updateMany).toHaveBeenCalledTimes(1);
    expect(tx.paymentVerification.create).toHaveBeenCalledTimes(1);
    expect(tx.paymentIntent.update).toHaveBeenCalledTimes(1);
  });

  it.each(["DRIVER_SUBSCRIPTION", "ADVERTISER_CAMPAIGN"])(
    "keeps %s referral writes inside payment confirmation transaction",
    async (type) => {
      const tx = {
        ...makeRecordingTx(),
        lead: {
          findUnique: jest.fn().mockResolvedValue({
            id: "lead-1",
            referrerId: "driver-1",
            referrerCode: "FIXTURE",
          }),
          update: jest.fn(),
        },
        referralAttribution: {
          findUnique: jest.fn().mockResolvedValue(null),
          create: jest.fn(),
        },
        commission: { create: jest.fn() },
      };
      prisma.paymentEvidence.findUnique.mockResolvedValue({
        id: "ev-1",
        paymentIntentId: "int-1",
        reviewStatus: "SUBMITTED",
      });
      tx.paymentIntent.findUnique.mockResolvedValue({
        ...intent,
        type,
        status: "UNDER_REVIEW",
      });
      tx.paymentEvidence.update.mockResolvedValue({
        id: "ev-1",
        reviewStatus: "PAYMENT_CONFIRMED",
      });
      prisma.$transaction.mockImplementation(async (cb) => cb(tx));

      const review = {
        evidenceId: "ev-1",
        reviewedBy: "op1",
        status: "PAYMENT_CONFIRMED" as const,
      };
      await expect(service.reviewEvidence(review)).resolves.toMatchObject({
        reviewStatus: "PAYMENT_CONFIRMED",
      });
      expect(tx.commission.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          driverId: "driver-1",
          amount: 500,
          status: "PENDING",
          sourceType:
            type === "DRIVER_SUBSCRIPTION"
              ? "DRIVER_REFERRAL"
              : "ADVERTISER_SALE",
        }),
      });
      expect(tx.referralAttribution.create).toHaveBeenCalledTimes(1);
      expect(tx.lead.update).toHaveBeenCalledWith({
        where: { id: "lead-1" },
        data: { status: "CONVERTED" },
      });

      // A downstream write failure must reject the enclosing callback.
      tx.lead.update.mockRejectedValueOnce(new Error("fixture write failure"));
      await expect(service.reviewEvidence(review)).rejects.toThrow(
        "fixture write failure",
      );
      expect(prisma.$transaction).toHaveBeenCalledTimes(2);
    },
  );

  it("revuelve la operación transaccional y queda atómica al éxito en full", async () => {
    const tx = makeRecordingTx();
    (tx.paymentIntent.findUnique as jest.Mock).mockResolvedValue(intent);
    (tx.paymentEvidence.findFirst as jest.Mock).mockResolvedValue(null);
    tx.paymentEvidence.create.mockResolvedValue({ id: "ev-1" });
    (tx.humanReviewTask.create as jest.Mock).mockResolvedValue(undefined);
    prisma.$transaction.mockImplementation(async (cb) => cb(tx));

    const result = await service.submitEvidence(input);

    expect(result.id).toBe("ev-1");
    expect(tx.paymentEvidence.create).toHaveBeenCalledTimes(1);
    expect(tx.humanReviewTask.create).toHaveBeenCalledTimes(1);
    expect(tx.paymentEvidence.findFirst).toHaveBeenCalledTimes(1);
    expect(tx.paymentIntent.update).toHaveBeenCalledTimes(1);
  });

  it("rechaza la operación en la misma transacción al fallar la revisión", async () => {
    const tx = makeRecordingTx();
    (tx.paymentIntent.findUnique as jest.Mock).mockResolvedValue(intent);
    (tx.paymentEvidence.findFirst as jest.Mock).mockResolvedValue(null);
    tx.paymentEvidence.create.mockResolvedValue({ id: "ev-1" });
    (tx.humanReviewTask.create as jest.Mock).mockRejectedValue(
      new Error("rollback gate"),
    );
    prisma.$transaction.mockImplementation(async (cb) => cb(tx));

    await expect(service.submitEvidence(input)).rejects.toThrow(
      "rollback gate",
    );
    expect(tx.humanReviewTask.create).toHaveBeenCalledTimes(1);
    expect(tx.paymentIntent.update).toHaveBeenCalledTimes(0);
  });
});
