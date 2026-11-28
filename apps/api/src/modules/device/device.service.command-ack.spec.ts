import { BadRequestException, ConflictException } from "@nestjs/common";
import { DeviceService } from "./device.service";

describe("DeviceService command execution ACK", () => {
  function setup() {
    const prisma = {
      deviceCommand: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };
    const service = Object.create(DeviceService.prototype) as DeviceService;
    Object.assign(service, { prisma });
    return { service, prisma };
  }

  it("confirms only a successful result after PROCESSING", async () => {
    const { service, prisma } = setup();
    await expect(
      service.acknowledgeCommand("cmd-1", { success: true }),
    ).resolves.toEqual({ acknowledged: true });

    expect(prisma.deviceCommand.updateMany).toHaveBeenCalledWith({
      where: { id: "cmd-1", status: "PROCESSING" },
      data: {
        status: "EXECUTED",
        executedAt: expect.any(Date),
        result: JSON.stringify({ success: true }),
      },
    });
    expect(prisma.deviceCommand.update).not.toHaveBeenCalled();
  });

  it.each([
    [null],
    [undefined],
    [{ success: false }],
    [{ result: { acknowledged: true } }],
    [{ acknowledged: true }],
    ["success"],
  ])("rejects incomplete or unsuccessful ACK %s", async (result) => {
    const { service, prisma } = setup();
    await expect(
      service.acknowledgeCommand("cmd-1", result),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.deviceCommand.updateMany).not.toHaveBeenCalled();
  });

  it("makes a duplicate successful ACK idempotent", async () => {
    const { service, prisma } = setup();
    prisma.deviceCommand.updateMany.mockResolvedValue({ count: 0 });
    prisma.deviceCommand.findUnique.mockResolvedValue({
      status: "EXECUTED",
      result: JSON.stringify({ success: true }),
    });

    await expect(
      service.acknowledgeCommand("cmd-1", { success: true }),
    ).resolves.toEqual({ acknowledged: true, alreadyRecorded: true });
  });

  it.each(["PENDING", "PROCESSING", "FAILED"])(
    "does not incorrectly acknowledge a command in %s state",
    async (status) => {
      const { service, prisma } = setup();
      prisma.deviceCommand.updateMany.mockResolvedValue({ count: 0 });
      prisma.deviceCommand.findUnique.mockResolvedValue({
        status,
        result: null,
      });
      await expect(
        service.acknowledgeCommand("cmd-1", { success: true }),
      ).rejects.toBeInstanceOf(ConflictException);
    },
  );

  it("cannot overwrite a different previously recorded outcome", async () => {
    const { service, prisma } = setup();
    prisma.deviceCommand.updateMany.mockResolvedValue({ count: 0 });
    prisma.deviceCommand.findUnique.mockResolvedValue({
      status: "EXECUTED",
      result: JSON.stringify({ success: true, source: "other" }),
    });

    await expect(
      service.acknowledgeCommand("cmd-1", { success: true }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
