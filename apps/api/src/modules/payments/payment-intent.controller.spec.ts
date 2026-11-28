import { ConfigModule } from "@nestjs/config";
import { ForbiddenException } from "@nestjs/common";
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
      paymentIntent: { findUnique: jest.Mock; update: jest.Mock };
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
        paymentIntent: { findUnique: jest.fn(), update: jest.fn() },
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

    it("denies a cross-entity submission (advertiser → driver-owned intent)", async () => {
      prisma.paymentIntent.findUnique.mockReturnValue({
        id: "pi-1",
        type: "ADVERTISER_CAMPAIGN",
        amount: 1000,
        currency: "DOP",
        reference: "REF-0001",
        status: "PENDING",
        leadId: "lead-99",
      });
      prisma.lead.findUnique.mockReturnValue({ id: "lead-99", type: "DRIVER" });

      await expect(
        controller.submitEvidence(
          "pi-1",
          requestFor("user-a", "ADVERTISER"),
          { fileUrl: "https://x.test/a.pdf" },
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(prisma.paymentIntent.findUnique).toHaveBeenCalledWith({
        where: { id: "pi-1" },
      });
      expect(prisma.lead.findUnique).toHaveBeenCalledWith({
        where: { id: "lead-99" },
      });
    });

    it("denies a non-admin ownership-less intent (deny by default)", async () => {
      prisma.paymentIntent.findUnique.mockReturnValue({
        id: "pi-2",
        type: "DRIVER_SUBSCRIPTION",
        amount: 500,
        currency: "DOP",
        reference: "REF-0002",
        status: "PENDING",
        leadId: null,
      });

      await expect(
        controller.submitEvidence(
          "pi-2",
          requestFor("user-b", "ADVERTISER"),
          { fileUrl: "https://x.test/b.pdf" },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it("allows an advertiser to submit on their own advertiser-owned intent", async () => {
      prisma.paymentIntent.findUnique.mockReturnValue({
        id: "pi-3",
        type: "ADVERTISER_CAMPAIGN",
        amount: 1000,
        currency: "DOP",
        reference: "REF-0003",
        status: "PENDING",
        leadId: "lead-1",
      });
      prisma.lead.findUnique.mockReturnValue({
        id: "lead-1",
        type: "ADVERTISER",
      });
      prisma.paymentEvidence.findFirst.mockReturnValue(null);
      prisma.paymentEvidence.create.mockReturnValue({ id: "ev-3" });
      prisma.paymentIntent.update.mockReturnValue({
        id: "pi-3",
        status: "UNDER_REVIEW",
      });
      prisma.paymentIntent.findUnique.mockReturnValueOnce({
        id: "pi-3",
        type: "ADVERTISER_CAMPAIGN",
        amount: 1000,
        currency: "DOP",
        reference: "REF-0003",
        status: "UNDER_REVIEW",
        leadId: "lead-1",
      });

      const result = await controller.submitEvidence(
        "pi-3",
        requestFor("user-x", "ADVERTISER"),
        { fileUrl: "https://x.test/c.pdf" },
      );
      expect(result).toHaveProperty("id", "ev-3");
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

      const result = await controller.submitEvidence(
        "pi-4",
        requestFor("admin", "ADMIN"),
        { fileUrl: "https://x.test/d.pdf" },
      );
      expect(result).toHaveProperty("id", "ev-4");
    });
  });
});
