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
    const service = new SystemSettingsService(prisma as any);

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
    const service = new SystemSettingsService(prisma as any);

    await expect(service.onModuleInit()).resolves.toBeUndefined();

    expect(prisma.systemSetting.upsert).not.toHaveBeenCalled();
    expect(loggerWarn).toHaveBeenCalledWith(
      expect.stringContaining("base de datos no está disponible"),
    );
  });
});
