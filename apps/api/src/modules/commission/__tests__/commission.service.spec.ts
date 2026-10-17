import { Test, TestingModule } from "@nestjs/testing";
import { CommissionService } from "../commission.service";
import { PrismaService } from "../../prisma/prisma.service";
import { CommissionStatus, CommissionSourceType } from "../commission.service";

describe("CommissionService", () => {
  let service: CommissionService;
  let prisma: PrismaService;

  const mockPrisma = {
    commission: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    settlementBatch: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    financialTransaction: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    driver: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrisma)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommissionService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<CommissionService>(CommissionService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe("createIdempotent", () => {
    it("should create commission when reference does not exist", async () => {
      mockPrisma.commission.findUnique.mockResolvedValue(null);
      mockPrisma.commission.create.mockResolvedValue({
        id: "commission-1",
        reference: "REF-BONUS-123",
        amount: 500,
        status: CommissionStatus.PENDING,
      });
      mockPrisma.driver.findUnique.mockResolvedValue({
        id: "driver-1",
        fullName: "Driver 1",
      });

      const result = await service.createIdempotent({
        driverId: "driver-1",
        amount: 500,
        sourceType: CommissionSourceType.DRIVER_REFERRAL,
        reference: "REF-BONUS-123",
      });

      expect(result).toBeDefined();
      expect(result.commission.reference).toBe("REF-BONUS-123");
      expect(mockPrisma.commission.create).toHaveBeenCalled();
    });

    it("should return existing commission when reference exists", async () => {
      const existing = {
        id: "commission-1",
        reference: "REF-BONUS-123",
        amount: 500,
        status: CommissionStatus.PENDING,
      };
      mockPrisma.commission.findFirst.mockResolvedValue(existing as any);

      const result = await service.createIdempotent({
        driverId: "driver-1",
        amount: 500,
        sourceType: CommissionSourceType.DRIVER_REFERRAL,
        reference: "REF-BONUS-123",
      });

      expect(result.commission).toEqual(existing);
      expect(mockPrisma.commission.create).not.toHaveBeenCalled();
    });
  });

  describe("generateMonthlySettlement", () => {
    it("should return existing batch if already processed", async () => {
      mockPrisma.settlementBatch.findUnique.mockResolvedValue({
        id: "batch-1",
        period: "2026-09",
        status: "APPROVED",
      });

      const result = await service.generateMonthlySettlement({
        month: 9,
        year: 2026,
        generatedBy: "admin-user",
      });
      expect(result.status).toBe("APPROVED");
    });

    it("should create new batch when no commissions pending", async () => {
      mockPrisma.settlementBatch.findUnique.mockResolvedValue(null);
      mockPrisma.commission.findMany.mockResolvedValue([]);
      mockPrisma.settlementBatch.create.mockResolvedValue({
        id: "batch-new",
        period: "2026-09",
        status: "APPROVED",
        grossTotal: 0,
        netTotal: 0,
      });

      const result = await service.generateMonthlySettlement({
        month: 9,
        year: 2026,
        generatedBy: "admin-user",
      });
      expect(result.grossTotal).toBe(0);
    });
  });
});
