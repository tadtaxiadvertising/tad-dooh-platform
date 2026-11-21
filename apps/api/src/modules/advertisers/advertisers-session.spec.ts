import "reflect-metadata";
import { UnauthorizedException } from "@nestjs/common";
import { IS_PUBLIC_KEY } from "../auth/decorators/public.decorator";
import * as jwt from "jsonwebtoken";
import { AdvertisersService } from "./advertisers.service";
import { AdvertisersController } from "./advertisers.controller";

describe("Advertiser server-issued session verification", () => {
  const secret = "fixture-only-hs256-secret-not-production";
  const findUnique = jest.fn();
  const prisma = { advertiser: { findUnique } };
  const config = {
    get: jest.fn((key: string) =>
      key === "SUPABASE_JWT_SECRET" ? secret : undefined,
    ),
  };
  const service = new AdvertisersService(prisma as never, config as never);
  const controller = new AdvertisersController(service);

  const legacyPayload = {
    sub: "advertiser-1",
    email: "adv@example.test",
    role: "ADVERTISER",
    app_metadata: { role: "ADVERTISER", entityId: "advertiser-1" },
  };
  const sign = (payload: Record<string, unknown> = {}) =>
    jwt.sign({ ...legacyPayload, ...payload }, secret, {
      algorithm: "HS256",
      expiresIn: "1h",
    });

  beforeEach(() => {
    jest.clearAllMocks();
    findUnique.mockResolvedValue({
      id: "advertiser-1",
      email: "adv@example.test",
      status: "ACTIVE",
    });
  });

  it("verifies JWT signature, advertiser DB identity, and current status", async () => {
    const token = sign();
    const session = await service.verifyAdvertiserSession(token);
    expect(session).toEqual({
      role: "ADVERTISER",
      advertiserId: "advertiser-1",
      status: "ACTIVE",
    });
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: "advertiser-1" },
      select: { id: true, email: true, status: true },
    });
  });

  it("never trusts an unsigned token, wrong signing key or expired signature", async () => {
    const unsigned = jwt.sign(legacyPayload, "wrong-secret", {
      algorithm: "HS256",
    });
    const expired = jwt.sign(legacyPayload, secret, {
      algorithm: "HS256",
      expiresIn: -5,
    });
    const none = [
      Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString(
        "base64url",
      ),
      Buffer.from(JSON.stringify(legacyPayload)).toString("base64url"),
      "",
    ].join(".");
    for (const token of [
      "not-a-jwt",
      none,
      unsigned,
      expired,
      "a".repeat(8200),
    ]) {
      await expect(
        service.verifyAdvertiserSession(token),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    }
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("prevents role confusion, missing entity ownership and reset-token reuse", async () => {
    const invalid = [
      sign({ role: "DRIVER" }),
      sign({ app_metadata: { role: "DRIVER", entityId: "advertiser-1" } }),
      sign({ app_metadata: { role: "ADVERTISER", entityId: "someone-else" } }),
      sign({ purpose: "reset" }),
      sign({ sub: "" }),
    ];
    for (const token of invalid) {
      await expect(
        service.verifyAdvertiserSession(token),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    }
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("refuses deleted advertisers and identity email mismatches", async () => {
    findUnique.mockResolvedValueOnce(null);
    await expect(
      service.verifyAdvertiserSession(sign()),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    findUnique.mockResolvedValueOnce({
      id: "advertiser-1",
      email: "other@example.test",
      status: "ACTIVE",
    });
    await expect(
      service.verifyAdvertiserSession(sign()),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("keeps pending-review users in onboarding but rejects suspended users", async () => {
    findUnique.mockResolvedValueOnce({
      id: "advertiser-1",
      email: "adv@example.test",
      status: "PENDING_REVIEW",
    });
    const pending = await service.verifyAdvertiserSession(sign());
    expect(pending.status).toBe("PENDING_REVIEW");
    findUnique.mockResolvedValueOnce({
      id: "advertiser-1",
      email: "adv@example.test",
      status: "SUSPENDED",
    });
    await expect(
      service.verifyAdvertiserSession(sign()),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("requires an auth header and never treats client-supplied role as evidence", async () => {
    expect(
      Reflect.getMetadata(
        IS_PUBLIC_KEY,
        AdvertisersController.prototype.verifySession,
      ),
    ).toBe(true);
    await expect(controller.verifySession(undefined)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    await expect(
      controller.verifySession("Bearer not-valid"),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    const result = await controller.verifySession("Bearer " + sign());
    expect(result.advertiserId).toBe("advertiser-1");
  });
});
