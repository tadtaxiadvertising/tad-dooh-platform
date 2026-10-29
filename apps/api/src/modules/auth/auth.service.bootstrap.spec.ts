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

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.BOOTSTRAP_SECRET = "test-only-secret";
    listUsers.mockResolvedValue({
      data: { users: [{ id: "supabase-1", email: "admin@example.com" }] },
      error: null,
    });
    updateUserById.mockResolvedValue({ error: null });
  });

  afterAll(() => {
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
    prisma.user.findUnique.mockResolvedValue({ id: "adv-1", role: "ADVERTISER" });
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
    prisma.user.findUnique.mockResolvedValue({ id: "prisma-admin-1", role: "ADMIN" });
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
});
