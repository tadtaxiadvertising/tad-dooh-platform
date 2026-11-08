import { Test } from "@nestjs/testing";
import { PrismaService } from "../prisma/prisma.service";
import { Logger } from "@nestjs/common";
import { SystemSettingsService } from "./system-settings.service";

describe("SystemSettingsService", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("does not abort Nest startup when the default settings seed cannot reach the database", async () => {
    const databaseError = new Error("too many authentication failures");
    const prisma = {
      isDatabaseAvailable: true,
      systemSetting: {
        upsert: jest.fn().mockImplementation(() => {
          throw databaseError;
        }),
      },
    };
    const loggerError = jest
      .spyOn(Logger.prototype, "error")
      .mockImplementation(() => undefined);
    const module = await Test.createTestingModule({
      providers: [
        SystemSettingsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    const service = module.get(SystemSettingsService);

    await expect(service.onModuleInit()).resolves.toBeUndefined();

    expect(prisma.systemSetting.upsert).toHaveBeenCalledTimes(1);
    expect(loggerError).toHaveBeenCalledWith(
      expect.stringContaining("modo degradado"),
      databaseError.message,
    );
  });

  it("does not make a second database request after the initial connection failed", async () => {
    const prisma = {
      isDatabaseAvailable: false,
      systemSetting: {
        upsert: jest.fn(),
      },
    };
    const loggerWarn = jest
      .spyOn(Logger.prototype, "warn")
      .mockImplementation(() => undefined);
    const module = await Test.createTestingModule({
      providers: [
        SystemSettingsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    const service = module.get(SystemSettingsService);

    await expect(service.onModuleInit()).resolves.toBeUndefined();

    expect(prisma.systemSetting.upsert).not.toHaveBeenCalled();
    expect(loggerWarn).toHaveBeenCalledWith(
      expect.stringContaining("base de datos no está disponible"),
    );
  });

  it("does not auto-create unapproved financial settings during startup", async () => {
    const upsert = jest.fn().mockResolvedValue(undefined);
    const prisma = {
      isDatabaseAvailable: true,
      systemSetting: { upsert },
    };
    const module = await Test.createTestingModule({
      providers: [
        SystemSettingsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    const service = module.get(SystemSettingsService);

    await service.onModuleInit();

    const keys = upsert.mock.calls.map(([query]) => query.where.key);
    expect(keys).toContain("platformName");
    expect(keys).toContain("driverAppLatestVersion");
    expect(keys).not.toContain("slotPrice");
    expect(keys).not.toContain("referralFee");
    expect(keys).not.toContain("subscriptionPrice");
    for (const [query] of upsert.mock.calls) {
      expect(query.update).toEqual({});
    }
  });
});
