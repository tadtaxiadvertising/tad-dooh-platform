import { AuthService } from "./auth.service";

describe("AuthService bootstrap confirmation authorization", () => {
  const prisma = { user: { findUnique: jest.fn() } };
  const listUsers = jest.fn();
  const updateUserById = jest.fn();
  const supabase = {
    getClient: jest.fn(() => ({
      auth: { admin: { listUsers, updateUserById } },
    })),
  };
  const previousSecret = process.env.BOOTSTRAP_SECRET;
  const previousEnabled = process.env.BOOTSTRAP_MAINTENANCE_ENABLED;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.BOOTSTRAP_SECRET = "test-only-secret";
    process.env.BOOTSTRAP_MAINTENANCE_ENABLED = "true";
    listUsers.mockResolvedValue({
      data: { users: [{ id: "supabase-1", email: "admin@example.com" }] },
      error: null,
    });
    updateUserById.mockResolvedValue({ error: null });
  });

  afterAll(() => {
    if (previousEnabled === undefined)
      delete process.env.BOOTSTRAP_MAINTENANCE_ENABLED;
    else process.env.BOOTSTRAP_MAINTENANCE_ENABLED = previousEnabled;
    if (previousSecret === undefined) delete process.env.BOOTSTRAP_SECRET;
    else process.env.BOOTSTRAP_SECRET = previousSecret;
  });

  const service = () => {
    const instance = Object.create(AuthService.prototype) as AuthService;
    Object.assign(instance, {
      prisma,
      supabaseService: supabase,
      logger: { log: jest.fn(), error: jest.fn() },
    });
    return instance;
  };

  it("rejects a non-admin without touching Supabase", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "adv-1",
      role: "ADVERTISER",
    });
    await expect(
      service().confirmUserByEmail("admin@example.com", "test-only-secret"),
    ).rejects.toMatchObject({ status: 403 });
    expect(supabase.getClient).not.toHaveBeenCalled();
  });

  it("rejects a missing Prisma administrator", async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(
      service().confirmUserByEmail("admin@example.com", "test-only-secret"),
    ).rejects.toMatchObject({ status: 403 });
    expect(updateUserById).not.toHaveBeenCalled();
  });

  it("sets metadata using the authorized Prisma admin id", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "prisma-admin-1",
      role: "ADMIN",
    });
    await expect(
      service().confirmUserByEmail("admin@example.com", "test-only-secret"),
    ).resolves.toEqual({ confirmed: true });
    expect(updateUserById).toHaveBeenCalledWith(
      "supabase-1",
      expect.objectContaining({
        email_confirm: true,
        app_metadata: { role: "ADMIN", entityId: "prisma-admin-1" },
      }),
    );
  });

  it("rejects invalid bootstrap secret before database access", async () => {
    await expect(
      service().confirmUserByEmail("admin@example.com", "wrong-secret"),
    ).rejects.toMatchObject({ status: 403 });
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
  it("finds an authorized admin beyond the first Auth page", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "prisma-admin-1",
      role: "ADMIN",
    });
    const firstPage = Array.from({ length: 1000 }, (_, i) => ({
      id: `auth-${i}`,
      email: `other-${i}@example.com`,
    }));
    listUsers
      .mockResolvedValueOnce({ data: { users: firstPage }, error: null })
      .mockResolvedValueOnce({
        data: { users: [{ id: "supabase-1", email: "admin@example.com" }] },
        error: null,
      });
    await expect(
      service().confirmUserByEmail("admin@example.com", "test-only-secret"),
    ).resolves.toEqual({ confirmed: true });
    expect(listUsers).toHaveBeenCalledTimes(2);
    expect(updateUserById).toHaveBeenCalledWith(
      "supabase-1",
      expect.objectContaining({
        app_metadata: { role: "ADMIN", entityId: "prisma-admin-1" },
      }),
    );
  });

  it("fails closed if a later Auth page cannot be listed", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "prisma-admin-1",
      role: "ADMIN",
    });
    listUsers
      .mockResolvedValueOnce({
        data: {
          users: Array.from({ length: 1000 }, (_, i) => ({
            id: `auth-${i}`,
            email: `other-${i}@example.com`,
          })),
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: null,
        error: new Error("page unavailable"),
      });
    await expect(
      service().confirmUserByEmail("admin@example.com", "test-only-secret"),
    ).rejects.toThrow("Failed to list users on page 2");
    expect(updateUserById).not.toHaveBeenCalled();
  });

  it.each([undefined, "false", "TRUE"])(
    "rejects maintenance when feature flag is %s before DB or Auth access",
    async (enabled) => {
      if (enabled === undefined)
        delete process.env.BOOTSTRAP_MAINTENANCE_ENABLED;
      else process.env.BOOTSTRAP_MAINTENANCE_ENABLED = enabled;
      await expect(
        service().confirmUserByEmail("admin@example.com", "test-only-secret"),
      ).rejects.toMatchObject({ status: 403 });
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
      expect(supabase.getClient).not.toHaveBeenCalled();
    },
  );
});
