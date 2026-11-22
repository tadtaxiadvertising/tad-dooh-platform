import { HttpException, HttpStatus } from "@nestjs/common";
import { FleetService } from "./fleet.service";

describe("FleetService.getDeviceRecentPath", () => {
  const uuid = "9c783afa-605f-4688-932a-46883711ba04";
  const recentPoint = {
    latitude: 19.45,
    longitude: -70.69,
    speed: 0,
    timestamp: new Date("2026-11-20T12:00:00Z"),
  };

  const makeHarness = () => {
    const findDevices = jest.fn().mockResolvedValue([{ id: uuid }]);
    const findLocations = jest.fn().mockResolvedValue([recentPoint]);
    const prisma = {
      device: { findMany: findDevices },
      driverLocation: { findMany: findLocations },
    };
    const service = new FleetService(prisma as never, {} as never, {} as never);
    return { service, findDevices, findLocations };
  };

  it("resolves a hardware ID to the UUID used in GPS records", async () => {
    const { service, findDevices, findLocations } = makeHarness();
    await expect(service.getDeviceRecentPath("TAD-1234")).resolves.toEqual([
      recentPoint,
    ]);
    expect(findDevices).toHaveBeenCalledWith({
      where: { deviceId: "TAD-1234" },
      select: { id: true },
      take: 2,
    });
    expect(findLocations).toHaveBeenCalledWith({
      where: { deviceId: uuid },
      orderBy: { timestamp: "desc" },
      take: 60,
      select: {
        latitude: true,
        longitude: true,
        speed: true,
        timestamp: true,
      },
    });
  });

  it("accepts a UUID without losing hardware lookup compatibility", async () => {
    const { service, findDevices } = makeHarness();
    await service.getDeviceRecentPath(uuid);
    expect(findDevices).toHaveBeenCalledWith({
      where: { OR: [{ id: uuid }, { deviceId: uuid }] },
      select: { id: true },
      take: 2,
    });
  });

  it("returns an empty path for a missing device", async () => {
    const { service, findDevices, findLocations } = makeHarness();
    findDevices.mockResolvedValueOnce([]);
    await expect(service.getDeviceRecentPath("TAD-MISSING")).resolves.toEqual(
      [],
    );
    expect(findLocations).not.toHaveBeenCalled();
  });

  it("rejects UUID-to-hardware collisions without leaking a path", async () => {
    const { service, findDevices, findLocations } = makeHarness();
    findDevices.mockResolvedValueOnce([
      { id: uuid },
      { id: "a27af095-edb0-43e7-a9e5-466a892ad943" },
    ]);
    const request = service.getDeviceRecentPath(uuid);
    await expect(request).rejects.toThrow(HttpException);
    await expect(request).rejects.toMatchObject({
      status: HttpStatus.CONFLICT,
    });
    expect(findLocations).not.toHaveBeenCalled();
  });
});
