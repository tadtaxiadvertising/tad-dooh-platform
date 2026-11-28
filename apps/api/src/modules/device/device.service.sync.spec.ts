import { DeviceService } from "./device.service";

function setupSync(
  syncHash = "same-hash",
  mediaAssets: unknown[] = [],
  commandParams: string | null = '{"force":true}',
) {
  const prisma = {
    device: {
      findUnique: jest.fn().mockResolvedValue({
        id: "db-device-uuid",
        deviceId: "TAD-0001",
        status: "OPERATIVO",
        lastSeen: new Date(),
      }),
      update: jest.fn().mockResolvedValue({
        id: "db-device-uuid",
        deviceId: "TAD-0001",
        taxiNumber: "TX-01",
        city: "Santiago",
      }),
    },
    deviceCommand: {
      findMany: jest
        .fn()
        .mockResolvedValue([
          { id: "command-01", commandType: "FORCE_SYNC", commandParams },
        ]),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    notification: { create: jest.fn() },
  };
  const campaignService = {
    getActiveSyncVideos: jest.fn().mockResolvedValue({
      version: 1,
      sync_hash: syncHash,
      media_assets: mediaAssets,
    }),
  };
  const service = Object.create(DeviceService.prototype) as DeviceService;
  Object.assign(service, {
    prisma,
    campaignService,
    JWT_SECRET: "testing-only-secret-never-use-in-production",
    logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
    checkSubscriptionStatus: jest.fn().mockResolvedValue({ blocked: false }),
  });
  return { prisma, campaignService, service };
}

describe("DeviceService synced license and command delivery", () => {
  it("sends commands and renews offline JWT when media hash matches", async () => {
    const { service, prisma } = setupSync();
    const payload = await service.syncDeviceCampaigns({
      deviceId: "TAD-0001",
      lastHash: "same-hash",
    } as Parameters<DeviceService["syncDeviceCampaigns"]>[0]);

    expect(payload).toMatchObject({
      update: false,
      blocked: false,
      sync_hash: "same-hash",
      media_assets: [],
      commands: [
        { id: "command-01", type: "FORCE_SYNC", params: { force: true } },
      ],
    });
    expect(payload).toHaveProperty("licenseToken", expect.any(String));
    expect(payload).toHaveProperty("expiresAt", expect.any(String));
    expect(prisma.deviceCommand.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["command-01"] }, status: "PENDING" },
      data: { status: "PROCESSING" },
    });
  });

  it("renews offline JWT and sends commands even with no active campaigns", async () => {
    const { service } = setupSync("empty", []);
    const payload = await service.syncDeviceCampaigns({
      deviceId: "TAD-0001",
      lastHash: "older-hash",
    } as Parameters<DeviceService["syncDeviceCampaigns"]>[0]);

    expect(payload).toMatchObject({
      update: true,
      blocked: false,
      media_assets: [],
      sync_hash: "empty",
      commands: [{ id: "command-01", type: "FORCE_SYNC" }],
    });
    expect(payload).toHaveProperty("licenseToken", expect.any(String));
    expect(payload).toHaveProperty("expiresAt", expect.any(String));
  });

  it("does not mark commands as PROCESSING if stored params cannot be decoded", async () => {
    const { service, prisma } = setupSync("empty", [], "{invalid-json");
    await expect(
      service.syncDeviceCampaigns({
        deviceId: "TAD-0001",
        lastHash: "last",
      } as Parameters<DeviceService["syncDeviceCampaigns"]>[0]),
    ).rejects.toBeInstanceOf(SyntaxError);
    expect(prisma.deviceCommand.updateMany).not.toHaveBeenCalled();
  });

  it("does not grant a license to a device pending registration", async () => {
    const { service, prisma } = setupSync();
    prisma.device.findUnique.mockResolvedValue(null);
    const payload = await service.syncDeviceCampaigns({
      deviceId: "UNREGISTERED",
    } as Parameters<DeviceService["syncDeviceCampaigns"]>[0]);

    expect(payload).toMatchObject({
      blocked: true,
      reason: "awaiting_approval",
      media_assets: [],
    });
    expect("licenseToken" in payload).toBe(false);
    expect(prisma.deviceCommand.findMany).not.toHaveBeenCalled();
  });
});
