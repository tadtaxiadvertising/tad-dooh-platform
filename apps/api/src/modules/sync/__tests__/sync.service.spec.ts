import { Test, TestingModule } from "@nestjs/testing";
import { HttpException } from "@nestjs/common";
import { SyncService } from "../sync.service";
import { PrismaService } from "../../prisma/prisma.service";
import { NotificationsService } from "../../notifications/notifications.service";

import { BUSINESS_RULES } from "../../../../src/common/constants/business-rules";

// Mockear variables de entorno requeridas
process.env.JWT_SECRET = "test-jwt-secret";
process.env.SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";

describe("SyncService", () => {
  let service: SyncService;

  const mockNotifications = {
    createAlert: jest.fn(),
  };

  const mockPrisma = {
    device: {
      findUnique: jest.fn(),
    },
    campaign: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    mediaAsset: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyncService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationsService, useValue: mockNotifications },
      ],
    }).compile();

    service = module.get<SyncService>(SyncService);
    jest.clearAllMocks();
  });

  describe("getDeviceManifest", () => {
    it("should throw 404 for unknown device (offline event queue safety)", async () => {
      mockPrisma.device.findUnique.mockResolvedValue(null);

      await expect(
        service.getDeviceManifest("UNKNOWN-TAD-DEVICE"),
      ).rejects.toThrow(HttpException);

      const err = await service
        .getDeviceManifest("UNKNOWN-TAD-DEVICE")
        .catch((e) => e);
      expect(err?.getStatus()).toBe(404);
      expect(mockNotifications.createAlert).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Intento de Sincronización Fallido",
          type: "WARNING",
          category: "DEVICE",
        }),
      );
    });

    it("should throw 403 for non-ACTIVE device (offline-first invariant)", async () => {
      mockPrisma.device.findUnique.mockResolvedValue({
        deviceId: "TAD-001",
        status: BUSINESS_RULES.STATUS.DEVICE.INITIAL,
        driver: { id: "driver-1", fullName: "Test Driver" },
      });

      await expect(service.getDeviceManifest("TAD-001")).rejects.toThrow(
        HttpException,
      );

      const err = await service.getDeviceManifest("TAD-001").catch((e) => e);
      expect(err?.getStatus()).toBe(403);
    });
  });
});
