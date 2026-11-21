import type { PrismaService } from "../prisma/prisma.service";
import type { DeviceService } from "./device.service";
import { DeviceAdminController } from "./device-admin.controller";

describe("DeviceAdminController hardware/UUID lookup", () => {
  const uuid = "e8e7cf0a-3cc0-4c78-a7bd-d899d54ad11d";
  const setup = () => {
    const prisma = {
      device: { findFirst: jest.fn() },
      deviceCampaign: { findMany: jest.fn().mockResolvedValue([]) },
      deviceCommand: { create: jest.fn() },
    };
    const controller = new DeviceAdminController(
      prisma as unknown as PrismaService,
      {} as DeviceService,
    );
    return { controller, prisma };
  };

  it("fetches campaigns by hardware ID without binding it to a UUID column", async () => {
    const { controller, prisma } = setup();
    prisma.device.findFirst.mockResolvedValue({
      id: uuid,
      deviceId: "TAD-0001",
    });
    await controller.getDeviceCampaigns("TAD-0001");
    expect(prisma.device.findFirst).toHaveBeenCalledWith({
      where: { deviceId: "TAD-0001" },
      select: { id: true },
    });
    expect(prisma.deviceCampaign.findMany).toHaveBeenCalledWith({
      where: { device_id: uuid },
      include: { campaign: true },
    });
  });

  it("keeps UUID lookups supported for existing admin links", async () => {
    const { controller, prisma } = setup();
    prisma.device.findFirst.mockResolvedValue(null);
    await expect(controller.getDeviceCampaigns(uuid)).resolves.toEqual([]);
    expect(prisma.device.findFirst).toHaveBeenCalledWith({
      where: { OR: [{ id: uuid }, { deviceId: uuid }] },
      select: { id: true },
    });
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
