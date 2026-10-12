import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { Test, TestingModule } from "@nestjs/testing";
import { ReferralService } from "./referral.service";
import { PrismaService } from "../prisma/prisma.service";
import { BUSINESS_RULES } from "../../common/constants/business-rules";

describe("ReferralService", () => {
  let service: ReferralService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      driver: {
        findUnique: jest.fn<any>(),
        findMany: jest.fn<any>(),
        count: jest.fn<any>(),
      },
      commission: {
        aggregate: jest.fn<any>(),
        findFirst: jest.fn<any>(),
        create: jest.fn<any>(),
      },
      financialTransaction: {
        upsert: jest.fn<any>(),
      },
      wallet: {
        upsert: jest.fn<any>(),
      },
      advertiser: {
        findMany: jest.fn<any>(),
      },
      $transaction: jest.fn<any>((callback: any) => callback(prisma)),
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
      await service.awardDriverReferralBonus(driverId, driverId, "ONBOARDING_COMPLETE");

      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(prisma.commission.create).not.toHaveBeenCalled();
    });

    it("should create bonus commission and transaction if not existing", async () => {
      const driverId = "driver-123";
      const referredDriverId = "driver-456";
      const milestone = "ONBOARDING_COMPLETE";

      prisma.commission.findFirst.mockResolvedValue(null);

      await service.awardDriverReferralBonus(driverId, referredDriverId, milestone);

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

      await service.awardDriverReferralBonus(driverId, referredDriverId, milestone);

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

      await service.awardAdvertiserReferralBonus(driverId, advertiserId, campaignId);

      expect(prisma.commission.create).not.toHaveBeenCalled();
      expect(prisma.financialTransaction.upsert).not.toHaveBeenCalled();
      expect(prisma.wallet.upsert).not.toHaveBeenCalled();
    });
  });
});
