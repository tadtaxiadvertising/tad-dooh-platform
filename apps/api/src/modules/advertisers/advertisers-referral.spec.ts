import { AdvertisersService } from "./advertisers.service";

describe("AdvertisersService.create — referral attribution safety", () => {
  const findDriver = jest.fn();
  const createAdvertiser = jest.fn();
  const service = new AdvertisersService(
    {
      driver: { findUnique: findDriver },
      advertiser: { create: createAdvertiser },
    } as never,
    {} as never,
  );
  const base = {
    companyName: "Test merchant",
    contactName: "Representative",
    email: "merchant@example.test",
  };

  beforeEach(() => {
    jest.resetAllMocks();
    createAdvertiser.mockImplementation(({ data }) => Promise.resolve(data));
  });

  it("retains a real driver's referral for later approved attribution", async () => {
    findDriver.mockResolvedValue({ id: "driver-real", isSimulated: false });
    const result = await service.create({
      ...base,
      referralCode: "DRIVER_REAL",
    });
    expect(findDriver).toHaveBeenCalledWith({
      where: { referralCode: "DRIVER_REAL" },
      select: { id: true, isSimulated: true },
    });
    expect(result.referredBy).toBe("driver-real");
  });

  it("does not attribute future commissions to a simulated driver", async () => {
    findDriver.mockResolvedValue({ id: "driver-fixture", isSimulated: true });
    const result = await service.create({ ...base, referralCode: "SIMULATED" });
    expect(result.referredBy).toBeNull();
  });

  it("does not attribute nonexistent or absent driver codes", async () => {
    findDriver.mockResolvedValue(null);
    const unknown = await service.create({ ...base, referralCode: "UNKNOWN" });
    expect(unknown.referredBy).toBeNull();
    findDriver.mockClear();
    const plain = await service.create(base);
    expect(plain.referredBy).toBeNull();
    expect(findDriver).not.toHaveBeenCalled();
  });
});
