import { errorMessage } from "../../../utils/error.util";
import { Test, TestingModule } from "@nestjs/testing";
import { InternalServerErrorException } from "@nestjs/common";
import { DeviceAdminController } from "../device-admin.controller";
import { DeviceService } from "../device.service";
import { PrismaService } from "../../prisma/prisma.service";

describe("DeviceAdminController", () => {
  let controller: DeviceAdminController;

  const mockPrismaService = {
    device: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
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

    jest.clearAllMocks();
  });

  describe("deleteDevice", () => {
    it("should throw InternalServerErrorException without leaking internal error details on failure", async () => {
      mockPrismaService.device.findMany.mockResolvedValue([
        { id: "uuid-123", deviceId: "HW-123" },
      ]);
      const internalDbError = new Error(
        "FATAL DB ERROR: pg_stat_activity deadlock in table devices_rel",
      );
      mockPrismaService.$transaction.mockRejectedValue(internalDbError);

      await expect(controller.deleteDevice("HW-123")).rejects.toThrow(
        InternalServerErrorException,
      );

      try {
        await controller.deleteDevice("HW-123");
      } catch (err: unknown) {
        expect(errorMessage(err)).toBe("Error al eliminar el dispositivo");
        expect(errorMessage(err)).not.toContain("FATAL DB ERROR");
        expect(errorMessage(err)).not.toContain("deadlock");
      }
    });
  });

  describe("getDeviceProfile", () => {
    it("should throw InternalServerErrorException without leaking internal error details on failure", async () => {
      const internalDbError = new Error(
        "PrismaClientKnownRequestError: Table missing in catalog",
      );
      mockPrismaService.device.findMany.mockRejectedValue(internalDbError);

      await expect(controller.getDeviceProfile("HW-123")).rejects.toThrow(
        InternalServerErrorException,
      );

      try {
        await controller.getDeviceProfile("HW-123");
      } catch (err: unknown) {
        expect(errorMessage(err)).toBe(
          "Error al obtener el perfil del dispositivo",
        );
        expect(errorMessage(err)).not.toContain(
          "PrismaClientKnownRequestError",
        );
        expect(errorMessage(err)).not.toContain("Table missing");
      }
    });
  });
});
