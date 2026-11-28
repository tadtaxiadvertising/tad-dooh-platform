import { ExecutionContext, UnauthorizedException } from "@nestjs/common";
import * as jwt from "jsonwebtoken";
import { SupabaseAuthGuard } from "./supabase-auth.guard";
import { TenantGuard } from "./tenant.guard";

describe("SupabaseAuthGuard token purpose isolation", () => {
  const secret = "unit-test-only-secret-with-at-least-32-chars";
  const getUser = jest.fn();
  const supabase = {
    getAnonClient: jest.fn(() => ({ auth: { getUser } })),
    getClient: jest.fn(),
  };
  const config = {
    get: jest.fn((key: string) =>
      key === "SUPABASE_JWT_SECRET" || key === "JWT_SECRET"
        ? secret
        : undefined,
    ),
  };
  const reflector = { getAllAndOverride: jest.fn() };
  const verifyAdvertiserSession = jest.fn();
  const advertisersService = { verifyAdvertiserSession };
  const prisma = { idempotencyKey: { findUnique: jest.fn() } };

  let guard: SupabaseAuthGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    verifyAdvertiserSession.mockResolvedValue({
      role: "ADVERTISER",
      advertiserId: "advertiser-1",
      status: "ACTIVE",
    });
    getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "invalid session" },
    });
    reflector.getAllAndOverride.mockReturnValue(false);
    guard = new SupabaseAuthGuard(
      reflector as never,
      supabase as never,
      config as never,
      advertisersService as never,
      prisma as never,
    );
  });

  function contextFor(token: string, isPublic = false) {
    reflector.getAllAndOverride.mockReturnValue(isPublic);
    const request: {
      headers: { authorization: string };
      url: string;
      user?: { id: string; role: string; entityId?: string | null };
    } = {
      headers: { authorization: `Bearer ${token}` },
      url: "/api/v1/protected",
    };
    const context = {
      getHandler: () => function handler() {},
      getClass: () => class Controller {},
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
    return { context, request };
  }

  it("rejects a real hardware pairing JWT on protected API routes", async () => {
    const token = jwt.sign({ sub: "driver-1", type: "pairing" }, secret, {
      expiresIn: "5m",
    });
    const { context, request } = contextFor(token);
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(request.user).toBeUndefined();
    expect(getUser).not.toHaveBeenCalled();
  });

  it("rejects pairing tokens even when they include a user-session audience", async () => {
    const token = jwt.sign(
      { sub: "driver-2", type: "pairing", app_metadata: { role: "ADMIN" } },
      secret,
      { audience: "authenticated", expiresIn: "5m" },
    );
    const { context } = contextFor(token);
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(getUser).not.toHaveBeenCalled();
  });

  it("ignores pairing JWT identity on public routes", async () => {
    const token = jwt.sign({ sub: "driver-3", type: "pairing" }, secret, {
      expiresIn: "5m",
    });
    const { context, request } = contextFor(token, true);
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toBeUndefined();
    expect(getUser).not.toHaveBeenCalled();
  });

  it("rejects a signed non-session JWT without the authenticated audience", async () => {
    const token = jwt.sign(
      { sub: "other-token", app_metadata: { role: "ADMIN" } },
      secret,
      { expiresIn: "5m" },
    );
    const { context, request } = contextFor(token);
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(request.user).toBeUndefined();
    expect(getUser).toHaveBeenCalledTimes(1);
  });

  it("accepts a valid Supabase-shaped access token with user identity", async () => {
    const token = jwt.sign(
      {
        sub: "auth-user-1",
        session_id: "supabase-session-1",
        role: "authenticated",
        email: "admin@example.com",
        app_metadata: { role: "ADMIN", entityId: "admin-1" },
      },
      secret,
      { audience: "authenticated", expiresIn: "1h" },
    );
    const { context, request } = contextFor(token);
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toMatchObject({
      id: "auth-user-1",
      role: "ADMIN",
      entityId: "admin-1",
    });
    expect(getUser).not.toHaveBeenCalled();
  });

  it("rejects an audience-matched token without a Supabase session_id", async () => {
    const token = jwt.sign(
      {
        sub: "driver-4",
        role: "authenticated",
        app_metadata: { role: "ADMIN" },
      },
      secret,
      { audience: "authenticated", expiresIn: "5m" },
    );
    const { context, request } = contextFor(token);
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(request.user).toBeUndefined();
    expect(getUser).toHaveBeenCalledTimes(1);
  });

  it("rejects a non-user role even when audience and session_id are present", async () => {
    const token = jwt.sign(
      {
        sub: "service-token",
        role: "service_role",
        session_id: "not-user-session",
      },
      secret,
      { audience: "authenticated", expiresIn: "5m" },
    );
    const { context, request } = contextFor(token);
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(request.user).toBeUndefined();
    expect(getUser).toHaveBeenCalledTimes(1);
  });

  it("preserves Supabase network verification when local signature differs", async () => {
    getUser.mockResolvedValueOnce({
      data: {
        user: {
          id: "network-auth-user",
          email: "advertiser@example.com",
          app_metadata: { role: "ADVERTISER", entityId: "advertiser-1" },
        },
      },
      error: null,
    });
    const token = jwt.sign(
      {
        sub: "network-auth-user",
        role: "authenticated",
        session_id: "network-session-1",
      },
      "different-signing-key-used-only-in-test",
      { audience: "authenticated", expiresIn: "1h" },
    );
    const { context, request } = contextFor(token);
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toMatchObject({
      id: "network-auth-user",
      role: "ADVERTISER",
      entityId: "advertiser-1",
    });
    expect(getUser).toHaveBeenCalledWith(token);
  });

  it("does not accept a signed token without a user subject", async () => {
    const token = jwt.sign({ app_metadata: { role: "ADMIN" } }, secret, {
      audience: "authenticated",
      expiresIn: "5m",
    });
    const { context, request } = contextFor(token);
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(request.user).toBeUndefined();
    expect(getUser).toHaveBeenCalledTimes(1);
  });
  it("does not resurrect revoked ADMIN claims after Supabase network verification", async () => {
    getUser.mockResolvedValueOnce({
      data: {
        user: {
          id: "auth-user-demoted",
          email: "demoted@example.com",
          app_metadata: { role: "ADVERTISER", entityId: "adv-verified" },
        },
      },
      error: null,
    });
    const token = jwt.sign(
      {
        sub: "auth-user-demoted",
        session_id: "session-demoted",
        role: "authenticated",
        app_metadata: { role: "ADMIN", entityId: "admin-stale" },
      },
      "different-signing-key-used-only-in-test",
      { audience: "authenticated", expiresIn: "1h" },
    );
    const { context, request } = contextFor(token);
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toMatchObject({
      id: "auth-user-demoted",
      role: "ADVERTISER",
      entityId: "adv-verified",
    });
    expect(getUser).toHaveBeenCalledWith(token);
  });

  it("fails closed when server metadata no longer grants a role", async () => {
    getUser.mockResolvedValueOnce({
      data: {
        user: {
          id: "auth-user-revoked",
          email: "revoked@example.com",
          app_metadata: {},
        },
      },
      error: null,
    });
    const token = jwt.sign(
      {
        sub: "auth-user-revoked",
        session_id: "session-revoked",
        role: "authenticated",
        app_metadata: { role: "ADMIN", entityId: "admin-revoked" },
      },
      "different-signing-key-used-only-in-test",
      { audience: "authenticated", expiresIn: "1h" },
    );
    const { context, request } = contextFor(token);
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toMatchObject({
      id: "auth-user-revoked",
      role: "GUEST",
      entityId: null,
    });
    expect(getUser).toHaveBeenCalledWith(token);
  });
  const legacyPayload = {
    sub: "advertiser-1",
    email: "advertiser@example.test",
    role: "ADVERTISER",
    app_metadata: { role: "ADVERTISER", entityId: "advertiser-1" },
  };

  it("accepts signed legacy advertiser sessions via the existing DB-backed verifier", async () => {
    const token = jwt.sign(legacyPayload, secret, { expiresIn: "1h" });
    const { context, request } = contextFor(token);
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(verifyAdvertiserSession).toHaveBeenCalledWith(token);
    expect(request.user).toEqual({
      id: "advertiser-1",
      email: "advertiser@example.test",
      role: "ADVERTISER",
      entityId: "advertiser-1",
    });
    expect(getUser).not.toHaveBeenCalled();
  });

  it("rejects forged legacy advertiser JWTs even if unsigned claims say ADVERTISER", async () => {
    const token = jwt.sign(legacyPayload, "different-secret", {
      expiresIn: "1h",
    });
    verifyAdvertiserSession.mockRejectedValueOnce(
      new UnauthorizedException("Session invalid"),
    );
    const { context, request } = contextFor(token);
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(request.user).toBeUndefined();
    expect(verifyAdvertiserSession).toHaveBeenCalledWith(token);
    expect(getUser).not.toHaveBeenCalled();
  });

  it("rejects revoked and suspended legacy sessions before tenant checks", async () => {
    const token = jwt.sign(legacyPayload, secret, { expiresIn: "1h" });
    verifyAdvertiserSession.mockRejectedValueOnce(
      new UnauthorizedException("Advertiser suspended"),
    );
    const { context, request } = contextFor(token);
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(request.user).toBeUndefined();
    expect(getUser).not.toHaveBeenCalled();
  });

  it("preserves TenantGuard ownership: same advertiser allowed, other advertiser denied", async () => {
    const token = jwt.sign(legacyPayload, secret, { expiresIn: "1h" });
    const { context, request } = contextFor(token);
    await expect(guard.canActivate(context)).resolves.toBe(true);
    const tenantGuard = new TenantGuard();

    // Set only the route parameter, exactly as Nest does after authentication.
    const tenantContext = {
      getHandler: () => function getPortal() {},
      getClass: () => class AdvertiserPortalController {},
      switchToHttp: () => ({
        getRequest: () => ({
          ...request,
          params: { id: "advertiser-1" },
        }),
      }),
    } as unknown as ExecutionContext;
    expect(tenantGuard.canActivate(tenantContext)).toBe(true);

    const otherTenantContext = {
      getHandler: () => function getOtherPortal() {},
      getClass: () => class AdvertiserPortalController {},
      switchToHttp: () => ({
        getRequest: () => ({
          ...request,
          params: { id: "another-advertiser" },
        }),
      }),
    } as unknown as ExecutionContext;
    expect(() => tenantGuard.canActivate(otherTenantContext)).toThrow(
      UnauthorizedException,
    );
  });

  it("rejects otherwise trusted legacy claims without an email", async () => {
    const withoutEmail = Object.fromEntries(
      Object.entries(legacyPayload).filter(([claim]) => claim !== "email"),
    );
    const token = jwt.sign(withoutEmail, secret, { expiresIn: "1h" });
    const { context, request } = contextFor(token);
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(verifyAdvertiserSession).toHaveBeenCalledWith(token);
    expect(request.user).toBeUndefined();
  });

  it("does not double-verify legacy sessions on public routes", async () => {
    const token = jwt.sign(legacyPayload, secret, { expiresIn: "1h" });
    const { context, request } = contextFor(token, true);
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(verifyAdvertiserSession).not.toHaveBeenCalled();
    expect(request.user).toBeUndefined();
    expect(getUser).not.toHaveBeenCalled();
  });

  it("never routes hardware pairing tokens with fabricated advertiser fields through legacy auth", async () => {
    const token = jwt.sign({ ...legacyPayload, type: "pairing" }, secret, {
      expiresIn: "5m",
    });
    const { context } = contextFor(token);
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(verifyAdvertiserSession).not.toHaveBeenCalled();
    expect(getUser).not.toHaveBeenCalled();
  });
});
