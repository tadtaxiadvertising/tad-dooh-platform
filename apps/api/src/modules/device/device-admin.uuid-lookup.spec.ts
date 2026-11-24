import type { PrismaService } from "../prisma/prisma.service";
import type { DeviceService } from "./device.service";
import { DeviceAdminController } from "./device-admin.controller";
import { BadRequestException } from "@nestjs/common";

describe("DeviceAdminController hardware/UUID lookup", () => {
  const uuid = "e8e7cf0a-3cc0-4c78-a7bd-d899d54ad11d";
  const setup = () => {
    const tx = {
      analyticsEvent: { deleteMany: jest.fn() },
      campaignMetric: { deleteMany: jest.fn() },
      playbackEvent: { deleteMany: jest.fn() },
      deviceHeartbeat: { deleteMany: jest.fn() },
      playlistItem: { deleteMany: jest.fn() },
      driverLocation: { deleteMany: jest.fn() },
      deviceCommand: { deleteMany: jest.fn() },
      deviceCampaign: { deleteMany: jest.fn() },
      subscription: { deleteMany: jest.fn() },
      notification: { deleteMany: jest.fn() },
      device: { delete: jest.fn() },
    };
    const prisma = {
      device: { findFirst: jest.fn(), findMany: jest.fn() },
      deviceCampaign: {
        findMany: jest.fn().mockResolvedValue([]),
        deleteMany: jest.fn(),
      },
      playlistItem: { deleteMany: jest.fn() },
      deviceCommand: { create: jest.fn() },
      $transaction: jest.fn(async (fn: (client: typeof tx) => Promise<unknown>) =>
        fn(tx)),
    };
    const controller = new DeviceAdminController(
      prisma as unknown as PrismaService,
      {} as DeviceService,
    );
    return { controller, prisma, tx };
  };

  it("fetches campaigns by hardware ID without binding it to a UUID column", async () => {
    const { controller, prisma } = setup();
    prisma.device.findMany.mockResolvedValue([{
      id: uuid,
      deviceId: "TAD-0001",
    }]);
    await controller.getDeviceCampaigns("TAD-0001");
    expect(prisma.device.findMany).toHaveBeenCalledWith({
      where: { deviceId: "TAD-0001" },
      select: { id: true, deviceId: true },
      take: 2,
    });
    expect(prisma.deviceCampaign.findMany).toHaveBeenCalledWith({
      where: { device_id: { in: [uuid, "TAD-0001"] } },
      include: { campaign: true },
    });
  });

  it("keeps UUID lookups supported for existing admin links", async () => {
    const { controller, prisma } = setup();
    prisma.device.findMany.mockResolvedValue([]);
    await expect(controller.getDeviceCampaigns(uuid)).resolves.toEqual([]);
    expect(prisma.device.findMany).toHaveBeenCalledWith({
      where: { OR: [{ id: uuid }, { deviceId: uuid }] },
      select: { id: true, deviceId: true },
      take: 2,
    });
  });



  it("deduplicates the same campaign assigned via UUID and legacy hardware ID", async () => {
    const { controller, prisma } = setup();
    prisma.device.findMany.mockResolvedValue([{ id: uuid, deviceId: "TAD-0001" }]);
    const campaign = { id: "CAMP-1", name: "Example" };
    const earlier = new Date("2026-01-01T00:00:00Z");
    const later = new Date("2026-01-02T00:00:00Z");
    prisma.deviceCampaign.findMany.mockResolvedValue([
      { device_id: uuid, campaign_id: campaign.id, campaign, assigned_at: earlier },
      { device_id: "TAD-0001", campaign_id: campaign.id, campaign, assigned_at: later },
    ]);
    await expect(controller.getDeviceCampaigns("TAD-0001")).resolves.toEqual([
      { ...campaign, assigned_at: earlier },
    ]);
  });

  it("rejects ambiguous UUID-like hardware identities before reading assignments", async () => {
    const { controller, prisma } = setup();
    prisma.device.findMany.mockResolvedValue([
      { id: uuid, deviceId: "OTHER" },
      { id: "a7df15b8-96df-41ee-a2f2-faf6d7724b26", deviceId: uuid },
    ]);
    await expect(controller.getDeviceCampaigns(uuid)).rejects.toThrow(
      BadRequestException,
    );
    expect(prisma.deviceCampaign.findMany).not.toHaveBeenCalled();
  });

  it("removes both dual-ID v2 assignments and the hardware v1 playlist entry", async () => {
    const { controller, prisma } = setup();
    prisma.device.findMany.mockResolvedValue([{ id: uuid, deviceId: "TAD-0001" }]);
    await expect(controller.removeCampaignFromDevice("TAD-0001", "CAMP-1"))
      .resolves.toEqual({
        success: true,
        message: "Campaña removida del dispositivo exitosamente",
      });
    expect(prisma.deviceCampaign.deleteMany).toHaveBeenCalledWith({
      where: { device_id: { in: [uuid, "TAD-0001"] }, campaign_id: "CAMP-1" },
    });
    expect(prisma.playlistItem.deleteMany).toHaveBeenCalledWith({
      where: { campaignId: "CAMP-1", deviceId: "TAD-0001" },
    });
  });

  it("refuses ambiguous identity removal before a mutating query", async () => {
    const { controller, prisma } = setup();
    prisma.device.findMany.mockResolvedValue([
      { id: uuid, deviceId: "OTHER" },
      { id: "a7df15b8-96df-41ee-a2f2-faf6d7724b26", deviceId: uuid },
    ]);
    await expect(controller.removeCampaignFromDevice(uuid, "CAMP-1"))
      .rejects.toThrow(BadRequestException);
    expect(prisma.deviceCampaign.deleteMany).not.toHaveBeenCalled();
    expect(prisma.playlistItem.deleteMany).not.toHaveBeenCalled();
  });

  it("transactionally deletes both dual-ID assignment forms before deleting device", async () => {
    const { controller, prisma, tx } = setup();
    prisma.device.findMany.mockResolvedValue([{ id: uuid, deviceId: "TAD-0001" }]);
    await expect(controller.deleteDevice("TAD-0001")).resolves.toEqual({
      success: true, message: "Dispositivo TAD-0001 eliminado correctamente",
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.deviceCampaign.deleteMany).toHaveBeenCalledWith({
      where: { device_id: { in: [uuid, "TAD-0001"] } },
    });
    expect(tx.device.delete).toHaveBeenCalledWith({ where: { id: uuid } });
  });

  it("refuses ambiguous device deletion without entering transaction", async () => {
    const { controller, prisma } = setup();
    prisma.device.findMany.mockResolvedValue([
      { id: uuid, deviceId: "OTHER" },
      { id: "a7df15b8-96df-41ee-a2f2-faf6d7724b26", deviceId: uuid },
    ]);
    await expect(controller.deleteDevice(uuid)).rejects.toThrow(
      BadRequestException,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("queues an admin command by real DB UUID after resolving a hardware ID", async () => {
    const { controller, prisma } = setup();
    prisma.device.findFirst.mockResolvedValue({
      id: uuid,
      deviceId: "TAD-0001",
    });
    prisma.deviceCommand.create.mockResolvedValue({ id: "command-1" });
    await controller.sendDeviceCommand("TAD-0001", {
      commandType: "FORCE_SYNC",
    });
    expect(prisma.device.findFirst).toHaveBeenCalledWith({
      where: { deviceId: "TAD-0001" },
    });
    expect(prisma.deviceCommand.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        deviceId: uuid,
        commandType: "FORCE_SYNC",
        status: "PENDING",
      }),
    });
  });
});
