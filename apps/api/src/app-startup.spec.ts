import { INestApplication, Logger } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import * as jwt from "jsonwebtoken";

describe("API module startup and global authentication", () => {
  let app: INestApplication | undefined;
  const fixture = {
    NODE_ENV: "test",
    JWT_SECRET: "synthetic-startup-secret-for-local-tests-217",
    SUPABASE_JWT_SECRET: "synthetic-startup-secret-for-local-tests-217",
    SUPABASE_URL: "http://127.0.0.1:1",
    SUPABASE_SERVICE_ROLE_KEY: "synthetic-startup-service-key",
    SUPABASE_ANON_KEY: "synthetic-startup-anon-key",
    DATABASE_URL: "postgresql://synthetic:synthetic@127.0.0.1:1/no_connection",
    DIRECT_URL: "postgresql://synthetic:synthetic@127.0.0.1:1/no_connection",
  };
  const previous = Object.fromEntries(
    Object.keys(fixture).map((key) => [key, process.env[key]]),
  );
  // Load/transform the module graph as fixture setup. The behavioral timeout
  // below covers module initialization and HTTP, not ts-jest's first transform.
  Object.assign(process.env, fixture);
  const { AppModule } =
    require("./app.module") as typeof import("./app.module");
  const { PrismaService } =
    require("./modules/prisma/prisma.service") as typeof import("./modules/prisma/prisma.service");
  const { SupabaseService } =
    require("./modules/supabase/supabase.service") as typeof import("./modules/supabase/supabase.service");
  const { SheetsService } =
    require("./modules/sheets/sheets.service") as typeof import("./modules/sheets/sheets.service");
  const { EmailService } =
    require("./modules/notifications/email.service") as typeof import("./modules/notifications/email.service");
  const { SupabaseAuthGuard } =
    require("./modules/auth/guards/supabase-auth.guard") as typeof import("./modules/auth/guards/supabase-auth.guard");

  afterAll(async () => {
    await app?.close();
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    jest.restoreAllMocks();
  });

  it("boots the real module graph and authenticates settings/BI through the global guard once", async () => {
    jest.spyOn(Logger.prototype, "log").mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
    const emptyModel = {
      findMany: jest.fn().mockResolvedValue([]),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    };
    const prisma = {
      isDatabaseAvailable: false,
      device: emptyModel,
      deviceHeartbeat: emptyModel,
      analyticsEvent: emptyModel,
      systemSetting: emptyModel,
    };
    const authClient = { auth: { getUser: jest.fn() } };
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(SupabaseService)
      .useValue({
        getClient: () => authClient,
        getAuthClient: () => authClient,
      })
      // Never contact optional providers from the module integration test.
      .overrideProvider(SheetsService)
      .useValue({})
      .overrideProvider(EmailService)
      .useValue({})
      .compile();
    app = module.createNestApplication({ logger: false });
    app.setGlobalPrefix("api/v1");
    await app.listen(0, "127.0.0.1");
    const origin = await app.getUrl();
    // Observe the real guard; do not replace its authorization behavior.
    const authentication = jest.spyOn(
      SupabaseAuthGuard.prototype,
      "canActivate",
    );
    for (const path of ["/api/v1/system-settings", "/api/v1/bi/kpis"]) {
      authentication.mockClear();
      const response = await fetch(origin + path);
      expect(response.status).toBe(401);
      await response.arrayBuffer();
      expect(authentication).toHaveBeenCalledTimes(1);
    }
    const session = (role: string) =>
      jwt.sign(
        {
          sub: "startup-user-fixture",
          session_id: "startup-session-fixture",
          role: "authenticated",
          app_metadata: { role },
        },
        fixture.JWT_SECRET,
        { audience: "authenticated", expiresIn: "1m" },
      );
    for (const role of ["DRIVER", "ADMIN"]) {
      for (const method of ["GET", "PUT"]) {
        authentication.mockClear();
        const response = await fetch(origin + "/api/v1/system-settings", {
          method,
          headers: {
            authorization: "Bearer " + session(role),
            "content-type": "application/json",
          },
          ...(method === "PUT" ? { body: "{}" } : {}),
        });
        expect(response.status).toBe(role === "ADMIN" ? 200 : 403);
        await response.arrayBuffer();
        expect(authentication).toHaveBeenCalledTimes(1);
      }
    }
    expect(authClient.auth.getUser).not.toHaveBeenCalled();
  }, 30_000);
});
