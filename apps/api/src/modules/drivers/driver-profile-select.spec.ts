import { DriversService } from "./drivers.service";
import { deviceProfileSelect, driverProfileSelect } from "./driver-profile-select";

describe("Driver and linked device profile projections", () => {
  const device = {
    id: "device-fixture",
    deviceId: "hardware-fixture",
    status: "OPERATIVO",
    authToken: "synthetic-device-credential",
  };
  const driver = {
    id: "driver-fixture",
    fullName: "Fixture driver",
    status: "PENDIENTE_PAGO",
    onboardingStatus: "COMPLETED",
    password: "synthetic-password-hash",
  };
  function project(
    row: Record<string, unknown>,
    select: Record<string, unknown>,
  ) {
    return Object.fromEntries(
      Object.entries(row).filter(([key]) => select[key] === true),
    );
  }
  function profile(args: {
    select: Record<string, unknown> & {
      devices: { select: Record<string, unknown> };
    };
  }) {
    expect(args.select).toMatchObject(driverProfileSelect);
    expect(args.select).not.toHaveProperty("password");
    expect(args.select.devices.select).not.toHaveProperty("authToken");
    return {
      ...project(driver, args.select),
      devices: [project(device, args.select.devices.select)],
      subscriptions: [],
      referrals: [],
      referredAdvertisers: [],
    };
  }

  const findUnique = jest.fn(async (args) => profile(args));
  const findMany = jest.fn(async (args) => [profile(args)]);
  const service = new DriversService(
    {
      driver: { findUnique, findMany },
      campaign: { count: jest.fn().mockResolvedValue(0) },
      wallet: { findUnique: jest.fn().mockResolvedValue(null) },
      payrollPayment: { findFirst: jest.fn().mockResolvedValue(null) },
    } as never,
    {} as never,
    {} as never,
    {} as never,
  );

  it("excludes password and device token across detail, list and admin profile", async () => {
    const detail = await service.findOne(driver.id);
    expect(findUnique).toHaveBeenLastCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          devices: { select: deviceProfileSelect },
        }),
      }),
    );
    const results = [
      detail,
      ...(await service.findAll()),
      await service.getAdminProfile(driver.id),
    ];
    for (const result of results) {
      expect(result).toMatchObject({
        id: driver.id,
        fullName: driver.fullName,
        devices: [{ id: device.id, deviceId: device.deviceId }],
      });
      expect(result).not.toHaveProperty("password");
      expect(result).not.toHaveProperty("devices.0.authToken");
    }
    expect(results[2]).toMatchObject({
      bankAccountConfigured: false,
      onboardingStatus: "COMPLETED",
      referencedDrivers: [],
      lastPayment: null,
    });
  });
});
