import { ForbiddenException, Logger } from "@nestjs/common";
import type { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import { ROLES_KEY, UserRole } from "../decorators/roles.decorator";
import { RolesGuard } from "./roles.guard";

describe("RolesGuard denial log redaction", () => {
  class TestController {}
  const restricted = () => undefined;
  const unrestricted = () => undefined;
  const publicHandler = () => undefined;

  Reflect.defineMetadata(ROLES_KEY, [UserRole.ADMIN], restricted);
  Reflect.defineMetadata(ROLES_KEY, [UserRole.ADMIN], publicHandler);
  Reflect.defineMetadata(IS_PUBLIC_KEY, true, publicHandler);

  const guard = new RolesGuard(new Reflector());
  const context = (
    user: Record<string, unknown> | undefined,
    handler: () => undefined = restricted,
  ): ExecutionContext =>
    ({
      getHandler: () => handler,
      getClass: () => TestController,
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    }) as unknown as ExecutionContext;

  let warnings: jest.SpyInstance;
  let errors: jest.SpyInstance;

  beforeEach(() => {
    warnings = jest.spyOn(Logger.prototype, "warn").mockImplementation();
    errors = jest.spyOn(Logger.prototype, "error").mockImplementation();
  });

  afterEach(() => {
    warnings.mockRestore();
    errors.mockRestore();
  });

  it("rejects missing principal without serializing it", () => {
    expect(() => guard.canActivate(context(undefined))).toThrow(
      ForbiddenException,
    );
    expect(errors).toHaveBeenCalledWith("RBAC_DENIED_MISSING_ROLE");
    expect(warnings).not.toHaveBeenCalled();
  });

  it("never logs unexpected principal claims when the role is missing", () => {
    const principal = {
      email: "sensitive@example.invalid",
      access_token: "synthetic-token-value",
      nested: { privateField: "sensitive-nested-value" },
    };
    expect(() => guard.canActivate(context(principal))).toThrow(
      ForbiddenException,
    );
    expect(errors).toHaveBeenCalledWith("RBAC_DENIED_MISSING_ROLE");
    expect(JSON.stringify(errors.mock.calls)).not.toMatch(
      /sensitive|privateField|synthetic-token-value/,
    );
    expect(warnings).not.toHaveBeenCalled();
  });

  it("denies a wrong role without logging an email or claim injection", () => {
    const principal = {
      role: "DRIVER\nFAKE_SUCCESS",
      email: "personal@example.invalid",
      session: "synthetic-session",
    };
    expect(() => guard.canActivate(context(principal))).toThrow(
      ForbiddenException,
    );
    expect(warnings).toHaveBeenCalledWith("RBAC_DENIED_INSUFFICIENT_ROLE");
    expect(JSON.stringify(warnings.mock.calls)).not.toMatch(
      /personal|FAKE_SUCCESS|synthetic-session/,
    );
    expect(errors).not.toHaveBeenCalled();
  });

  it("permits the required role without producing a denial log", () => {
    expect(guard.canActivate(context({ role: UserRole.ADMIN }))).toBe(true);
    expect(warnings).not.toHaveBeenCalled();
  });

  it("preserves unrestricted and explicitly public routes", () => {
    expect(guard.canActivate(context(undefined, unrestricted))).toBe(true);
    expect(guard.canActivate(context(undefined, publicHandler))).toBe(true);
    expect(warnings).not.toHaveBeenCalled();
  });
});
