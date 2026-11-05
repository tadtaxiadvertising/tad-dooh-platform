import { Reflector } from "@nestjs/core";
import { DriversController } from "../drivers.controller";
import { ROLES_KEY, UserRole } from "../../auth/decorators/roles.decorator";
import { DriversService } from "../drivers.service";
import { SystemSettingsService } from "../../system-settings/system-settings.service";
import { PrismaService } from "../../prisma/prisma.service";
import { Test, TestingModule } from "@nestjs/testing";
import type { Request } from "express";
import { Socket } from "node:net";

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
  let moduleRef: TestingModule;
  const originalTabletHubKey = process.env.TABLET_HUB_KEY;
  let mockDriversService: jest.Mocked<
    Pick<
      DriversService,
      "acceptAgreement" | "completeBankSetup" | "getDriverHubData"
    >
  >;
  let mockSystemSettingsService: jest.Mocked<
    Pick<SystemSettingsService, "getDriverAppVersion">
  >;

  beforeEach(async () => {
    mockDriversService = {
      acceptAgreement: jest.fn(),
      completeBankSetup: jest.fn(),
      getDriverHubData: jest.fn(),
    };
    mockSystemSettingsService = {
      getDriverAppVersion: jest.fn(),
    };
    moduleRef = await Test.createTestingModule({
      controllers: [DriversController],
      providers: [
        { provide: DriversService, useValue: mockDriversService },
        { provide: SystemSettingsService, useValue: mockSystemSettingsService },
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();
    controller = moduleRef.get(DriversController);
  });

  afterEach(async () => {
    await moduleRef.close();
    if (originalTabletHubKey === undefined) delete process.env.TABLET_HUB_KEY;
    else process.env.TABLET_HUB_KEY = originalTabletHubKey;
  });

  it("should sanitize raw error message in acceptAgreement", async () => {
    mockDriversService.acceptAgreement.mockRejectedValue(
      new Error("FATAL: connection to server at '10.0.0.5' failed"),
    );

    const dummyReq: Pick<Request, "headers" | "socket"> = {
      headers: {},
      socket: new Socket(),
    };

    await expect(
      controller.acceptAgreement(
        "driver-1",
        { version: "2.0" },
        dummyReq as Request,
      ),
    ).rejects.toThrow("No se pudo procesar la aceptación del contrato.");
  });

  it("should sanitize raw error message in completeBankSetup", async () => {
    mockDriversService.completeBankSetup.mockRejectedValue(
      new Error(
        "PrismaClientKnownRequestError: column users.password does not exist",
      ),
    );

    await expect(controller.completeBankSetup("driver-1")).rejects.toThrow(
      "No se pudo completar la configuración bancaria.",
    );
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
