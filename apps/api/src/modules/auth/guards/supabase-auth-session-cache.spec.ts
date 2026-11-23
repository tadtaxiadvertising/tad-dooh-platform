import type { ExecutionContext } from "@nestjs/common";
import * as jwt from "jsonwebtoken";
import type { AuthUser } from "../auth.types";
import { SupabaseAuthGuard } from "./supabase-auth.guard";

describe("SupabaseAuthGuard bounded hashed session cache", () => {
  const secret = "synthetic-supabase-session-cache-test-secret";
  const getUser = jest.fn();
  const reflector = { getAllAndOverride: jest.fn(() => false) };
  const supabase = {
    getAnonClient: jest.fn(() => ({ auth: { getUser } })),
    getClient: jest.fn(),
  };
  const config = {
    get: jest.fn((name: string) =>
      name === "SUPABASE_JWT_SECRET" || name === "JWT_SECRET"
        ? secret
        : undefined,
    ),
  };
  const advertisers = { verifyAdvertiserSession: jest.fn() };
  const identity: AuthUser = {
    id: "synthetic-user",
    email: "user@example.invalid",
    role: "ADMIN",
  };

  const cache = Reflect.get(SupabaseAuthGuard, "sessionCache") as Map<
    string,
    { user: AuthUser; expiry: number }
  >;
  const cachedIdentity = Reflect.get(SupabaseAuthGuard, "getCachedSession") as (
    token: string,
  ) => AuthUser | undefined;
  const keyFor = Reflect.get(SupabaseAuthGuard, "cacheKey") as (
    token: string,
  ) => string;

  let guard: SupabaseAuthGuard;
  const remember = (token: string, user: AuthUser = identity) =>
    (
      guard as unknown as {
        cacheVerifiedSession: (token: string, user: AuthUser) => void;
      }
    ).cacheVerifiedSession(token, user);

  beforeEach(() => {
    cache.clear();
    Reflect.set(SupabaseAuthGuard, "nextSessionCacheSweepAt", 0);
    jest.clearAllMocks();
    guard = new SupabaseAuthGuard(
      reflector as never,
      supabase as never,
      config as never,
      advertisers as never,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
    cache.clear();
  });

  it("stores only opaque SHA-256 keys, never the raw bearer token", () => {
    const token = "synthetic-bearer-credential-not-for-production";
    remember(token);
    expect(cache.size).toBe(1);
    expect(cache.has(token)).toBe(false);
    expect([...cache.keys()]).toEqual([keyFor(token)]);
    expect(keyFor(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(cachedIdentity(token)).toEqual(identity);
  });

  it("caps unique sessions with LRU eviction and keeps frequently used sessions", () => {
    for (let i = 0; i < 2_048; i++) remember(`token-${i}`);
    expect(cache.size).toBe(2_048);

    // A successful cache read refreshes recency, not the TTL.
    expect(cachedIdentity("token-0")).toEqual(identity);
    remember("token-2048");

    expect(cache.size).toBe(2_048);
    expect(cache.has(keyFor("token-0"))).toBe(true);
    expect(cache.has(keyFor("token-1"))).toBe(false);
    expect(cachedIdentity("token-1")).toBeUndefined();
  });

  it("rejects expired cache entries and does not extend TTL on reads", () => {
    const clock = jest.spyOn(Date, "now").mockReturnValue(100_000);
    remember("token-expiring");

    clock.mockReturnValue(109_999);
    expect(cachedIdentity("token-expiring")).toEqual(identity);
    clock.mockReturnValue(110_000);
    expect(cachedIdentity("token-expiring")).toBeUndefined();
    expect(cache.size).toBe(0);
  });

  it("sweeps expired sessions when the bounded cache fills", () => {
    const clock = jest.spyOn(Date, "now").mockReturnValue(100_000);
    for (let i = 0; i < 2_048; i++) remember(`stale-${i}`);
    clock.mockReturnValue(110_001);
    remember("fresh");

    expect(cache.size).toBe(1);
    expect(cachedIdentity("stale-0")).toBeUndefined();
    expect(cachedIdentity("fresh")).toEqual(identity);
  });

  it("reuses a network-verified Supabase user without recontacting Supabase", async () => {
    getUser.mockResolvedValue({
      data: {
        user: {
          id: identity.id,
          email: identity.email,
          app_metadata: { role: identity.role },
        },
      },
      error: null,
    });
    const token = jwt.sign(
      { sub: identity.id, role: "authenticated", session_id: "network-1" },
      "synthetic-network-signing-secret-different-from-local",
      { audience: "authenticated", expiresIn: "1h" },
    );
    const contextFor = () => {
      const request: {
        headers: { authorization: string };
        user?: AuthUser;
        url: string;
      } = {
        headers: { authorization: `Bearer ${token}` },
        url: "/api/v1/private",
      };
      return {
        request,
        context: {
          getHandler: () => function handler() {},
          getClass: () => class Controller {},
          switchToHttp: () => ({ getRequest: () => request }),
        } as unknown as ExecutionContext,
      };
    };

    const first = contextFor();
    const second = contextFor();
    await expect(guard.canActivate(first.context)).resolves.toBe(true);
    await expect(guard.canActivate(second.context)).resolves.toBe(true);
    expect(first.request.user).toMatchObject(identity);
    expect(second.request.user).toMatchObject(identity);
    expect(getUser).toHaveBeenCalledTimes(1);
    expect(cache.has(token)).toBe(false);
    expect(cache.has(keyFor(token))).toBe(true);
  });
});
