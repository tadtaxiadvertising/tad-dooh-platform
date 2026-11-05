import type { Response } from "express";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";

// Response has many framework members; these tests exercise only its cookie API.
function cookieResponse(response: Pick<Response, "cookie">): Response {
  return response as Response;
}

describe("AuthController login cookie", () => {
  const authService = {
    login: jest.fn(),
  };
  const controller = new AuthController(authService as unknown as AuthService);

  const originalCookieDomain = process.env.COOKIE_DOMAIN;

  afterEach(() => {
    if (originalCookieDomain === undefined) {
      delete process.env.COOKIE_DOMAIN;
    } else {
      process.env.COOKIE_DOMAIN = originalCookieDomain;
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
    authService.login.mockResolvedValue({
      access_token: "test-token",
      refresh_token: "test-refresh",
      id: "test-user",
    });
  });

  it("sets the session cookie lifetime in milliseconds and never returns tokens", async () => {
    // Login only uses Response.cookie; keep the fixture limited to that surface.
    const res = { cookie: jest.fn() };
    const user = await controller.login(
      { email: "test@example.com", password: "test-password" },
      cookieResponse(res),
    );

    expect(res.cookie).toHaveBeenCalledWith(
      "tad_access_token",
      "test-token",
      expect.objectContaining({
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      }),
    );
    expect(user).toEqual({ id: "test-user" });
  });
  it("uses a host-only cookie when COOKIE_DOMAIN is absent", async () => {
    delete process.env.COOKIE_DOMAIN;
    // Login only uses Response.cookie; keep the fixture limited to that surface.
    const res = { cookie: jest.fn() };
    await controller.login(
      { email: "test@example.com", password: "test-password" },
      cookieResponse(res),
    );
    expect(res.cookie.mock.calls[0][2]).not.toHaveProperty("domain");
  });

  it("respects an explicitly configured shared cookie domain", async () => {
    process.env.COOKIE_DOMAIN = ".ibusiness.com.do";
    // Login only uses Response.cookie; keep the fixture limited to that surface.
    const res = { cookie: jest.fn() };
    await controller.login(
      { email: "test@example.com", password: "test-password" },
      cookieResponse(res),
    );
    expect(res.cookie.mock.calls[0][2]).toHaveProperty(
      "domain",
      ".ibusiness.com.do",
    );
  });
});
