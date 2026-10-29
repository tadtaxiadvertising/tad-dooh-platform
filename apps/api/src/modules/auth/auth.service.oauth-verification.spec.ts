import { AuthService } from "./auth.service";
import { OAuthPortalRole } from "./dto/oauth-exchange.dto";

describe("AuthService OAuth token verification", () => {
  const getUser = jest.fn();
  const supabase = {
    getAnonClient: jest.fn(() => ({ auth: { getUser } })),
    getClient: jest.fn(),
  };
  const prisma = {
    advertiser: { findUnique: jest.fn(), create: jest.fn() },
    user: { findUnique: jest.fn() },
  };

  const service = () => {
    const instance = Object.create(AuthService.prototype) as AuthService;
    Object.assign(instance, {
      supabaseService: supabase,
      prisma,
      logger: { log: jest.fn(), warn: jest.fn(), debug: jest.fn() },
    });
    return instance;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    supabase.getAnonClient.mockReturnValue({ auth: { getUser } });
  });

  it("rejects a token not recognized by Supabase even when a local JWT secret exists", async () => {
    const oldSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = "local-only-test-secret";
    try {
      getUser.mockResolvedValue({ data: { user: null }, error: new Error("invalid") });
      await expect(
        service().exchangeOAuth({
          access_token: "not-a-supabase-token",
          intended_role: OAuthPortalRole.ADVERTISER,
        }),
      ).rejects.toMatchObject({ status: 401 });
      expect(getUser).toHaveBeenCalledWith("not-a-supabase-token");
      expect(prisma.advertiser.create).not.toHaveBeenCalled();
    } finally {
      if (oldSecret === undefined) delete process.env.JWT_SECRET;
      else process.env.JWT_SECRET = oldSecret;
    }
  });

  it("rejects exchange when Supabase Auth verification is unavailable", async () => {
    supabase.getAnonClient.mockReturnValue(undefined as never);
    await expect(
      service().exchangeOAuth({
        access_token: "any-token",
        intended_role: OAuthPortalRole.ADVERTISER,
      }),
    ).rejects.toMatchObject({ status: 401 });
    expect(prisma.advertiser.create).not.toHaveBeenCalled();
  });
});
