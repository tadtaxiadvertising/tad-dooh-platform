import { Test, TestingModule } from "@nestjs/testing";
import { DeviceAdminController } from "./device-admin.controller";
import { PrismaService } from "../prisma/prisma.service";
import { DeviceService } from "./device.service";

describe("DeviceAdminController", () => {
  let controller: DeviceAdminController;
  let prismaService: PrismaService;

  const mockPrismaService = {
    device: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    deviceCampaign: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    playlistItem: {
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockDeviceService = {
    getPendingDevices: jest.fn(),
    approveDevice: jest.fn(),
    rejectDevice: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeviceAdminController],
      providers: [
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: DeviceService, useValue: mockDeviceService },
      ],
    }).compile();

    controller = module.get<DeviceAdminController>(DeviceAdminController);
    prismaService = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe("getDeviceProfile", () => {
    it("should return sanitized error response without leaking internal message on exception", async () => {
      mockPrismaService.device.findFirst.mockRejectedValue(
        new Error("Sensitive DB connection failed at pg_catalog.pg_stat_activity"),
      );

      const result = await controller.getDeviceProfile("DEV-999");

      expect(result).toEqual({
        error: "Excepción interna al procesar el perfil",
      });
      expect(result).not.toHaveProperty("message");
    });

    it("should return profile details when device exists", async () => {
      mockPrismaService.device.findFirst.mockResolvedValue({
        id: "uuid-1",
        deviceId: "DEV-001",
        taxiNumber: "TX-100",
        city: "Santo Domingo",
        status: "OPERATIVO",
        batteryLevel: 95,
        storageFree: "10GB",
        appVersion: "1.0.0",
        lastSeen: new Date(),
        playerStatus: "PLAYING",
        driver: null,
        campaigns: [],
      });

      const result = await controller.getDeviceProfile("DEV-001");

      expect(result).toHaveProperty("id", "uuid-1");
      expect(result).toHaveProperty("device_id", "DEV-001");
      expect(result).not.toHaveProperty("error");
    });
  });
});
