import { AuthService } from "./auth.service";

describe("AuthService login fails closed on database outage", () => {
  const prisma = {
    user: { findUnique: jest.fn() },
    advertiser: { findUnique: jest.fn() },
    driver: { findFirst: jest.fn() },
  };
  const anonClient = {
    auth: {
      signInWithPassword: jest.fn(),
    },
  };
  const supabase = {
    getAnonClient: jest.fn(() => anonClient),
    getClient: jest.fn(),
  };

  it("does not infer another role when the admin lookup fails", async () => {
    prisma.user.findUnique.mockRejectedValue(new Error("database unavailable"));
    prisma.advertiser.findUnique.mockResolvedValue({ id: "adv-1" });
    prisma.driver.findFirst.mockResolvedValue(null);
    anonClient.auth.signInWithPassword.mockResolvedValue({
      data: {
        user: { id: "auth-1", email: "user@example.com" },
        session: { access_token: "access", refresh_token: "refresh" },
      },
      error: null,
    });

    // Only the dependencies used by login are needed for this regression.
    const service = Object.create(AuthService.prototype) as AuthService & {
      prisma: typeof prisma;
      supabaseService: typeof supabase;
      logger: { log: jest.Mock; error: jest.Mock; debug: jest.Mock };
    };
    Object.assign(service, {
      prisma,
      supabaseService: supabase,
      logger: {
        log: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
      },
    });

    await expect(
      service.login({ email: "user@example.com", password: "password123" }),
    ).rejects.toMatchObject({
      status: 500,
      response: {
        error: "Error interno en el proceso de autenticación",
      },
    });
    expect(supabase.getClient).not.toHaveBeenCalled();
  });
});
