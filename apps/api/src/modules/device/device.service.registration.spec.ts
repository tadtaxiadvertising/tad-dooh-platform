import { BadRequestException } from "@nestjs/common";
import { BUSINESS_RULES } from "../../common/constants/business-rules";
import { DeviceService } from "./device.service";

describe("public first-contact device enrollment", () => {
  const setup = () => {
    const prisma = {
      device: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };
    const service = Object.create(DeviceService.prototype) as DeviceService;
    Object.assign(service, { prisma, logger: { log: jest.fn() } });
    return { service, prisma };
  };

  it("never accepts driver ownership from an unverified tablet", async () => {
    const { service, prisma } = setup();
    await expect(
      service.registerDevice({
        device_id: "TAD-A",
        driver_id: "victim-driver-id",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.device.findUnique).not.toHaveBeenCalled();
    expect(prisma.device.create).not.toHaveBeenCalled();
    expect(prisma.device.update).not.toHaveBeenCalled();
  });

  it("creates only a pending, unassigned identity on first contact", async () => {
    const { service, prisma } = setup();
    prisma.device.findUnique.mockResolvedValue(null);
    prisma.device.create.mockResolvedValue({ deviceId: "TAD-A" });

    await expect(
      service.registerDevice({ device_id: "TAD-A", app_version: "1.2.3" }),
    ).resolves.toEqual({ deviceId: "TAD-A" });

    expect(prisma.device.create).toHaveBeenCalledWith({
      data: {
        deviceId: "TAD-A",
        appVersion: "1.2.3",
        status: BUSINESS_RULES.STATUS.DEVICE.INITIAL,
        lastSeen: expect.any(Date),
      },
      select: { deviceId: true },
    });
    expect(prisma.device.update).not.toHaveBeenCalled();
  });

  it("does not let anonymous re-registration modify an active device", async () => {
    const { service, prisma } = setup();
    prisma.device.findUnique.mockResolvedValue({ deviceId: "TAD-A" });

    await expect(
      service.registerDevice({ device_id: "TAD-A", app_version: "forged" }),
    ).resolves.toEqual({ deviceId: "TAD-A" });
    expect(prisma.device.update).not.toHaveBeenCalled();
    expect(prisma.device.create).not.toHaveBeenCalled();
  });

  it("handles concurrent first contacts without overwriting ownership", async () => {
    const { service, prisma } = setup();
    prisma.device.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ deviceId: "TAD-A" });
    prisma.device.create.mockRejectedValue({ code: "P2002" });

    await expect(
      service.registerDevice({ device_id: "TAD-A" }),
    ).resolves.toEqual({ deviceId: "TAD-A" });
    expect(prisma.device.findUnique).toHaveBeenCalledTimes(2);
    expect(prisma.device.update).not.toHaveBeenCalled();
  });

  it("does not conceal database errors unrelated to registration races", async () => {
    const { service, prisma } = setup();
    prisma.device.findUnique.mockResolvedValue(null);
    const failure = new Error("database not available");
    prisma.device.create.mockRejectedValue(failure);

    await expect(
      service.registerDevice({ device_id: "TAD-A" }),
    ).rejects.toBe(failure);
  });
});
