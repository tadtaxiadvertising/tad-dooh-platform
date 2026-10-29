import { BadRequestException } from "@nestjs/common";
import { OnboardingService } from "./onboarding.service";

describe("OnboardingService password safety", () => {
  const prisma = {
    advertiser: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  };
  const createUser = jest.fn();
  const deleteUser = jest.fn();
  const supabase = { getClient: jest.fn(() => ({ auth: { admin: { createUser, deleteUser } } })) };
  const service = new OnboardingService(prisma as never, supabase as never);

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

  const validRequest = {
    name: "Test", companyName: "Test Company", email: "new@example.com",
    phone: "8095550101", password: "password123", budget: 1000,
    expectedScreens: 1, targetCity: "Santiago",
  };

  it("creates a dedicated Auth identity before creating advertiser records", async () => {
    prisma.advertiser.findUnique.mockResolvedValue(null);
    createUser.mockResolvedValue({ data: { user: { id: "auth-created-1" } }, error: null });
    prisma.$transaction.mockResolvedValue({ advertiserId: "adv-1", campaignId: "camp-1" });
    await service.onboardAdvertiser(validRequest);
    expect(createUser).toHaveBeenCalledWith({
      email: validRequest.email, password: validRequest.password, email_confirm: false,
      app_metadata: { role: "ADVERTISER" },
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it("does not write Prisma data when Auth provisioning fails", async () => {
    prisma.advertiser.findUnique.mockResolvedValue(null);
    createUser.mockResolvedValue({ data: { user: null }, error: new Error("duplicate") });
    await expect(service.onboardAdvertiser(validRequest)).rejects.toMatchObject({ status: 409 });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("deletes only the newly created Auth identity if Prisma transaction fails", async () => {
    prisma.advertiser.findUnique.mockResolvedValue(null);
    createUser.mockResolvedValue({ data: { user: { id: "auth-created-1" } }, error: null });
    prisma.$transaction.mockRejectedValue(new Error("database unavailable"));
    deleteUser.mockResolvedValue({ error: null });
    await expect(service.onboardAdvertiser(validRequest)).rejects.toMatchObject({ status: 500 });
    expect(deleteUser).toHaveBeenCalledWith("auth-created-1");
  });

  it("does not delete an existing identity when the email is already registered", async () => {
    prisma.advertiser.findUnique.mockResolvedValue({ id: "existing-advertiser" });
    await expect(service.onboardAdvertiser(validRequest)).rejects.toMatchObject({ status: 409 });
    expect(createUser).not.toHaveBeenCalled();
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it("preserves the registration failure if Auth compensation is unavailable", async () => {
    prisma.advertiser.findUnique.mockResolvedValue(null);
    createUser.mockResolvedValue({ data: { user: { id: "auth-created-1" } }, error: null });
    prisma.$transaction.mockRejectedValue(new Error("database unavailable"));
    deleteUser.mockRejectedValue(new Error("network unavailable"));
    await expect(service.onboardAdvertiser(validRequest)).rejects.toMatchObject({ status: 500 });
    expect(deleteUser).toHaveBeenCalledWith("auth-created-1");
  });

});
