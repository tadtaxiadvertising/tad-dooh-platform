import { BadRequestException } from "@nestjs/common";
import { OnboardingService } from "./onboarding.service";

describe("OnboardingService password safety", () => {
  const prisma = {
    advertiser: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  };
  const service = new OnboardingService(prisma as never);

  beforeEach(() => jest.clearAllMocks());

  it.each([undefined, "", "1234567"])(
    "rejects invalid password before any database access (%s)",
    async (password) => {
      await expect(
        service.onboardAdvertiser({
          name: "Test",
          companyName: "Test Company",
          email: "test@example.com",
          phone: "8095550101",
          password: password as string,
          budget: 1000,
          expectedScreens: 1,
          targetCity: "Santiago",
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.advertiser.findUnique).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    },
  );
  it.each([
    { budget: Number.NaN, expectedScreens: 1 },
    { budget: Number.POSITIVE_INFINITY, expectedScreens: 1 },
    { budget: 0, expectedScreens: 1 },
    { budget: -1, expectedScreens: 1 },
    { budget: 100, expectedScreens: 0 },
    { budget: 100, expectedScreens: 1.5 },
    { budget: 100, expectedScreens: Number.NaN },
  ])("rejects invalid campaign numbers before database access: %p", async ({ budget, expectedScreens }) => {
    await expect(service.onboardAdvertiser({
      name: "Test", companyName: "Test Company", email: "test@example.com",
      phone: "8095550101", password: "password123", budget,
      expectedScreens, targetCity: "Santiago",
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.advertiser.findUnique).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

});
