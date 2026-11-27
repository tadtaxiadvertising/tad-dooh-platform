import { BadRequestException } from "@nestjs/common";
import { OnboardingService } from "./onboarding.service";

describe("OnboardingService password safety", () => {
  const prisma = {
    advertiser: { findUnique: jest.fn() },
    driver: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  };
  const createUser = jest.fn();
  const deleteUser = jest.fn();
  const supabase = {
    getClient: jest.fn(() => ({ auth: { admin: { createUser, deleteUser } } })),
  };
  const service = new OnboardingService(prisma as never, supabase as never);

  beforeEach(() => {
    jest.resetAllMocks();
    supabase.getClient.mockReturnValue({
      auth: { admin: { createUser, deleteUser } },
    });
  });

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
  ])(
    "rejects invalid campaign numbers before database access: %p",
    async ({ budget, expectedScreens }) => {
      await expect(
        service.onboardAdvertiser({
          name: "Test",
          companyName: "Test Company",
          email: "test@example.com",
          phone: "8095550101",
          password: "password123",
          budget,
          expectedScreens,
          targetCity: "Santiago",
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.advertiser.findUnique).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    },
  );

  const validRequest = {
    name: "Test",
    companyName: "Test Company",
    email: "new@example.com",
    phone: "8095550101",
    password: "password123",
    budget: 1000,
    expectedScreens: 1,
    targetCity: "Santiago",
  };

  it("creates a dedicated Auth identity before creating advertiser records", async () => {
    prisma.advertiser.findUnique.mockResolvedValue(null);
    createUser.mockResolvedValue({
      data: { user: { id: "auth-created-1" } },
      error: null,
    });
    prisma.$transaction.mockResolvedValue({
      advertiserId: "adv-1",
      campaignId: "camp-1",
    });
    await service.onboardAdvertiser(validRequest);
    expect(createUser).toHaveBeenCalledWith({
      email: validRequest.email,
      password: validRequest.password,
      email_confirm: false,
      app_metadata: { role: "ADVERTISER" },
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it("normalizes email for both Prisma lookup and Supabase identity", async () => {
    prisma.advertiser.findUnique.mockResolvedValue(null);
    createUser.mockResolvedValue({
      data: { user: { id: "auth-created-2" } },
      error: null,
    });
    prisma.$transaction.mockResolvedValue({
      advertiserId: "adv-2",
      campaignId: "camp-2",
    });
    await service.onboardAdvertiser({
      ...validRequest,
      email: "  NEW@Example.COM  ",
    });
    expect(prisma.advertiser.findUnique).toHaveBeenCalledWith({
      where: { email: "new@example.com" },
    });
    expect(createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "new@example.com",
        app_metadata: { role: "ADVERTISER" },
      }),
    );
  });

  it("rejects malformed email before touching either identity store", async () => {
    await expect(
      service.onboardAdvertiser({ ...validRequest, email: "not-an-email" }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.advertiser.findUnique).not.toHaveBeenCalled();
    expect(createUser).not.toHaveBeenCalled();
  });

  it("does not write Prisma data when Auth provisioning fails", async () => {
    prisma.advertiser.findUnique.mockResolvedValue(null);
    createUser.mockResolvedValue({
      data: { user: null },
      error: new Error("duplicate"),
    });
    await expect(service.onboardAdvertiser(validRequest)).rejects.toMatchObject(
      { status: 409 },
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("deletes only the newly created Auth identity if transaction work explicitly fails", async () => {
    prisma.advertiser.findUnique.mockResolvedValue(null);
    createUser.mockResolvedValue({
      data: { user: { id: "auth-created-1" } },
      error: null,
    });
    prisma.$transaction.mockImplementation(
      async (callback: (tx: unknown) => unknown) =>
        callback({
          advertiser: {
            create: jest.fn().mockRejectedValue(new Error("write rejected")),
          },
        }),
    );
    deleteUser.mockResolvedValue({ error: null });
    await expect(service.onboardAdvertiser(validRequest)).rejects.toMatchObject(
      { status: 500 },
    );
    expect(deleteUser).toHaveBeenCalledWith("auth-created-1");
  });

  it("preserves Auth when transaction setup fails without a callback outcome", async () => {
    prisma.advertiser.findUnique.mockResolvedValue(null);
    createUser.mockResolvedValue({
      data: { user: { id: "auth-created-1" } },
      error: null,
    });
    prisma.$transaction.mockRejectedValue(new Error("database unavailable"));
    await expect(service.onboardAdvertiser(validRequest)).rejects.toMatchObject(
      { status: 500 },
    );
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it("preserves Auth when database work completed but commit acknowledgement is lost", async () => {
    prisma.advertiser.findUnique.mockResolvedValue(null);
    createUser.mockResolvedValue({
      data: { user: { id: "auth-created-1" } },
      error: null,
    });
    const tx = {
      advertiser: {
        create: jest.fn().mockResolvedValue({
          id: "adv-1",
          companyName: "Test Company",
        }),
      },
      campaign: { create: jest.fn().mockResolvedValue({ id: "camp-1" }) },
    };
    prisma.$transaction.mockImplementation(
      async (callback: (tx: unknown) => unknown) => {
        await callback(tx);
        throw new Error("commit acknowledgement lost");
      },
    );
    await expect(service.onboardAdvertiser(validRequest)).rejects.toMatchObject(
      { status: 500 },
    );
    expect(tx.advertiser.create).toHaveBeenCalledTimes(1);
    expect(tx.campaign.create).toHaveBeenCalledTimes(1);
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it("does not delete an existing identity when the email is already registered", async () => {
    prisma.advertiser.findUnique.mockResolvedValue({
      id: "existing-advertiser",
    });
    await expect(service.onboardAdvertiser(validRequest)).rejects.toMatchObject(
      { status: 409 },
    );
    expect(createUser).not.toHaveBeenCalled();
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it("preserves the registration failure if Auth compensation is unavailable", async () => {
    prisma.advertiser.findUnique.mockResolvedValue(null);
    createUser.mockResolvedValue({
      data: { user: { id: "auth-created-1" } },
      error: null,
    });
    prisma.$transaction.mockImplementation(
      async (callback: (tx: unknown) => unknown) =>
        callback({
          advertiser: {
            create: jest.fn().mockRejectedValue(new Error("write rejected")),
          },
        }),
    );
    deleteUser.mockRejectedValue(new Error("network unavailable"));
    await expect(service.onboardAdvertiser(validRequest)).rejects.toMatchObject(
      { status: 500 },
    );
    expect(deleteUser).toHaveBeenCalledWith("auth-created-1");
  });
});

describe("OnboardingService verified driver referral pricing", () => {
  const prisma = {
    advertiser: { findUnique: jest.fn() },
    driver: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  };
  const createUser = jest.fn();
  const deleteUser = jest.fn();
  const supabase = {
    getClient: jest.fn(() => ({ auth: { admin: { createUser, deleteUser } } })),
  };
  const service = new OnboardingService(prisma as never, supabase as never);
  const base = {
    name: "Test",
    companyName: "Company",
    email: "driver-code-test@example.com",
    phone: "8095550101",
    password: "password123",
    budget: 1, // Client must never be able to set the financial price.
    expectedScreens: 3,
    campaignMonths: 2,
    includeProduction: true,
    targetCity: "Santiago",
  };

  beforeEach(() => {
    jest.resetAllMocks();
    // resetAllMocks also erases jest.fn factory implementations.
    supabase.getClient.mockReturnValue({
      auth: { admin: { createUser, deleteUser } },
    });
    prisma.advertiser.findUnique.mockResolvedValue(null);
    prisma.driver.findUnique.mockResolvedValue(null);
    createUser.mockResolvedValue({
      data: { user: { id: "new-auth-1" } },
      error: null,
    });
    deleteUser.mockResolvedValue({ error: null });
  });

  it("returns RD$2500 base with no referral; does not provision an identity", async () => {
    const quote = await service.quoteAdvertiser({
      expectedScreens: 3,
      campaignMonths: 2,
      includeProduction: false,
    });
    expect(quote.baseMonthlyScreenRate).toBe(2500);
    expect(quote.discountAmount).toBe(0);
    expect(quote.subtotal).toBe(15000);
    expect(prisma.driver.findUnique).not.toHaveBeenCalled();
    expect(createUser).not.toHaveBeenCalled();
  });

  it("validates a driver code in DB and discounts only the screens by 40%", async () => {
    prisma.driver.findUnique.mockResolvedValue({
      id: "verified-driver-1",
      isSimulated: false,
    });
    const quote = await service.quoteAdvertiser({
      expectedScreens: 3,
      campaignMonths: 2,
      includeProduction: true,
      referralCode: "DRIVER_TEST_1",
    });
    expect(prisma.driver.findUnique).toHaveBeenCalledWith({
      where: { referralCode: "DRIVER_TEST_1" },
      select: { id: true, isSimulated: true },
    });
    expect(quote.discountPercent).toBe(40);
    expect(quote.effectiveMonthlyScreenRate).toBe(1500);
    expect(quote.discountAmount).toBe(6000);
    expect(quote.productionFee).toBe(2500);
    expect(quote.subtotal).toBe(11500);
    expect(createUser).not.toHaveBeenCalled();
  });

  it("rejects unknown codes before creating Auth identities or campaigns", async () => {
    await expect(
      service.onboardAdvertiser({
        ...base,
        referralCode: "unknown-driver",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.driver.findUnique).toHaveBeenCalled();
    expect(createUser).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejects simulated drivers as financial referral codes", async () => {
    prisma.driver.findUnique.mockResolvedValue({
      id: "simulated-driver",
      isSimulated: true,
    });
    await expect(
      service.quoteAdvertiser({
        expectedScreens: 1,
        campaignMonths: 1,
        includeProduction: false,
        referralCode: "SIMULATED_DRIVER_CODE",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.onboardAdvertiser({
        ...base,
        referralCode: "SIMULATED_DRIVER_CODE",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(createUser).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("persists verified attribution and recalculated campaign budget, not client budget", async () => {
    prisma.driver.findUnique.mockResolvedValue({
      id: "verified-driver-1",
      isSimulated: false,
    });
    const tx = {
      advertiser: {
        create: jest.fn().mockResolvedValue({
          id: "adv-new",
          companyName: "Company",
        }),
      },
      campaign: { create: jest.fn().mockResolvedValue({ id: "camp-new" }) },
      video: { create: jest.fn() },
    };
    prisma.$transaction.mockImplementation(
      async (callback: (tx: unknown) => unknown) => callback(tx),
    );
    const result = await service.onboardAdvertiser({
      ...base,
      referralCode: "DRIVER_TEST_1",
    });
    expect(tx.advertiser.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "PENDING_REVIEW",
          referredBy: "verified-driver-1",
        }),
      }),
    );
    expect(tx.campaign.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          budget: 11500,
          campaignMonths: 2,
          includeProduction: true,
          status: "PENDING_PAYMENT",
        }),
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        advertiserId: "adv-new",
        campaignId: "camp-new",
        quote: expect.objectContaining({
          subtotal: 11500,
          discountPercent: 40,
        }),
      }),
    );
  });

  it("a spoofed client discount flag never makes an unverified code eligible", async () => {
    const quote = await service.quoteAdvertiser({
      expectedScreens: 1,
      campaignMonths: 1,
      includeProduction: false,
      verifiedDriverCode: true,
    } as never);
    expect(quote.verifiedDriverCode).toBe(false);
    expect(quote.subtotal).toBe(2500);
  });
});
