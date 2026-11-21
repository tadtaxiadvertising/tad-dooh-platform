import type {
  Prisma,
  Commission,
  SettlementBatch,
  FinancialTransaction,
  Driver,
} from "@prisma/client";
import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";
import {
  CommissionService,
  CommissionStatus,
  CommissionSourceType,
} from "../commission.service";
import { PrismaService } from "../../prisma/prisma.service";

// Type annotation for mockPrisma to avoid circular reference
interface MockPrisma {
  commission: {
    findUnique: jest.Mock<
      Promise<Partial<Commission> | null>,
      [Prisma.CommissionFindUniqueArgs?]
    >;
    findFirst: jest.Mock<
      Promise<Partial<Commission> | null>,
      [Prisma.CommissionFindFirstArgs?]
    >;
    create: jest.Mock<
      Promise<Partial<Commission>>,
      [Prisma.CommissionCreateArgs?]
    >;
    update: jest.Mock<
      Promise<Partial<Commission>>,
      [Prisma.CommissionUpdateArgs?]
    >;
    findMany: jest.Mock<
      Promise<Partial<Commission>[]>,
      [Prisma.CommissionFindManyArgs?]
    >;
    count: jest.Mock<Promise<number>, [Prisma.CommissionCountArgs?]>;
  };
  settlementBatch: {
    findUnique: jest.Mock<
      Promise<Partial<SettlementBatch> | null>,
      [Prisma.SettlementBatchFindUniqueArgs?]
    >;
    findFirst: jest.Mock<
      Promise<Partial<SettlementBatch> | null>,
      [Prisma.SettlementBatchFindFirstArgs?]
    >;
    create: jest.Mock<
      Promise<Partial<SettlementBatch>>,
      [Prisma.SettlementBatchCreateArgs?]
    >;
    update: jest.Mock<
      Promise<Partial<SettlementBatch>>,
      [Prisma.SettlementBatchUpdateArgs?]
    >;
    findMany: jest.Mock<
      Promise<Partial<SettlementBatch>[]>,
      [Prisma.SettlementBatchFindManyArgs?]
    >;
  };
  financialTransaction: {
    create: jest.Mock<
      Promise<Partial<FinancialTransaction>>,
      [Prisma.FinancialTransactionCreateArgs?]
    >;
    findMany: jest.Mock<
      Promise<Partial<FinancialTransaction>[]>,
      [Prisma.FinancialTransactionFindManyArgs?]
    >;
  };
  driver: {
    findUnique: jest.Mock<
      Promise<Partial<Driver> | null>,
      [Prisma.DriverFindUniqueArgs?]
    >;
  };
  $transaction: jest.Mock<
    Promise<unknown>,
    [(prisma: MockPrisma) => Promise<unknown>]
  >;
}

describe("CommissionService", () => {
  let service: CommissionService;

  const mockPrisma: MockPrisma = {
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
      findFirst: jest.fn(),
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
    jest.clearAllMocks();
  });

  describe("createIdempotent", () => {
    it("should create commission when reference does not exist", async () => {
      mockPrisma.driver.findUnique.mockResolvedValue({
        id: "driver-1",
        fullName: "Driver 1",
      });
      mockPrisma.commission.findFirst.mockResolvedValue(null);
      mockPrisma.commission.create.mockResolvedValue({
        id: "commission-1",
        reference: "REF-BONUS-123",
        amount: 500,
        status: CommissionStatus.PENDING,
      });

      const result = await service.createIdempotent({
        driverId: "driver-1",
        amount: 500,
        sourceType: CommissionSourceType.DRIVER_REFERRAL,
        reference: "REF-BONUS-123",
      });

      expect(result).toBeDefined();
      expect(result.commission.reference).toBe("REF-BONUS-123");
      expect(result.created).toBe(true);
      expect(mockPrisma.commission.create).toHaveBeenCalled();
    });

    it("should return existing commission when reference exists", async () => {
      const existing = {
        id: "commission-1",
        driverId: "driver-1",
        reference: "REF-BONUS-123",
        amount: 500,
        sourceType: CommissionSourceType.DRIVER_REFERRAL,
        metadata: {},
        status: CommissionStatus.PENDING,
      };
      mockPrisma.commission.findFirst.mockResolvedValue(existing);

      const result = await service.createIdempotent({
        driverId: "driver-1",
        amount: 500,
        sourceType: CommissionSourceType.DRIVER_REFERRAL,
        reference: "REF-BONUS-123",
      });

      expect(result.commission).toEqual(existing);
      expect(result.created).toBe(false);
      expect(mockPrisma.commission.create).not.toHaveBeenCalled();
    });
  });

  describe("generateMonthlySettlement", () => {
    it("should return existing batch if already processed", async () => {
      mockPrisma.settlementBatch.findUnique.mockResolvedValue({
        id: "batch-1",
        period: "2026-09",
        referents: [],
        grossTotal: 1000,
        netTotal: 1000,
        withholdings: 0,
        status: "APPROVED",
        approvedAt: new Date(),
        paidAt: null,
        createdAt: new Date(),
      });
      mockPrisma.commission.findMany.mockResolvedValue([]);

      const result = await service.generateMonthlySettlement({
        month: 9,
        year: 2026,
        generatedBy: "admin-1",
      });

      expect(result.status).toBe("APPROVED");
    });

    it("rejects a zero-commission settlement so later approvals remain eligible", async () => {
      mockPrisma.settlementBatch.findUnique.mockResolvedValue(null);
      mockPrisma.commission.findMany.mockResolvedValue([]);

      await expect(
        service.generateMonthlySettlement({
          month: 9,
          year: 2026,
          generatedBy: "admin-1",
        }),
      ).rejects.toThrow("has no approved commissions");

      expect(mockPrisma.settlementBatch.create).not.toHaveBeenCalled();
    });
  });
});
