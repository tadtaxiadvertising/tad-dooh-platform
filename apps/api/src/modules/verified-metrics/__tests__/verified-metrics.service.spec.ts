import type {
  Prisma,
  Campaign,
  MediaAsset,
  PlaybackEvent,
  Driver,
  Device,
} from "@prisma/client";
import { UserRole } from "../../auth/decorators/roles.decorator";
type CampaignFixture = Partial<Campaign> & {
  mediaAssets?: { id: string; filename: string; weight: number }[];
  devices?: {
    id?: string;
    deviceId?: string;
    taxiNumber?: string;
    device: {
      id: string;
      taxiNumber: string;
      driver: { id: string; fullName: string };
    };
  }[];
};
type DriverFixture = Partial<Driver> & {
  devices?: { id: string; deviceId: string }[];
};
import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";
import { VerifiedMetricsService } from "../verified-metrics.service";
import { PrismaService } from "../../prisma/prisma.service";

// Type annotation for mockPrisma to avoid circular reference
interface MockPrisma {
  campaign: {
    findUnique: jest.Mock<
      Promise<CampaignFixture | null>,
      [Prisma.CampaignFindUniqueArgs?]
    >;
    findMany: jest.Mock<
      Promise<CampaignFixture[]>,
      [Prisma.CampaignFindManyArgs?]
    >;
  };
  mediaAsset: {
    findMany: jest.Mock<
      Promise<Partial<MediaAsset>[]>,
      [Prisma.MediaAssetFindManyArgs?]
    >;
  };
  playbackEvent: {
    findMany: jest.Mock<
      Promise<Partial<PlaybackEvent>[]>,
      [Prisma.PlaybackEventFindManyArgs?]
    >;
    count: jest.Mock<Promise<number>, [Prisma.PlaybackEventCountArgs?]>;
    groupBy: jest.Mock<Promise<unknown[]>, [Prisma.PlaybackEventGroupByArgs]>;
    updateMany: jest.Mock<
      Promise<Prisma.BatchPayload>,
      [Prisma.PlaybackEventUpdateManyArgs?]
    >;
  };
  driver: {
    findUnique: jest.Mock<
      Promise<DriverFixture | null>,
      [Prisma.DriverFindUniqueArgs?]
    >;
  };
  device: {
    findMany: jest.Mock<
      Promise<Partial<Device>[]>,
      [Prisma.DeviceFindManyArgs?]
    >;
  };
  $transaction: jest.Mock<
    Promise<unknown>,
    [(prisma: MockPrisma) => Promise<unknown>]
  >;
}

