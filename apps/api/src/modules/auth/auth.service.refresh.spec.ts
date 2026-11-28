import { AuthService } from "./auth.service";

describe("AuthService login token refresh security", () => {
  const prisma = {
    user: { findUnique: jest.fn() },
    advertiser: { findUnique: jest.fn() },
    driver: { findUnique: jest.fn() },
  };
  const anonClient = {
    auth: {
      signInWithPassword: jest.fn(),
      refreshSession: jest.fn(),
    },
  };
  const adminUpdate = jest.fn();
  const supabase = {
    getAnonClient: jest.fn(() => anonClient),
    getClient: jest.fn(() => ({
      auth: { admin: { updateUserById: adminUpdate } },
    })),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.advertiser.findUnique.mockResolvedValue({ id: "advertiser-1" });
    prisma.driver.findUnique.mockResolvedValue(null);
    anonClient.auth.signInWithPassword.mockResolvedValue({
      data: {
        user: { id: "auth-1", email: "adv@example.com" },
        session: { access_token: "old-token", refresh_token: "old-refresh" },
      },
      error: null,
    });
    adminUpdate.mockResolvedValue({ error: null });
  });

  const service = () => {
    const instance = Object.create(AuthService.prototype) as AuthService;
    Object.assign(instance, {
      prisma,
      supabaseService: supabase,
      logger: {
        log: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn(),
      },
    });
    return instance;
  };

  it("rejects login if refresh fails instead of returning stale claims", async () => {
    anonClient.auth.refreshSession.mockResolvedValue({
      data: { session: null },
      error: new Error("refresh unavailable"),
    });
    await expect(
      service().login({ email: "adv@example.com", password: "password123" }),
    ).rejects.toMatchObject({ status: 403 });
    expect(anonClient.auth.refreshSession).toHaveBeenCalledTimes(1);
  });

  it("returns only refreshed tokens after successful claims update", async () => {
    anonClient.auth.refreshSession.mockResolvedValue({
      data: {
        session: { access_token: "new-token", refresh_token: "new-refresh" },
      },
      error: null,
    });
    const result = await service().login({
      email: "adv@example.com",
      password: "password123",
    });
    expect(result.access_token).toBe("new-token");
    expect(result.refresh_token).toBe("new-refresh");
    expect(result.user.role).toBe("ADVERTISER");
  });

  it("rejects login when claims cannot be updated", async () => {
    adminUpdate.mockResolvedValue({ error: new Error("update denied") });
    await expect(
      service().login({ email: "adv@example.com", password: "password123" }),
    ).rejects.toMatchObject({ status: 403 });
    expect(anonClient.auth.refreshSession).not.toHaveBeenCalled();
  });
});
