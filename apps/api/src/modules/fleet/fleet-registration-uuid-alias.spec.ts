import { ConflictException } from "@nestjs/common";
import { FleetService } from "./fleet.service";

describe("FleetService admin hardware identity admission", () => {
  it("refuses to bind a driver to hardware aliasing another device PK", async () => {
    const alias = "e8e7cf0a-3cc0-4c78-a7bd-d899d54ad11d";
    const deviceRead = jest.fn().mockResolvedValue({
      id: alias,
      deviceId: "TAD-OTHER",
    });
    const driverRead = jest.fn();
    const deviceCreate = jest.fn();
    const deviceUpdate = jest.fn();
    const driverUpdate = jest.fn();
    const prisma = {
      device: {
        findUnique: deviceRead,
        create: deviceCreate,
        update: deviceUpdate,
      },
      driver: { findFirst: driverRead, update: driverUpdate },
    };
    const service = new FleetService(prisma as never, {} as never, {} as never);

    await expect(
      service.registerDeviceByAdmin("PLATE-1", "Driver", alias),
    ).rejects.toThrow(ConflictException);
    expect(deviceRead).toHaveBeenCalledWith({
      where: { id: alias },
      select: { id: true, deviceId: true },
    });
    expect(driverRead).not.toHaveBeenCalled();
    expect(deviceCreate).not.toHaveBeenCalled();
    expect(deviceUpdate).not.toHaveBeenCalled();
    expect(driverUpdate).not.toHaveBeenCalled();
  });
});