describe("VerifiedMetricsService", () => {
  let service: VerifiedMetricsService;

  const mockPrisma: MockPrisma = {
    campaign: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    mediaAsset: {
      findMany: jest.fn(),
    },
    playbackEvent: {
      findMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
      updateMany: jest.fn(),
    },
    driver: {
      findUnique: jest.fn(),
    },
    device: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrisma)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VerifiedMetricsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<VerifiedMetricsService>(VerifiedMetricsService);
    jest.clearAllMocks();
  });

  describe("getCampaignVerifiedStats", () => {
    it("should return verified stats for campaign", async () => {
      const mockCampaign = {
        id: "campaign-1",
        name: "Test Campaign",
        status: "ACTIVE",
        mediaAssets: [
          { id: "media-1", filename: "video1.mp4", weight: 1 },
          { id: "media-2", filename: "video2.mp4", weight: 2 },
        ],
        devices: [
          {
            id: "device-1",
            taxiNumber: "T-001",
            device: {
              id: "device-1",
              taxiNumber: "T-001",
              driver: { id: "driver-1", fullName: "Driver 1" },
            },
          },
          {
            id: "device-2",
            taxiNumber: "T-002",
            device: {
              id: "device-2",
              taxiNumber: "T-002",
              driver: { id: "driver-2", fullName: "Driver 2" },
            },
          },
        ],
      };

      mockPrisma.campaign.findUnique.mockResolvedValue(mockCampaign);
      mockPrisma.playbackEvent.findMany.mockResolvedValue([
        { videoId: "media-1", deviceId: "device-1", timestamp: new Date() },
        { videoId: "media-1", deviceId: "device-2", timestamp: new Date() },
        { videoId: "media-2", deviceId: "device-1", timestamp: new Date() },
      ]);

      const from = new Date("2026-09-01");
      const to = new Date("2026-09-30");

      const result = await service.getCampaignVerifiedStats(
        "campaign-1",
        from,
        to,
        { role: UserRole.ADMIN },
      );

      expect(result).toBeDefined();
      expect(result.campaignId).toBe("campaign-1");
      expect(result.totalVerifiedPlays).toBe(3);
      expect(result.byMediaAsset.length).toBe(2);
      expect(result.byDevice.length).toBe(2);
    });

    it("should throw when campaign not found", async () => {
      mockPrisma.campaign.findUnique.mockResolvedValue(null);

      await expect(
        service.getCampaignVerifiedStats(
          "campaign-not-found",
          new Date(),
          new Date(),
          { role: UserRole.ADMIN },
        ),
      ).rejects.toThrow("Campaign campaign-not-found not found");
    });
  });

  describe("getDriverVerifiedStats", () => {
    it("should return verified stats for driver", async () => {
      const mockDriver = {
        id: "driver-1",
        fullName: "Driver 1",
        taxiNumber: "T-001",
        devices: [{ id: "db-device-uuid-1", deviceId: "TAD-HW-1" }],
      };

      mockPrisma.driver.findUnique.mockResolvedValue(mockDriver);
      mockPrisma.playbackEvent.findMany.mockResolvedValue([
        { deviceId: "TAD-HW-1", videoId: "media-1", timestamp: new Date() },
        { deviceId: "TAD-HW-1", videoId: "media-2", timestamp: new Date() },
      ]);
      mockPrisma.mediaAsset.findMany.mockResolvedValue([
        { campaignId: "campaign-1" },
        { campaignId: "campaign-2" },
      ]);

      const result = await service.getDriverVerifiedStats(
        "driver-1",
        new Date(),
        new Date(),
      );

      expect(result.driverId).toBe("driver-1");
      expect(result.totalVerifiedPlays).toBe(2);
      expect(result.campaignsPlayed).toBe(2);
      expect(mockPrisma.driver.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          select: expect.objectContaining({
            devices: { select: { deviceId: true } },
          }),
        }),
      );
      expect(mockPrisma.playbackEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deviceId: { in: ["TAD-HW-1"] },
            eventType: "play_confirm",
            verified: true,
          }),
        }),
      );
    });
  });

  describe("verifyPlaybackEvents", () => {
    it("should verify playback events in transaction", async () => {
      mockPrisma.playbackEvent.updateMany.mockResolvedValue({ count: 5 });

      const result = await service.verifyPlaybackEvents(
        ["evt-1", "evt-2"],
        "admin-user",
      );

      expect(result.updated).toBe(5);
      expect(mockPrisma.playbackEvent.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ["evt-1", "evt-2"] } },
        data: { verified: true },
      });
    });
  });

  describe("detectAnomalies", () => {
    it("should detect silent devices", async () => {
      mockPrisma.campaign.findMany.mockResolvedValue([
        {
          devices: [
            {
              deviceId: "device-1",
              device: {
                id: "device-1",
                taxiNumber: "T-001",
                driver: { id: "driver-1", fullName: "Driver 1" },
              },
            },
            {
              deviceId: "device-2",
              device: {
                id: "device-2",
                taxiNumber: "T-002",
                driver: { id: "driver-2", fullName: "Driver 2" },
              },
            },
          ],
        },
      ]);
      mockPrisma.playbackEvent.findMany.mockResolvedValue([
        { deviceId: "device-1" },
      ]);

      const result = await service.detectAnomalies(new Date(), new Date());

      expect(result.totalAssignedDevices).toBe(2);
      expect(result.devicesWithVerifiedPlays).toBe(1);
      expect(result.silentDevicesCount).toBe(1);
      expect(result.silentDevices[0].deviceId).toBe("device-2");
    });
  });
});
