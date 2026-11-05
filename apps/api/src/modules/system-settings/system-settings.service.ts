import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class SystemSettingsService implements OnModuleInit {
  private readonly logger = new Logger(SystemSettingsService.name);

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    if (!this.prisma.isDatabaseAvailable) {
      this.logger.warn(
        "Se omitió la inicialización de valores por defecto porque la base de datos no está disponible.",
      );
      return;
    }

    try {
      await this.seedDefaults();
    } catch (error) {
      // The settings seed is a convenience initializer, not a startup
      // dependency. Propagating a transient database-auth error from here
      // makes Nest exit and causes EasyPanel to hammer Supabase in a
      // crash-loop, which can trip the pooler's authentication circuit breaker.
      this.logger.error(
        "No se pudieron inicializar los valores por defecto de configuración; el API continuará en modo degradado.",
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  async getAll() {
    // @ts-ignore - Temporary bypass for locked Prisma Client on Windows
    const settings = await this.prisma.systemSetting.findMany();
    return settings.reduce(
      (acc, curr) => {
        let value: unknown = curr.value;
        if (curr.type === "NUMBER") value = Number(curr.value);
        if (curr.type === "BOOLEAN") value = curr.value === "true";
        if (curr.type === "JSON") {
          try {
            value = JSON.parse(curr.value);
          } catch (e) {
            value = curr.value;
          }
        }
        acc[curr.key] = value;
        return acc;
      },
      {} as Record<string, unknown>,
    );
  }

  async updateMany(settings: Record<string, unknown>) {
    const updates = Object.entries(settings).map(async ([key, value]) => {
      // @ts-ignore - Temporary bypass for locked Prisma Client on Windows
      const existing = await this.prisma.systemSetting.findUnique({
        where: { key },
      });
      if (existing) {
        let stringValue = String(value);
        if (existing.type === "JSON") stringValue = JSON.stringify(value);

        // @ts-ignore - Temporary bypass for locked Prisma Client on Windows
        return this.prisma.systemSetting.update({
          where: { key },
          data: { value: stringValue },
        });
      }
    });

    await Promise.all(updates.filter(Boolean));
    return this.getAll();
  }

  private async seedDefaults() {
    const defaults = [
      {
        key: "platformName",
        value: "TAD DOOH Platform",
        type: "STRING",
        group: "GENERAL",
      },
      {
        key: "maintenanceMode",
        value: "false",
        type: "BOOLEAN",
        group: "GENERAL",
      },
      { key: "slotPrice", value: "500", type: "NUMBER", group: "FINANCIAL" },
      { key: "referralFee", value: "500", type: "NUMBER", group: "FINANCIAL" },
      { key: "maxSlots", value: "15", type: "NUMBER", group: "FLEET" },
      { key: "syncInterval", value: "10", type: "NUMBER", group: "FLEET" },
      { key: "telemetryBatch", value: "50", type: "NUMBER", group: "FLEET" },
      {
        key: "offlineLimit",
        value: "48",
        type: "NUMBER",
        group: "FLEET",
      },
      {
        key: "subscriptionPrice",
        value: "6000",
        type: "NUMBER",
        group: "FINANCIAL",
      },
      {
        key: "whatsappGateway",
        value: "https://api.whatsapp.com/send",
        type: "STRING",
        group: "SYSTEM",
      },
      {
        key: "driverAppLatestVersion",
        value: "1.0.0",
        type: "STRING",
        group: "DRIVER_APP",
      },
      {
        key: "driverAppMinVersion",
        value: "1.0.0",
        type: "STRING",
        group: "DRIVER_APP",
      },
      {
        key: "driverAppForceUpdate",
        value: "false",
        type: "BOOLEAN",
        group: "DRIVER_APP",
      },
      {
        key: "driverAppDownloadUrl",
        value: "",
        type: "STRING",
        group: "DRIVER_APP",
      },
      {
        key: "driverAppReleaseNotes",
        value: "",
        type: "STRING",
        group: "DRIVER_APP",
      },
    ];

    for (const setting of defaults) {
      // @ts-ignore - Temporary bypass for locked Prisma Client on Windows
      await this.prisma.systemSetting.upsert({
        where: { key: setting.key },
        update: {},
        create: setting,
      });
    }
  }

  /**
   * Devuelve la configuración de versión de la app Flutter.
   * Usado por GET /api/drivers/app-version (público, sin auth).
   */
  async getDriverAppVersion() {
    const keys = [
      "driverAppLatestVersion",
      "driverAppMinVersion",
      "driverAppForceUpdate",
      "driverAppDownloadUrl",
      "driverAppReleaseNotes",
    ];
    // @ts-ignore - Temporary bypass for locked Prisma Client on Windows
    const rows = await this.prisma.systemSetting.findMany({
      where: { key: { in: keys } },
    });
    const map: Record<string, string> = {};
    for (const r of rows) map[r.key] = r.value;

    const latestVersion = map.driverAppLatestVersion || "1.0.0";
    const minVersion = map.driverAppMinVersion || "1.0.0";
    const forceUpdate = map.driverAppForceUpdate === "true";

    return {
      latestVersion,
      minVersion,
      forceUpdate,
      downloadUrl: map.driverAppDownloadUrl || "",
      releaseNotes: map.driverAppReleaseNotes || "",
    };
  }
}
