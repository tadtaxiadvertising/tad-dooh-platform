import { DeviceAdminController } from "./device-admin.controller";
import { DeviceService } from "./device.service";
import {
  deviceAdminSelect,
  deviceAdminDriverSelect,
} from "./device-admin-select";

jest.mock("../../utils/env.util", () => ({
  requireEnv: jest.fn(() => "synthetic-unit-test-only"),
}));

describe("Administrative device credential projections", () => {
  const driver = {
    id: "driver-fixture",
    fullName: "Fixture driver",
    phone: "8095550101",
    password: "fixture-password-hash",
    bankAccount: { account: "fixture-bank-data" },
    subscriptionPaid: false,
  };
  const device = {
    id: "device-fixture",
    deviceId: "HW-FIXTURE",
    status: "OPERATIVO",
    authToken: "fixture-device-credential",
    driver,
    campaigns: [],
  };
  function project(
    row: Record<string, unknown>,
    select: Record<string, unknown>,
  ) {
    return Object.fromEntries(
      Object.entries(row).filter(([key]) => select[key] === true),
    );
  }
  const result = ({ select }: { select: Record<string, unknown> }) => {
    expect(select).toMatchObject(deviceAdminSelect);
    expect(select).not.toHaveProperty("authToken");
    return {
      ...project(device, select),
      ...(select.driver
        ? { driver: project(driver, deviceAdminDriverSelect) }
        : {}),
    };
  };
  const create = jest.fn(async (args) => result(args));
  const update = jest.fn(async (args) => result(args));
  const remove = jest.fn(async (args) => result(args));
  const findUnique = jest.fn();
  const findMany = jest.fn();
  const prisma = {
    device: { create, update, delete: remove, findUnique, findMany },
  };
  const service = new DeviceService(prisma as never, {} as never, {} as never);
  const controller = new DeviceAdminController(prisma as never, service);

  beforeEach(() => {
    jest.clearAllMocks();
    findUnique.mockResolvedValue(null);
    findMany.mockResolvedValue([{ id: device.id, deviceId: device.deviceId }]);
  });

  it("returns operational data only on manual create, update, approve and reject", async () => {
    const responses = [
      await controller.createDevice({ deviceId: device.deviceId }),
      await controller.updateDevice(device.id, { city: "Santiago" }),
      await controller.approveDevice(device.deviceId),
      await controller.rejectDevice(device.deviceId),
    ];
    for (const response of responses) {
      expect(response).toMatchObject({
        id: device.id,
        deviceId: device.deviceId,
      });
      expect(response).not.toHaveProperty("authToken");
      expect(response).not.toHaveProperty("driver.password");
      expect(response).not.toHaveProperty("driver.bankAccount");
    }
    expect(update.mock.calls[0][0]).toMatchObject({
      where: { id: device.id },
      data: { city: "Santiago" },
      select: { driver: { select: deviceAdminDriverSelect } },
    });
    expect(update.mock.calls[1][0]).toMatchObject({
      where: { deviceId: device.deviceId },
      data: { status: "OPERATIVO" },
    });
    expect(remove).toHaveBeenCalledWith({
      where: { deviceId: device.deviceId },
      select: deviceAdminSelect,
    });
  });

  it("preserves profile update without fetching or returning stored credentials", async () => {
    findUnique.mockResolvedValue({
      id: device.id,
      driver: project(driver, {
        fullName: true,
        phone: true,
        subscriptionPaid: true,
      }),
    });
    const response = await controller.updateDeviceProfile(device.deviceId, {
      taxi_number: "TAXI-FIXTURE",
    });
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: device.id },
      select: {
        id: true,
        driver: {
          select: { fullName: true, phone: true, subscriptionPaid: true },
        },
      },
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: device.id },
      data: {
        taxiNumber: "TAXI-FIXTURE",
        driver: {
          update: {
            fullName: driver.fullName,
            phone: driver.phone,
            subscriptionPaid: false,
          },
        },
      },
      select: deviceAdminSelect,
    });
    expect(response.success).toBe(true);
    expect(response.device).not.toHaveProperty("authToken");
  });
});
