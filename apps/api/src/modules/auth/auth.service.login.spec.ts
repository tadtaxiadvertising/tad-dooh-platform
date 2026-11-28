import { AuthService } from "./auth.service";

describe("AuthService login fails closed on database outage", () => {
  const prisma = {
    user: { findUnique: jest.fn() },
    advertiser: { findUnique: jest.fn() },
    driver: { findUnique: jest.fn() },
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
    prisma.driver.findUnique.mockResolvedValue(null);
    anonClient.auth.signInWithPassword.mockResolvedValue({
      data: {
        user: { id: "auth-1", email: "user@example.com" },
        session: { access_token: "access", refresh_token: "refresh" },
      },
      error: null,
    });

    // Only the dependencies used by login are needed for this regression.
    const service = Object.create(AuthService.prototype) as AuthService;
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
  it("rejects a user with missing admin role without issuing claims", async () => {
    jest.clearAllMocks();
    prisma.user.findUnique.mockResolvedValue({ id: "user-1", role: null });
    prisma.advertiser.findUnique.mockResolvedValue(null);
    prisma.driver.findUnique.mockResolvedValue(null);
    anonClient.auth.signInWithPassword.mockResolvedValue({
      data: {
        user: { id: "auth-1", email: "user@example.com" },
        session: { access_token: "access", refresh_token: "refresh" },
      },
      error: null,
    });
    const service = Object.create(AuthService.prototype) as AuthService;
    Object.assign(service, {
      prisma,
      supabaseService: supabase,
      logger: {
        log: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn(),
      },
    });
    await expect(
      service.login({
        email: "user@example.com",
        password: "password123",
      }),
    ).rejects.toMatchObject({ status: 403 });
    expect(supabase.getClient).not.toHaveBeenCalled();
  });

  it("does not return a locally signed token after driver registration", async () => {
    const driverPrisma = {
      driver: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest
          .fn()
          .mockResolvedValue({ id: "driver-1", phone: "8095550000" }),
      },
    };
    const service = Object.create(AuthService.prototype) as AuthService;
    Object.assign(service, { prisma: driverPrisma });
    const result = await service.registerDriver({
      name: "Driver",
      phone: "8095550000",
      password: "password123",
    });
    expect(result).toEqual({
      success: true,
      message: "Registro completado. Inicia sesión para continuar.",
      driverId: "driver-1",
    });
    expect(result).not.toHaveProperty("access_token");
  });

  it.each([
    { name: "", phone: "8095550000", password: "password123" },
    { name: "Driver", phone: " ", password: "password123" },
    { name: "Driver", phone: "8095550000", password: "short" },
  ])(
    "rejects invalid driver registration before database access: %p",
    async (data) => {
      const driverPrisma = {
        driver: { findUnique: jest.fn(), create: jest.fn() },
      };
      const service = Object.create(AuthService.prototype) as AuthService;
      Object.assign(service, { prisma: driverPrisma });
      await expect(service.registerDriver(data)).rejects.toMatchObject({
        status: 400,
      });
      expect(driverPrisma.driver.findUnique).not.toHaveBeenCalled();
      expect(driverPrisma.driver.create).not.toHaveBeenCalled();
    },
  );

  describe("F1: driver identity binding", () => {
    it("resolves a driver only through a verified authUserId link", async () => {
      const anonClient = {
        auth: {
          signInWithPassword: jest.fn(),
          refreshSession: jest.fn().mockResolvedValue({
            data: { session: { access_token: "t", refresh_token: "r" } },
            error: null,
          }),
        },
      };
      const supabase = {
        getAnonClient: jest.fn(() => anonClient),
        getClient: jest.fn(() => ({
          auth: {
            admin: {
              updateUserById: jest.fn().mockResolvedValue({ error: null }),
            },
          },
        })),
      };
      const prisma = {
        user: {
          findUnique: jest
            .fn()
            .mockResolvedValue({ id: "admin-1", role: null }),
        },
        advertiser: { findUnique: jest.fn().mockResolvedValue(null) },
        driver: {
          findUnique: jest
            .fn()
            .mockResolvedValue({ id: "driver-1", authUserId: "auth-1" }),
          findFirst: jest.fn(),
        },
      };
      anonClient.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: { id: "auth-1", email: "driver@example.test" },
          session: { access_token: "t", refresh_token: "r" },
        },
      });
      const service = Object.create(AuthService.prototype) as AuthService;
      Object.assign(service, {
        prisma,
        supabaseService: supabase,
        logger: { log: jest.fn(), error: jest.fn(), debug: jest.fn() },
      });
      const outcome = await service.login({
        email: "driver@example.test",
        password: "password123",
      });
      expect(prisma.driver.findUnique).toHaveBeenCalledWith({
        where: { authUserId: "auth-1" },
      });
      expect(prisma.driver.findFirst).not.toHaveBeenCalled();
      expect(outcome).toHaveProperty("user.role", "DRIVER");
      expect(outcome).toHaveProperty("user.entityId", "driver-1");
    });

    it("denies a different account that shares a phone prefix (no prefix inference)", async () => {
      const anonClient = {
        auth: {
          signInWithPassword: jest.fn(),
          refreshSession: jest.fn().mockResolvedValue({
            data: { session: { access_token: "t", refresh_token: "r" } },
            error: null,
          }),
        },
      };
      const supabase = {
        getAnonClient: jest.fn(() => anonClient),
        getClient: jest.fn(() => ({
          auth: {
            admin: {
              updateUserById: jest.fn().mockResolvedValue({ error: null }),
            },
          },
        })),
      };
      const prisma = {
        user: {
          findUnique: jest
            .fn()
            .mockResolvedValue({ id: "admin-1", role: null }),
        },
        advertiser: { findUnique: jest.fn().mockResolvedValue(null) },
        driver: { findUnique: jest.fn().mockResolvedValue(null) },
      };
      anonClient.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: { id: "attacker-auth", email: "attacker@example.test" },
          session: { access_token: "t", refresh_token: "r" },
        },
      });
      const service = Object.create(AuthService.prototype) as AuthService;
      Object.assign(service, {
        prisma,
        supabaseService: supabase,
        logger: {
          log: jest.fn(),
          error: jest.fn(),
          debug: jest.fn(),
          warn: jest.fn(),
        },
      });
      await expect(
        service.login({
          email: "attacker@example.test",
          password: "password123",
        }),
      ).rejects.toThrow();
      expect(prisma.driver.findUnique).toHaveBeenCalledWith({
        where: { authUserId: "attacker-auth" },
      });
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: "attacker@example.test" },
      });
    });
  });
});
