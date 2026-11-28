import { ConfigModule } from "@nestjs/config";
import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { PaymentEvidenceService } from "./services/payment-evidence.service";
import type { AuthenticatedRequest } from "../auth/auth.types";
import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";
import { PrismaModule } from "../prisma/prisma.module";
import { PrismaService } from "../prisma/prisma.service";
import { PaymentIntentController } from "./payment-intent.controller";
import {
  CURRENT_PAYMENT_PROVIDER,
  PAYMENT_PROVIDER_FACTORY,
} from "./payment-provider.tokens";
import { PaymentsModule } from "./payments.module";

function requestFor(id: string, role: string): AuthenticatedRequest {
  return { user: { id, role, email: "" } } as AuthenticatedRequest;
}

describe("PaymentIntentController", () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
        PrismaModule,
        PaymentsModule,
      ],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();
  });

  afterEach(async () => {
    await module.close();
  });

  it("resolves provider dependencies without a controller-module import cycle", () => {
    expect(module.get(PaymentIntentController)).toBeInstanceOf(
      PaymentIntentController,
    );
    expect(module.get(PAYMENT_PROVIDER_FACTORY)).toEqual(expect.any(Function));
    expect(module.get(CURRENT_PAYMENT_PROVIDER)).toMatchObject({
      providerType: "MANUAL_TRANSFER",
    });
  });

  describe("ownership (F2)", () => {
    let module: TestingModule;
    let controller: PaymentIntentController;
    let prisma: {
      $transaction: jest.Mock;
      paymentIntent: {
        findUnique: jest.Mock;
        update: jest.Mock;
        updateMany: jest.Mock;
      };
      lead: { findUnique: jest.Mock };
      paymentEvidence: {
        findFirst: jest.Mock;
        create: jest.Mock;
        update: jest.Mock;
      };
      humanReviewTask: { create: jest.Mock };
    };

    beforeEach(async () => {
      prisma = {
        $transaction: jest.fn(),
        paymentIntent: {
          findUnique: jest.fn(),
          update: jest.fn(),
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
        lead: { findUnique: jest.fn() },
        paymentEvidence: {
          findFirst: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
        },
        humanReviewTask: { create: jest.fn() },
      };
      // El PaymentEvidenceService ahora envuelve todo el flujo en
      // prisma.$transaction(async (tx) => {...}). Implementar la transacción
      // para que el callback reciba un registro del mismo prisma y devuelva el
      // resultado de la operación transaccional.
      prisma.$transaction.mockImplementation(async (cb) => {
        const tx = {
          paymentIntent: {
            findUnique: prisma.paymentIntent.findUnique,
            update: prisma.paymentIntent.update,
            updateMany: prisma.paymentIntent.updateMany,
          },
          paymentEvidence: {
            findFirst: prisma.paymentEvidence.findFirst,
            create: prisma.paymentEvidence.create,
            update: prisma.paymentEvidence.update,
          },
          humanReviewTask: { create: prisma.humanReviewTask.create },
        };
        return cb(tx);
      });
      module = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
          PrismaModule,
          PaymentsModule,
        ],
      })
        .overrideProvider(PrismaService)
        .useValue(prisma)
        .compile();
      controller = module.get(PaymentIntentController);
    });

    it.each(["ADVERTISER", "DRIVER", "GUEST", "ADMIN"])(
      "denies %s without an authorized operator identity before database access",
      async (role) => {
        const request = requestFor(role === "ADMIN" ? "" : "user-a", role);
        const payload = { fileUrl: "https://x.test/a.pdf" };
        await expect(
          controller.submitEvidence("pi-1", request, payload),
        ).rejects.toThrow(ForbiddenException);
        await expect(
          controller.getIntentByReference("REF-0001", request),
        ).rejects.toThrow(ForbiddenException);
        await expect(
          controller.createIntent(request, {
            type: "ADVERTISER_CAMPAIGN",
            amount: 1000,
            reference: "REF-0001",
          }),
        ).rejects.toThrow(ForbiddenException);
        expect(prisma.paymentIntent.findUnique).not.toHaveBeenCalled();
        expect(prisma.lead.findUnique).not.toHaveBeenCalled();
        expect(prisma.$transaction).not.toHaveBeenCalled();
      },
    );

    it("allows an ADMIN to look up a payment reference", async () => {
      prisma.paymentIntent.findUnique.mockResolvedValue({
        id: "pi-1",
        reference: "REF-0001",
        status: "PENDING",
      });
      const result = await controller.getIntentByReference(
        "REF-0001",
        requestFor("admin", "ADMIN"),
      );
      expect(result).toHaveProperty("id", "pi-1");
    });

    it("allows an ADMIN to replay an existing payment intent", async () => {
      prisma.paymentIntent.findUnique.mockResolvedValue({
        id: "pi-1",
        reference: "REF-0001",
        status: "PENDING",
        leadId: null,
      });
      const result = await controller.createIntent(
        requestFor("admin", "ADMIN"),
        {
          type: "ADVERTISER_CAMPAIGN",
          amount: 1000,
          reference: "REF-0001",
        },
      );
      expect(result).toMatchObject({ id: "pi-1", idempotencyReplay: true });
    });

    it.each([undefined, "not-a-date", "2026-01-01T00:00:00Z"])(
      "rejects missing or noncanonical review version %s",
      async (expectedSubmittedAt) => {
        const service = module.get(PaymentEvidenceService);
        const review = jest.spyOn(service, "reviewEvidence");
        await expect(
          controller.reviewEvidence("ev-1", requestFor("admin", "ADMIN"), {
            status: "PAYMENT_CONFIRMED",
            expectedSubmittedAt,
          }),
        ).rejects.toThrow(BadRequestException);
        expect(review).not.toHaveBeenCalled();
      },
    );

    it("forwards the exact displayed version and authenticated reviewer", async () => {
      const service = module.get(PaymentEvidenceService);
      const review = jest
        .spyOn(service, "reviewEvidence")
        .mockRejectedValue(new Error("fixture stop"));
      await expect(
        controller.reviewEvidence("ev-1", requestFor("admin", "ADMIN"), {
          status: "PAYMENT_CONFIRMED",
          expectedSubmittedAt: "2026-01-01T00:00:00.123Z",
        }),
      ).rejects.toThrow("fixture stop");
      expect(review).toHaveBeenCalledWith({
        evidenceId: "ev-1",
        expectedSubmittedAt: new Date("2026-01-01T00:00:00.123Z"),
        reviewedBy: "admin",
        status: "PAYMENT_CONFIRMED",
        reviewNote: undefined,
        amountConfirmed: undefined,
      });
    });

    it("allows an ADMIN to attach evidence on any intent", async () => {
      prisma.paymentIntent.findUnique.mockReturnValue({
        id: "pi-4",
        type: "DRIVER_SUBSCRIPTION",
        amount: 800,
        currency: "DOP",
        reference: "REF-0004",
        status: "PENDING",
        leadId: "lead-2",
      });
      prisma.lead.findUnique.mockReturnValue({ id: "lead-2", type: "DRIVER" });
      prisma.paymentEvidence.findFirst.mockReturnValue(null);
      prisma.paymentEvidence.create.mockReturnValue({ id: "ev-4" });

      const request = requestFor("admin", "ADMIN");
      const payload = { fileUrl: "https://x.test/d.pdf" };
      const result = await controller.submitEvidence("pi-4", request, payload);
      expect(result).toHaveProperty("id", "ev-4");
    });
  });
});
