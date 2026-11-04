import { Reflector } from "@nestjs/core";
import { DriversController } from "../drivers.controller";
import { ROLES_KEY, UserRole } from "../../auth/decorators/roles.decorator";

describe("DriversController Authorization", () => {
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
  });

  it("should enforce ADMIN role on linkActiveAd endpoint", () => {
    const roles = reflector.get<UserRole[]>(
      ROLES_KEY,
      DriversController.prototype.linkActiveAd,
    );
    expect(roles).toBeDefined();
    expect(roles).toEqual([UserRole.ADMIN]);
  });
});

describe("DriversController Error Sanitization", () => {
  let controller: DriversController;
  let mockDriversService: any;
  let mockSystemSettingsService: any;

  beforeEach(() => {
    mockDriversService = {
      acceptAgreement: jest.fn(),
      completeBankSetup: jest.fn(),
      getDriverHubData: jest.fn(),
    };
    mockSystemSettingsService = {
      getDriverAppVersion: jest.fn(),
    };
    controller = new DriversController(
      mockDriversService,
      mockSystemSettingsService,
    );
  });

  it("should sanitize raw error message in acceptAgreement", async () => {
    mockDriversService.acceptAgreement.mockRejectedValue(
      new Error("FATAL: connection to server at '10.0.0.5' failed"),
    );

    const dummyReq = {
      headers: {},
      socket: { remoteAddress: "127.0.0.1" },
    } as any;

    await expect(
      controller.acceptAgreement("driver-1", { version: "2.0" }, dummyReq),
    ).rejects.toThrow("No se pudo procesar la aceptación del contrato.");
  });

  it("should sanitize raw error message in completeBankSetup", async () => {
    mockDriversService.completeBankSetup.mockRejectedValue(
      new Error("PrismaClientKnownRequestError: column users.password does not exist"),
    );

    await expect(
      controller.completeBankSetup("driver-1"),
    ).rejects.toThrow("No se pudo completar la configuración bancaria.");
  });

  it("should sanitize raw error message in getDriverHub", async () => {
    process.env.TABLET_HUB_KEY = "test-tablet-key";
    mockDriversService.getDriverHubData.mockRejectedValue(
      new Error("FATAL DB ERROR: syntax error at line 42"),
    );

    await expect(
      controller.getDriverHub("tablet-1", "test-tablet-key"),
    ).rejects.toThrow("No se pudieron cargar los datos del portal del chofer.");
  });
});
