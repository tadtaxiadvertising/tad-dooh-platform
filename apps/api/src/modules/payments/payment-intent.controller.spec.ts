import { ConfigModule } from "@nestjs/config";
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
});
