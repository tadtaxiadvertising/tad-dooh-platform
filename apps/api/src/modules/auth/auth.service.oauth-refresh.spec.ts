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
    advertiser: { findUnique: jest.fn() },
  };
  const service = () => {
    const instance = Object.create(AuthService.prototype) as AuthService;
    Object.assign(instance, {
      prisma, supabaseService: supabase,
      logger: { log: jest.fn(), warn: jest.fn(), debug: jest.fn(), error: jest.fn() },
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
      data: { user: { id: "auth-1", email: "adv@example.com", app_metadata: {} } },
      error: null,
    });
    prisma.advertiser.findUnique.mockResolvedValue({
      id: "adv-1", email: "adv@example.com", contactName: "Advertiser", status: "PENDING_REVIEW",
    });
    updateUserById.mockResolvedValue({ error: null });
  });

  it("rejects an OAuth exchange when updated claims cannot be refreshed", async () => {
    refreshSession.mockResolvedValue({ data: { session: null }, error: new Error("unavailable") });
    await expect(service().exchangeOAuth(dto)).rejects.toMatchObject({ status: 403 });
    expect(updateUserById).toHaveBeenCalledTimes(1);
  });

  it("rejects when Supabase refuses to update claims", async () => {
    updateUserById.mockResolvedValue({ error: new Error("denied") });
    await expect(service().exchangeOAuth(dto)).rejects.toMatchObject({ status: 403 });
    expect(refreshSession).not.toHaveBeenCalled();
  });

  it("returns only refreshed credentials when claims change", async () => {
    refreshSession.mockResolvedValue({
      data: { session: { access_token: "fresh-access", refresh_token: "fresh-refresh" } },
      error: null,
    });
    const result = await service().exchangeOAuth(dto);
    expect(result.access_token).toBe("fresh-access");
    expect(result.refresh_token).toBe("fresh-refresh");
  });

  it("does not require refresh when verified claims already match", async () => {
    getUser.mockResolvedValue({
      data: { user: {
        id: "auth-1", email: "adv@example.com",
        app_metadata: { role: "ADVERTISER", entityId: "adv-1" },
      } },
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
});
