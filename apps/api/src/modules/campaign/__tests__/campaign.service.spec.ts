import { describe, beforeEach, afterEach, it, expect, jest } from "@jest/globals";
import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { CampaignService } from "../campaign.service";
import { PrismaService } from "../../prisma/prisma.service";
import { SupabaseService } from "../../supabase/supabase.service";
import { NotificationsService } from "../../notifications/notifications.service";
import { ReferralService } from "../../referral/referral.service";

describe("CampaignService — 15-Slot Limit & Advisory Locking", () => {
  let service: CampaignService;
  let prismaService: any;
  let txMock: any;

  beforeEach(async () => {
    txMock = {
      $executeRaw: jest.fn<any>().mockResolvedValue(1),
      deviceCampaign: {
        count: jest.fn<any>(),
        create: jest.fn<any>(),
      },
    };

    prismaService = {
      $transaction: jest.fn<any>(async (cb: any) => cb(txMock)),
      device: {
        findMany: jest.fn<any>(),
      },
      campaign: {
        count: jest.fn<any>(),
        create: jest.fn<any>(),
      },
    };

    const supabaseService = {
      broadcastEvent: jest.fn<any>().mockResolvedValue(true),
    };

    const notificationsService = {
      sendDriverNotification: jest.fn<any>().mockResolvedValue(true),
    };

    const referralService = {
      awardAdvertiserReferralBonus: jest.fn<any>().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CampaignService,
        { provide: PrismaService, useValue: prismaService },
        { provide: SupabaseService, useValue: supabaseService },
        { provide: NotificationsService, useValue: notificationsService },
        { provide: ReferralService, useValue: referralService },
      ],
    }).compile();

    service = module.get<CampaignService>(CampaignService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("assignCampaignToDevice", () => {
    it("should acquire pg_advisory_xact_lock and assign campaign when device has < 15 campaigns", async () => {
      txMock.deviceCampaign.count.mockResolvedValue(5);
      txMock.deviceCampaign.create.mockResolvedValue({
        device_id: "DEV-1",
        campaign_id: "CAMP-1",
      });

      const result = await service.assignCampaignToDevice("DEV-1", "CAMP-1");

      expect(prismaService.$transaction).toHaveBeenCalled();
      expect(txMock.$executeRaw).toHaveBeenCalled();
      expect(txMock.deviceCampaign.count).toHaveBeenCalledWith({
        where: { device_id: "DEV-1" },
      });
      expect(txMock.deviceCampaign.create).toHaveBeenCalledWith({
        data: { device_id: "DEV-1", campaign_id: "CAMP-1" },
      });
      expect(result).toEqual({
        device_id: "DEV-1",
        campaign_id: "CAMP-1",
      });
    });

    it("should throw BadRequestException when device already has 15 active campaign slots", async () => {
      txMock.deviceCampaign.count.mockResolvedValue(15);

      await expect(
        service.assignCampaignToDevice("DEV-1", "CAMP-1"),
      ).rejects.toThrow(BadRequestException);

      expect(txMock.$executeRaw).toHaveBeenCalled();
      expect(txMock.deviceCampaign.count).toHaveBeenCalledWith({
        where: { device_id: "DEV-1" },
      });
      expect(txMock.deviceCampaign.create).not.toHaveBeenCalled();
    });
  });
});
