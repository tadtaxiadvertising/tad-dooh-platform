import { Test, TestingModule } from "@nestjs/testing";
import { DriversController } from "../drivers.controller";
import { DriversService } from "../drivers.service";
import { SystemSettingsService } from "../../system-settings/system-settings.service";
import { PrismaService } from "../../prisma/prisma.service";
import { UserRole } from "../../auth/decorators/roles.decorator";
import { Reflector } from "@nestjs/core";

describe("DriversController", () => {
  let controller: DriversController;
  let driversService: jest.Mocked<Partial<DriversService>>;
  let reflector: Reflector;

  beforeEach(async () => {
    driversService = {
      linkActiveAd: jest.fn().mockResolvedValue({ success: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DriversController],
      providers: [
        {
          provide: DriversService,
          useValue: driversService,
        },
        {
          provide: SystemSettingsService,
          useValue: {},
        },
        {
          provide: PrismaService,
          useValue: {},
        },
        Reflector,
      ],
    }).compile();

    controller = module.get<DriversController>(DriversController);
    reflector = module.get<Reflector>(Reflector);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  it("linkActiveAd should have @Roles(UserRole.ADMIN) metadata", () => {
    const roles = reflector.get<UserRole[]>(
      "roles",
      controller.linkActiveAd,
    );
    expect(roles).toEqual([UserRole.ADMIN]);
  });

  it("linkActiveAd should delegate to driversService.linkActiveAd", async () => {
    const result = await controller.linkActiveAd("driver-1", "campaign-1");
    expect(driversService.linkActiveAd).toHaveBeenCalledWith(
      "driver-1",
      "campaign-1",
    );
    expect(result).toEqual({ success: true });
  });
});
