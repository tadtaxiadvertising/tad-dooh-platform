import { DriversService } from "../drivers.service";

jest.mock("bcrypt", () => ({
  hash: jest.fn().mockResolvedValue("persisted-password-hash"),
  compare: jest.fn(),
}));

describe("DriversService.create response security", () => {
  const persistedDriver = {
    id: "driver-1",
    fullName: "Driver Test",
    phone: "8095550101",
    status: "INITIAL",
    onboardingStatus: "READY",
    subscriptionPaid: false,
    devices: [],
    password: "persisted-password-hash",
  };

  const createService = () => {
    const prisma = {
      driver: {
        create: jest.fn().mockResolvedValue(persistedDriver),
        findUnique: jest.fn(),
      },
      device: {
        update: jest.fn(),
      },
    };

    return {
      service: new DriversService(
        prisma as never,
        { get: jest.fn() } as never,
        {} as never,
        {} as never,
      ),
      prisma,
    };
  };

  it.each([
    ["provided", "SafePassword123!"],
    ["generated", undefined],
  ])(
    "omits password material when the password is %s",
    async (_passwordSource, password) => {
      const { service } = createService();

      const result = await service.create({
        fullName: persistedDriver.fullName,
        phone: persistedDriver.phone,
        password,
        contractAccepted: true,
      });

      expect(result).toEqual(
        expect.objectContaining({
          id: persistedDriver.id,
          fullName: persistedDriver.fullName,
          phone: persistedDriver.phone,
          status: persistedDriver.status,
          onboardingStatus: persistedDriver.onboardingStatus,
          subscriptionPaid: persistedDriver.subscriptionPaid,
          devices: persistedDriver.devices,
        }),
      );
      expect(Object.keys(result)).not.toEqual(
        expect.arrayContaining(["password", "generatedPassword"]),
      );
    },
  );
});

describe("DriversService read response security", () => {
  const persistedDriver = {
    id: "driver-1",
    fullName: "Driver Test",
    phone: "8095550101",
    status: "INITIAL",
    onboardingStatus: "READY",
    subscriptionPaid: false,
    devices: [{ id: "device-1" }],
    subscriptions: [{ id: "subscription-1" }],
    referrals: [],
    referredAdvertisers: [],
    password: "persisted-password-hash",
  };

  const createService = (driver: Record<string, jest.Mock>) => {
    const prisma = {
      driver,
      campaign: {
        count: jest.fn().mockResolvedValue(2),
      },
    };

    return new DriversService(
      prisma as never,
      { get: jest.fn() } as never,
      {} as never,
      {} as never,
    );
  };

  it("omits password from every driver returned by findAll", async () => {
    const service = createService({
      findMany: jest.fn().mockResolvedValue([persistedDriver]),
    });

    const result = await service.findAll();

    expect(result).toEqual([
      expect.objectContaining({
        id: persistedDriver.id,
        fullName: persistedDriver.fullName,
        phone: persistedDriver.phone,
        devices: persistedDriver.devices,
        activeAds: 2,
      }),
    ]);
    expect(Object.keys(result[0])).not.toContain("password");
  });

  it("omits password from findOne while preserving public relations", async () => {
    const service = createService({
      findUnique: jest.fn().mockResolvedValue(persistedDriver),
    });

    const result = await service.findOne(persistedDriver.id);

    expect(result).toEqual(
      expect.objectContaining({
        id: persistedDriver.id,
        fullName: persistedDriver.fullName,
        phone: persistedDriver.phone,
        devices: persistedDriver.devices,
        subscriptions: persistedDriver.subscriptions,
      }),
    );
    expect(Object.keys(result!)).not.toContain("password");
  });

  it("preserves a missing driver result", async () => {
    const service = createService({
      findUnique: jest.fn().mockResolvedValue(null),
    });

    await expect(service.findOne("missing-driver")).resolves.toBeNull();
  });
});
