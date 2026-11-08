import type {
  Prisma,
  Driver,
  Commission,
  FinancialTransaction,
  Wallet,
  Advertiser,
} from "@prisma/client";
interface ReferralPrismaMock {
  driver: {
    findUnique: jest.Mock<
      Promise<Partial<Driver> | null>,
      [Prisma.DriverFindUniqueArgs?]
    >;
    findMany: jest.Mock<
      Promise<Partial<Driver>[]>,
      [Prisma.DriverFindManyArgs?]
    >;
    count: jest.Mock<Promise<number>, [Prisma.DriverCountArgs?]>;
  };
  commission: {
    aggregate: jest.Mock<
      Promise<Prisma.GetCommissionAggregateType<{ _sum: { amount: true } }>>,
      [Prisma.CommissionAggregateArgs?]
    >;
    findFirst: jest.Mock<
      Promise<Partial<Commission> | null>,
      [Prisma.CommissionFindFirstArgs?]
    >;
    create: jest.Mock<
      Promise<Partial<Commission>>,
      [Prisma.CommissionCreateArgs?]
    >;
  };
  financialTransaction: {
    upsert: jest.Mock<
      Promise<Partial<FinancialTransaction>>,
      [Prisma.FinancialTransactionUpsertArgs?]
    >;
  };
  wallet: {
    upsert: jest.Mock<Promise<Partial<Wallet>>, [Prisma.WalletUpsertArgs?]>;
  };
  advertiser: {
    findMany: jest.Mock<
      Promise<Partial<Advertiser>[]>,
      [Prisma.AdvertiserFindManyArgs?]
    >;
  };
  $transaction: jest.Mock<
    Promise<unknown>,
    [(tx: ReferralPrismaMock) => Promise<unknown>]
  >;
}
import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";
import { ReferralService } from "./referral.service";
import { PrismaService } from "../prisma/prisma.service";
import { BUSINESS_RULES } from "../../common/constants/business-rules";

describe("ReferralService", () => {
  let service: ReferralService;
  let prisma: ReferralPrismaMock;

  beforeEach(async () => {
    prisma = {
      driver: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      commission: {
        aggregate: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      financialTransaction: {
        upsert: jest.fn(),
      },
      wallet: {
        upsert: jest.fn(),
      },
      advertiser: {
        findMany: jest.fn(),
      },
      $transaction: jest.fn(
        (callback: (tx: ReferralPrismaMock) => Promise<unknown>) =>
          callback(prisma),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReferralService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ReferralService>(ReferralService);
  });

  describe("awardDriverReferralBonus", () => {
    it("should reject self-referral", async () => {
      const driverId = "driver-123";
      await service.awardDriverReferralBonus(
        driverId,
        driverId,
        "ONBOARDING_COMPLETE",
      );

      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(prisma.commission.create).not.toHaveBeenCalled();
    });

    it("should create bonus commission and transaction if not existing", async () => {
      const driverId = "driver-123";
      const referredDriverId = "driver-456";
      const milestone = "ONBOARDING_COMPLETE";

      prisma.commission.findFirst.mockResolvedValue(null);

      await service.awardDriverReferralBonus(
        driverId,
        referredDriverId,
        milestone,
      );

      expect(prisma.commission.findFirst).toHaveBeenCalledWith({
        where: {
          driverId,
          sourceType: "DRIVER_REFERRAL",
          reference: `REF-DRIVER-${referredDriverId.substring(0, 8)}-${milestone}`,
        },
      });

      expect(prisma.commission.create).toHaveBeenCalledWith({
        data: {
          driverId,
          amount: BUSINESS_RULES.DRIVER_REFERRAL_BONUS_RD,
          sourceType: "DRIVER_REFERRAL",
          status: "APPROVED",
          reference: `REF-DRIVER-${referredDriverId.substring(0, 8)}-${milestone}`,
          metadata: { referredDriverId, milestone },
        },
      });

      expect(prisma.financialTransaction.upsert).toHaveBeenCalled();
      expect(prisma.wallet.upsert).toHaveBeenCalled();
    });

    it("should be idempotent and skip if commission already exists", async () => {
      const driverId = "driver-123";
      const referredDriverId = "driver-456";
      const milestone = "ONBOARDING_COMPLETE";

      prisma.commission.findFirst.mockResolvedValue({ id: "comm-1" });

      await service.awardDriverReferralBonus(
        driverId,
        referredDriverId,
        milestone,
      );

      expect(prisma.commission.create).not.toHaveBeenCalled();
      expect(prisma.financialTransaction.upsert).not.toHaveBeenCalled();
      expect(prisma.wallet.upsert).not.toHaveBeenCalled();
    });
  });

  describe("awardAdvertiserReferralBonus", () => {
    it("should be idempotent and skip if commission already exists", async () => {
      const driverId = "driver-123";
      const advertiserId = "adv-789";
      const campaignId = "camp-999";

      prisma.commission.findFirst.mockResolvedValue({ id: "comm-2" });

      await service.awardAdvertiserReferralBonus(
        driverId,
        advertiserId,
        campaignId,
      );

      expect(prisma.commission.create).not.toHaveBeenCalled();
      expect(prisma.financialTransaction.upsert).not.toHaveBeenCalled();
      expect(prisma.wallet.upsert).not.toHaveBeenCalled();
    });
  });
});
