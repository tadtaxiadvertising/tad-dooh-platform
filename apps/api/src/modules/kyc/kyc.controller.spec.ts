import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { KYCController } from "./kyc.controller";
import { KYCService, KYCSubmission } from "./kyc.service";
import type { AuthUser } from "../auth/auth.types";
import { IS_PUBLIC_KEY } from "../auth/decorators/public.decorator";
import { ROLES_KEY, UserRole } from "../auth/decorators/roles.decorator";
import { RolesGuard } from "../auth/guards/roles.guard";
import type { ExecutionContext } from "@nestjs/common";

// The controller's authorization contract is independent of DB/Supabase setup.
jest.mock("./kyc.service", () => ({ KYCService: class KYCService {} }));

describe("KYCController submit security", () => {
  const document: KYCSubmission = {
    driverId: "driver-own",
    documentType: "LICENCIA",
    documentNumber: "LIC123456",
  };
  const result = {
    driverId: "driver-own",
    status: "PENDING_REVIEW",
    message: "Fixture: pending",
  };
  const mockService = { submit: jest.fn().mockResolvedValue(result) };
  const controller = new KYCController(mockService as unknown as KYCService);
  const reflector = new Reflector();

  const request = (role?: string, entityId?: string): { user?: AuthUser } =>
    role
      ? {
          user: {
            id: "session-fixture",
            email: "fixture@example.invalid",
            role,
            entityId,
          },
        }
      : {};

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("requires authenticated roles, never @Public metadata", () => {
    expect(reflector.get(IS_PUBLIC_KEY, controller.submit)).toBeFalsy();
    expect(reflector.get(IS_PUBLIC_KEY, KYCController)).toBeFalsy();
    expect(reflector.get<UserRole[]>(ROLES_KEY, KYCController)).toEqual([
      UserRole.ADMIN,
      UserRole.DRIVER,
    ]);
  });

  it("does not bypass the configured RolesGuard for advertiser sessions", () => {
    const guard = new RolesGuard(reflector);
    const context = {
      getClass: () => KYCController,
      getHandler: () => controller.submit,
      switchToHttp: () => ({
        getRequest: () => ({
          user: request(UserRole.ADVERTISER, "advertiser-1").user,
        }),
      }),
    } as unknown as ExecutionContext;
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it("denies unauthenticated users before any data changes", async () => {
    await expect(controller.submit(request(), document)).rejects.toThrow(
      ForbiddenException,
    );
    expect(mockService.submit).not.toHaveBeenCalled();
  });

  it("denies advertiser sessions even when a driver ID is supplied", async () => {
    await expect(
      controller.submit(
        request(UserRole.ADVERTISER, document.driverId),
        document,
      ),
    ).rejects.toThrow(ForbiddenException);
    expect(mockService.submit).not.toHaveBeenCalled();
  });

  it("denies driver sessions without a bound driver entity", async () => {
    await expect(
      controller.submit(request(UserRole.DRIVER), document),
    ).rejects.toThrow(ForbiddenException);
    expect(mockService.submit).not.toHaveBeenCalled();
  });

  it("denies driver submissions for a different driver", async () => {
    await expect(
      controller.submit(request(UserRole.DRIVER, "another-driver"), document),
    ).rejects.toThrow(ForbiddenException);
    expect(mockService.submit).not.toHaveBeenCalled();
  });

  it("allows a driver to submit documents only for the bound entity", async () => {
    await expect(
      controller.submit(request(UserRole.DRIVER, document.driverId), document),
    ).resolves.toEqual(result);
    expect(mockService.submit).toHaveBeenCalledTimes(1);
    expect(mockService.submit).toHaveBeenCalledWith(document);
  });

  it("allows an administrator to submit for a selected driver", async () => {
    await expect(
      controller.submit(request(UserRole.ADMIN, "admin-entity"), document),
    ).resolves.toEqual(result);
    expect(mockService.submit).toHaveBeenCalledWith(document);
  });

  it("rejects a missing driver ID before reaching the service", async () => {
    const invalid = { ...document, driverId: " " };
    await expect(
      controller.submit(request(UserRole.ADMIN), invalid),
    ).rejects.toThrow(BadRequestException);
    expect(mockService.submit).not.toHaveBeenCalled();
  });
});
