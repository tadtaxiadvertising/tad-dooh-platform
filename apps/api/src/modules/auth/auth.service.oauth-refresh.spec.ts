import { AuthService } from "./auth.service";
import { OAuthPortalRole } from "./dto/oauth-exchange.dto";

describe("OAuth exchange claims refresh", () => {
  const getUser = jest.fn();
  const refreshSession = jest.fn();
  const updateUserById = jest.fn();
  const anonClient = { auth: { getUser, refreshSession } };
  const supabase = {
    getAnonClient: jest.fn(() => anonClient),
    getClient: jest.fn(() => ({ auth: { admin: { updateUserById } } })),
  };
  const prisma = {
    user: { findUnique: jest.fn() },
    advertiser: { findUnique: jest.fn(), create: jest.fn() },
    idempotencyKey: { findUnique: jest.fn() },
  };
  const service = () => {
    const instance = Object.create(AuthService.prototype) as AuthService;
    Object.assign(instance, {
      prisma,
      supabaseService: supabase,
      logger: {
        log: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
        error: jest.fn(),
      },
    });
    return instance;
  };
  const dto = {
    access_token: "old-access",
    refresh_token: "old-refresh",
    intended_role: OAuthPortalRole.ADVERTISER,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    getUser.mockResolvedValue({
      data: {
        user: { id: "auth-1", email: "adv@example.com", app_metadata: {} },
      },
      error: null,
    });
    prisma.advertiser.findUnique.mockResolvedValue({
      id: "adv-1",
      email: "adv@example.com",
      contactName: "Advertiser",
      status: "PENDING_REVIEW",
    });
    updateUserById.mockResolvedValue({ error: null });
  });

  it("rejects an OAuth exchange when updated claims cannot be refreshed", async () => {
    refreshSession.mockResolvedValue({
      data: { session: null },
      error: new Error("unavailable"),
    });
    await expect(service().exchangeOAuth(dto)).rejects.toMatchObject({
      status: 403,
    });
    expect(updateUserById).toHaveBeenCalledTimes(1);
  });

  it("rejects when Supabase refuses to update claims", async () => {
    updateUserById.mockResolvedValue({ error: new Error("denied") });
    await expect(service().exchangeOAuth(dto)).rejects.toMatchObject({
      status: 403,
    });
    expect(refreshSession).not.toHaveBeenCalled();
  });

  it("returns only refreshed credentials when claims change", async () => {
    refreshSession.mockResolvedValue({
      data: {
        session: {
          access_token: "fresh-access",
          refresh_token: "fresh-refresh",
        },
      },
      error: null,
    });
    const result = await service().exchangeOAuth(dto);
    expect(result.access_token).toBe("fresh-access");
    expect(result.refresh_token).toBe("fresh-refresh");
  });

  it("does not require refresh when verified claims already match", async () => {
    getUser.mockResolvedValue({
      data: {
        user: {
          id: "auth-1",
          email: "adv@example.com",
          app_metadata: { role: "ADVERTISER", entityId: "adv-1" },
        },
      },
      error: null,
    });
    const result = await service().exchangeOAuth({
      access_token: "valid-access",
      intended_role: OAuthPortalRole.ADVERTISER,
    });
    expect(result.access_token).toBe("valid-access");
    expect(updateUserById).not.toHaveBeenCalled();
    expect(refreshSession).not.toHaveBeenCalled();
  });
  const correlation = "a".repeat(64);
  const committed = {
    driverId: "public-advertiser-onboarding:single-use:v1",
    path: "/onboarding/advertiser",
    method: "POST",
    isLocked: false,
    response: JSON.stringify({
      state: "COMMITTED",
      authUserId: "auth-1",
      advertiserId: "adv-1",
      campaignId: "camp-1",
    }),
  };

  function correlatedIdentity() {
    getUser.mockResolvedValue({
      data: {
        user: {
          id: "auth-1",
          email: "adv@example.com",
          app_metadata: {
            role: "ADVERTISER",
            entityId: "adv-1",
            tad_onboarding_reservation: correlation,
          },
        },
      },
      error: null,
    });
  }

  it("does not auto-create an advertiser when a correlated registration lacks a profile", async () => {
    correlatedIdentity();
    prisma.advertiser.findUnique.mockResolvedValue(null);
    await expect(service().exchangeOAuth(dto)).rejects.toMatchObject({
      status: 403,
      response: {
        code: "ADVERTISER_REGISTRATION_RECONCILIATION_REQUIRED",
      },
    });
    expect(prisma.advertiser.create).not.toHaveBeenCalled();
    expect(updateUserById).not.toHaveBeenCalled();
    expect(refreshSession).not.toHaveBeenCalled();
  });

  it.each([
    null,
    { ...committed, isLocked: true },
    { ...committed, driverId: "other-namespace" },
    { ...committed, response: "{broken" },
    {
      ...committed,
      response: JSON.stringify({
        state: "COMMITTED",
        authUserId: "another-auth",
        advertiserId: "adv-1",
      }),
    },
    {
      ...committed,
      response: JSON.stringify({
        state: "COMMITTED",
        authUserId: "auth-1",
        advertiserId: "another-advertiser",
      }),
    },
  ])(
    "denies unconfirmed or mismatched correlated exchange (%p)",
    async (row) => {
      correlatedIdentity();
      prisma.idempotencyKey.findUnique.mockResolvedValue(row);
      await expect(service().exchangeOAuth(dto)).rejects.toMatchObject({
        status: 403,
      });
      expect(prisma.advertiser.create).not.toHaveBeenCalled();
      expect(updateUserById).not.toHaveBeenCalled();
      expect(refreshSession).not.toHaveBeenCalled();
    },
  );

  it("allows the matching committed correlated advertiser", async () => {
    correlatedIdentity();
    prisma.idempotencyKey.findUnique.mockResolvedValue(committed);
    const result = await service().exchangeOAuth(dto);
    expect(result.user.entityId).toBe("adv-1");
    expect(result.access_token).toBe(dto.access_token);
    expect(prisma.idempotencyKey.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { key: correlation } }),
    );
    expect(updateUserById).not.toHaveBeenCalled();
  });

  it("does not exchange a correlated advertiser identity into an admin session", async () => {
    correlatedIdentity();
    await expect(
      service().exchangeOAuth({
        ...dto,
        intended_role: OAuthPortalRole.ADMIN,
      }),
    ).rejects.toMatchObject({ status: 403 });
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(updateUserById).not.toHaveBeenCalled();
  });

  it("denies admin portal access to a Prisma user without ADMIN role", async () => {
    getUser.mockResolvedValue({
      data: {
        user: { id: "auth-1", email: "staff@example.com", app_metadata: {} },
      },
      error: null,
    });
    prisma.user.findUnique.mockResolvedValue({
      id: "staff-1",
      email: "staff@example.com",
      role: "ADVERTISER",
    });
    await expect(
      service().exchangeOAuth({
        access_token: "staff-token",
        intended_role: OAuthPortalRole.ADMIN,
      }),
    ).rejects.toMatchObject({ status: 403 });
    expect(updateUserById).not.toHaveBeenCalled();
    expect(refreshSession).not.toHaveBeenCalled();
  });

  it("allows a verified ADMIN account to receive ADMIN claims", async () => {
    getUser.mockResolvedValue({
      data: {
        user: {
          id: "auth-admin",
          email: "admin@example.com",
          app_metadata: { role: "ADMIN", entityId: null },
        },
      },
      error: null,
    });
    prisma.user.findUnique.mockResolvedValue({
      id: "admin-1",
      email: "admin@example.com",
      role: "ADMIN",
    });
    const result = await service().exchangeOAuth({
      access_token: "admin-token",
      intended_role: OAuthPortalRole.ADMIN,
    });
    expect(result.access_token).toBe("admin-token");
    expect(updateUserById).not.toHaveBeenCalled();
  });
});
