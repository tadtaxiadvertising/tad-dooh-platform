import { BadRequestException } from "@nestjs/common";
import { CampaignService } from "./campaign.service";

describe("CampaignService.simulateImpact — undiscounted base price", () => {
  const deviceCount = jest.fn();
  // Only exercise the real simulation logic with a controlled device lookup.
  // No database, real accounts, network requests or invoices.
  const service = Object.assign(Object.create(CampaignService.prototype), {
    prisma: { device: { count: deviceCount } },
  }) as CampaignService;

  beforeEach(() => {
    jest.clearAllMocks();
    deviceCount.mockResolvedValue(30);
  });

  it("uses RD$2,500 per screen when no verified driver code is supplied", async () => {
    const result = await service.simulateImpact(3000, "Santiago");
    expect(result.recommendedScreens).toBe(1);
    expect(result.budget).toBe(3000);
    expect(result.onlineScreensInZone).toBe(30);
    expect(deviceCount).toHaveBeenCalledWith({
      where: {
        city: "Santiago",
        status: expect.any(String),
        connectivityStatus: "ONLINE",
      },
    });
  });

  it.each([
    [0, 0],
    [1499, 0],
    [1500, 0], // Discounted driver tariff is NOT the default.
    [2499, 0],
    [2500, 1],
    [4999, 1],
    [5000, 2],
    [7500, 3],
  ])(
    "a budget of RD$%i can cover %i base-rate screens",
    async (budget, expected) => {
      const result = await service.simulateImpact(budget, "Santiago");
      expect(result.recommendedScreens).toBe(expected);
    },
  );

  it("never recommends more than online inventory", async () => {
    deviceCount.mockResolvedValue(1);
    const result = await service.simulateImpact(25000, "Santiago");
    expect(result.recommendedScreens).toBe(1);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, -1])(
    "rejects invalid budgets before querying devices (%s)",
    async (budget) => {
      await expect(
        service.simulateImpact(budget, "Santiago"),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(deviceCount).not.toHaveBeenCalled();
    },
  );
});
