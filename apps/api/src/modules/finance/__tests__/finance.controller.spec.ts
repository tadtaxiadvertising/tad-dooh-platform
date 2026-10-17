import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";
import { InternalServerErrorException } from "@nestjs/common";
import { FinanceController } from "../finance.controller";
import { FinanceService } from "../finance.service";
import { InvoiceService } from "../invoice.service";
import { WhatsAppService } from "../../notifications/whatsapp.service";
import { EmailService } from "../../notifications/email.service";
import { PrismaService } from "../../prisma/prisma.service";
import { AdvertiserBillingService } from "../../advertisers/advertiser-billing.service";

describe("FinanceController Security & Error Handling", () => {
  let controller: FinanceController;
  let advertiserBillingServiceMock: any;

  beforeEach(async () => {
    advertiserBillingServiceMock = {
      billSubscriptionNow: jest.fn(),
      generateProformaInvoice: jest.fn(),
      confirmProformaInvoice: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FinanceController],
      providers: [
        { provide: FinanceService, useValue: {} },
        { provide: InvoiceService, useValue: {} },
        { provide: WhatsAppService, useValue: {} },
        { provide: EmailService, useValue: {} },
        { provide: PrismaService, useValue: {} },
        {
          provide: AdvertiserBillingService,
          useValue: advertiserBillingServiceMock,
        },
      ],
    }).compile();

    controller = module.get<FinanceController>(FinanceController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("billSubscriptionNow", () => {
    it("should catch internal error and rethrow generic InternalServerErrorException without leaking err.message", async () => {
      const secretErrorMessage = "Postgres error: FATAL connection timeout at 10.0.4.12:5432 secret_db_pass";
      advertiserBillingServiceMock.billSubscriptionNow.mockRejectedValue(
        new Error(secretErrorMessage),
      );

      await expect(
        controller.billSubscriptionNow("sub-123"),
      ).rejects.toThrow(InternalServerErrorException);

      try {
        await controller.billSubscriptionNow("sub-123");
      } catch (err: any) {
        expect(err.message).not.toContain("secret_db_pass");
        expect(err.message).not.toContain("10.0.4.12");
        expect(err.message).toBe("Error al facturar la suscripción.");
      }
    });
  });

  describe("generateProforma", () => {
    it("should catch internal error and rethrow generic InternalServerErrorException without leaking err.message", async () => {
      const secretErrorMessage = "PrismaClientKnownRequestError: Table 'billing_secrets' does not exist";
      advertiserBillingServiceMock.generateProformaInvoice.mockRejectedValue(
        new Error(secretErrorMessage),
      );

      const proformaDto = {
        advertiserId: "adv-1",
        numberOfScreens: 5,
        monthlyRate: 1500,
      };

      await expect(
        controller.generateProforma(proformaDto),
      ).rejects.toThrow(InternalServerErrorException);

      try {
        await controller.generateProforma(proformaDto);
      } catch (err: any) {
        expect(err.message).not.toContain("billing_secrets");
        expect(err.message).toBe("Error al generar la proforma.");
      }
    });
  });

  describe("confirmProforma", () => {
    it("should catch internal error and rethrow generic InternalServerErrorException without leaking err.message", async () => {
      const secretErrorMessage = "Uncaught SyntaxError in query execution at /app/dist/secret-path.js";
      advertiserBillingServiceMock.confirmProformaInvoice.mockRejectedValue(
        new Error(secretErrorMessage),
      );

      await expect(
        controller.confirmProforma("inv-999"),
      ).rejects.toThrow(InternalServerErrorException);

      try {
        await controller.confirmProforma("inv-999");
      } catch (err: any) {
        expect(err.message).not.toContain("secret-path");
        expect(err.message).toBe("Error al confirmar la proforma.");
      }
    });
  });
});
