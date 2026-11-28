import { UnauthorizedException } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import * as jwt from "jsonwebtoken";
import { AdvertisersService } from "./advertisers.service";

describe("AdvertisersService password-login status alignment", () => {
  const fixtureSecret = "test-only-signed-advertiser-session-key";
  const findUnique = jest.fn();
  const prisma = { advertiser: { findUnique } };
  const config = {
    get: jest.fn((name: string) =>
      name === "SUPABASE_JWT_SECRET" ? fixtureSecret : undefined,
    ),
  };
  const service = new AdvertisersService(prisma as never, config as never);
  let passwordHash: string;

  beforeAll(async () => {
    passwordHash = await bcrypt.hash("fixture-password", 4);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    findUnique.mockResolvedValue({
      id: "advertiser-1",
      email: "adv@example.test",
      password: passwordHash,
      status: "ACTIVE",
      companyName: "Test Merchant",
      category: null,
      phone: null,
    });
  });

  it.each(["ACTIVE", "PENDING_REVIEW"])(
    "issues a verifiable advertiser token for %s",
    async (status) => {
      findUnique.mockResolvedValueOnce({
        id: "advertiser-1",
        email: "adv@example.test",
        password: passwordHash,
        status,
        companyName: "Test Merchant",
      });
      const session = await service.login(
        "adv@example.test",
        "fixture-password",
      );
      expect(session.status).toBe(status);
      expect(session.role).toBe("ADVERTISER");
      const payload = jwt.verify(session.access_token, fixtureSecret, {
        algorithms: ["HS256"],
      }) as jwt.JwtPayload;
      expect(payload.sub).toBe("advertiser-1");
      expect(payload.app_metadata).toEqual({
        role: "ADVERTISER",
        entityId: "advertiser-1",
      });
      // Align issue-time status with the current database-backed verifier.
      findUnique.mockResolvedValue({
        id: "advertiser-1",
        email: "adv@example.test",
        status,
      });
      await expect(
        service.verifyAdvertiserSession(session.access_token),
      ).resolves.toMatchObject({
        role: "ADVERTISER",
        status,
        advertiserId: "advertiser-1",
      });
    },
  );

  it.each(["SUSPENDED", "DISABLED", "UNKNOWN"])(
    "does not issue an unusable signed session to %s accounts",
    async (status) => {
      findUnique.mockResolvedValueOnce({
        id: "advertiser-1",
        email: "adv@example.test",
        password: passwordHash,
        status,
      });
      await expect(
        service.login("adv@example.test", "fixture-password"),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    },
  );

  it("rejects wrong passwords without disclosing advertiser account status", async () => {
    findUnique.mockResolvedValue({
      id: "advertiser-1",
      email: "adv@example.test",
      password: passwordHash,
      status: "SUSPENDED",
    });
    await expect(
      service.login("adv@example.test", "incorrect-password"),
    ).rejects.toThrow("Credenciales inválidas");
  });

  it("rejects unknown email before attempting signed-session issuance", async () => {
    findUnique.mockResolvedValue(null);
    await expect(
      service.login("unknown@example.test", "fixture-password"),
    ).rejects.toThrow("Credenciales inválidas");
  });
});
