import { AuthService } from "./auth.service";

describe("AuthService bootstrap sync", () => {
  const prisma = {
    user: { findMany: jest.fn() },
    advertiser: { findMany: jest.fn() },
    driver: { findMany: jest.fn() },
  };
  const listUsers = jest.fn();
  const updateUserById = jest.fn();
  const createUser = jest.fn();
  const supabase = {
    getClient: jest.fn(() => ({
      auth: { admin: { listUsers, updateUserById, createUser } },
    })),
  };
  const originalSecret = process.env.BOOTSTRAP_SECRET;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.BOOTSTRAP_SECRET = "test-secret";
    prisma.user.findMany.mockResolvedValue([]);
    prisma.advertiser.findMany.mockResolvedValue([
      { id: "adv-1", email: "advertiser@example.com" },
    ]);
    prisma.driver.findMany.mockResolvedValue([]);
    updateUserById.mockResolvedValue({ error: null });
  });

  afterAll(() => {
    if (originalSecret === undefined) delete process.env.BOOTSTRAP_SECRET;
    else process.env.BOOTSTRAP_SECRET = originalSecret;
  });

  const service = () => {
    const instance = Object.create(AuthService.prototype) as AuthService;
    Object.assign(instance, {
      prisma,
      supabaseService: supabase,
      logger: { log: jest.fn(), warn: jest.fn(), debug: jest.fn() },
    });
    return instance;
  };

  it("never creates a new identity with a shared password", async () => {
    listUsers.mockResolvedValue({ data: { users: [] }, error: null });
    const result = await service().syncUsersToSupabaseAuth("test-secret");
    expect(result.synced).toBe(0);
    expect(result.errors).toHaveLength(1);
    expect(createUser).not.toHaveBeenCalled();
  });

  it("updates an existing identity after one paginated listing", async () => {
    listUsers.mockResolvedValue({
      data: { users: [{ id: "auth-1", email: "advertiser@example.com" }] },
      error: null,
    });
    const result = await service().syncUsersToSupabaseAuth("test-secret");
    expect(result).toEqual({ synced: 1, errors: [] });
    expect(listUsers).toHaveBeenCalledTimes(1);
    expect(updateUserById).toHaveBeenCalledWith(
      "auth-1",
      { app_metadata: { role: "ADVERTISER", entityId: "adv-1" } },
    );
  });

  it("rejects an invalid secret before listing identities", async () => {
    await expect(service().syncUsersToSupabaseAuth("invalid")).rejects.toMatchObject({
      status: 403,
    });
    expect(listUsers).not.toHaveBeenCalled();
  });
});
