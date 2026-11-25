import type { Prisma, DeviceCampaign } from "@prisma/client";
interface TransactionMock {
  $executeRaw: jest.Mock<Promise<number>>;
  device: { findMany: jest.Mock };
  deviceCampaign: {
    count: jest.Mock<Promise<number>, [Prisma.DeviceCampaignCountArgs?]>;
    create: jest.Mock<
      Promise<Partial<DeviceCampaign>>,
      [Prisma.DeviceCampaignCreateArgs]
    >;
  };
}
interface CampaignPrismaMock {
  $transaction: jest.Mock<
    Promise<unknown>,
    [(tx: TransactionMock) => Promise<unknown>]
  >;
  device: { findMany: jest.Mock };
  campaign: {
    count: jest.Mock;
    create: jest.Mock;
    findMany: jest.Mock;
    findUnique: jest.Mock;
  };
}
import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { CampaignService } from "../campaign.service";
import { PrismaService } from "../../prisma/prisma.service";
import { SupabaseService } from "../../supabase/supabase.service";
import { NotificationsService } from "../../notifications/notifications.service";
import { ReferralService } from "../../referral/referral.service";

describe("CampaignService — 15-Slot Limit & Advisory Locking", () => {
  const canonicalId = "9c783afa-605f-4688-932a-46883711ba04";
  let service: CampaignService;
  let prismaService: CampaignPrismaMock;
  let txMock: TransactionMock;

  beforeEach(async () => {
    const canonicalDevice = { id: canonicalId, deviceId: "DEV-1" };
    txMock = {
      $executeRaw: jest.fn().mockResolvedValue(1),
      device: { findMany: jest.fn().mockResolvedValue([canonicalDevice]) },
      deviceCampaign: {
        count: jest.fn(),
        create: jest.fn(),
      },
    };

    prismaService = {
      $transaction: jest.fn(
        async (cb: (tx: TransactionMock) => Promise<unknown>) => cb(txMock),
      ),
      device: {
        findMany: jest.fn(),
      },
      campaign: {
        count: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
    };

    const supabaseService = {
      broadcastEvent: jest.fn().mockResolvedValue(true),
    };

    const notificationsService = {
      sendDriverNotification: jest.fn().mockResolvedValue(true),
    };

    const referralService = {
      awardAdvertiserReferralBonus: jest.fn().mockResolvedValue(true),
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
        device_id: canonicalId,
        campaign_id: "CAMP-1",
      });

      const result = await service.assignCampaignToDevice("DEV-1", "CAMP-1");

      expect(prismaService.$transaction).toHaveBeenCalled();
      expect(txMock.device.findMany).toHaveBeenCalledWith({
        where: { deviceId: "DEV-1" },
        select: { id: true, deviceId: true },
        take: 2,
      });
      expect(txMock.$executeRaw).toHaveBeenCalled();
      expect(txMock.$executeRaw.mock.calls[0][1]).toBe("dc:" + canonicalId);
      expect(txMock.deviceCampaign.count).toHaveBeenCalledWith({
        where: { device_id: canonicalId },
      });
      expect(txMock.deviceCampaign.create).toHaveBeenCalledWith({
        data: { device_id: canonicalId, campaign_id: "CAMP-1" },
      });
      expect(result).toEqual({
        device_id: canonicalId,
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
        where: { device_id: canonicalId },
      });
      expect(txMock.deviceCampaign.create).not.toHaveBeenCalled();
    });

    it("accepts a canonical UUID", async () => {
      txMock.deviceCampaign.count.mockResolvedValue(0);
      txMock.deviceCampaign.create.mockResolvedValue({
        device_id: canonicalId,
        campaign_id: "CAMP-1",
      });

      await service.assignCampaignToDevice(canonicalId, "CAMP-1");

      expect(txMock.device.findMany).toHaveBeenCalledWith({
        where: { OR: [{ id: canonicalId }, { deviceId: canonicalId }] },
        select: { id: true, deviceId: true },
        take: 2,
      });
      expect(txMock.deviceCampaign.create).toHaveBeenCalledWith({
        data: { device_id: canonicalId, campaign_id: "CAMP-1" },
      });
    });

    it("refuses unknown device IDs before taking a slot lock", async () => {
      txMock.device.findMany.mockResolvedValue([]);

      await expect(
        service.assignCampaignToDevice("UNKNOWN-HW", "CAMP-1"),
      ).rejects.toThrow(NotFoundException);

      expect(txMock.$executeRaw).not.toHaveBeenCalled();
      expect(txMock.deviceCampaign.count).not.toHaveBeenCalled();
      expect(txMock.deviceCampaign.create).not.toHaveBeenCalled();
    });

    it("rejects ambiguous UUID hardware IDs", async () => {
      txMock.device.findMany.mockResolvedValue([
        { id: canonicalId, deviceId: "OTHER-HW" },
        {
          id: "a27af095-edb0-43e7-a9e5-466a892ad943",
          deviceId: canonicalId,
        },
      ]);

      await expect(
        service.assignCampaignToDevice(canonicalId, "CAMP-1"),
      ).rejects.toThrow(BadRequestException);

      expect(txMock.$executeRaw).not.toHaveBeenCalled();
      expect(txMock.deviceCampaign.count).not.toHaveBeenCalled();
      expect(txMock.deviceCampaign.create).not.toHaveBeenCalled();
    });
  });

  describe("MIME response compatibility (#217)", () => {
    it("keeps aliases on campaign lists without mutating database results", async () => {
      const campaign = Object.freeze({
        id: "campaign-synthetic",
        media: [
          Object.freeze({ id: "media-synthetic", mimeType: "video/mp4" }),
        ],
      });
      prismaService.campaign.findMany.mockResolvedValue([campaign]);
      const result = await service.getAllCampaigns();
      expect(result[0].media[0]).toMatchObject({
        mimeType: "video/mp4",
        mime_type: "video/mp4",
      });
      expect(campaign.media[0]).not.toHaveProperty("mime_type");
    });
    it("keeps aliases on a campaign detail and preserves not-found responses", async () => {
      prismaService.campaign.findUnique
        .mockResolvedValueOnce({
          id: "campaign-synthetic",
          media: [{ id: "media-synthetic", mimeType: null }],
        })
        .mockResolvedValueOnce(null);
      expect(
        (await service.getCampaignById("campaign-synthetic"))?.media[0],
      ).toMatchObject({
        mimeType: null,
        mime_type: null,
      });
      expect(await service.getCampaignById("missing")).toBeNull();
    });
  });
});
