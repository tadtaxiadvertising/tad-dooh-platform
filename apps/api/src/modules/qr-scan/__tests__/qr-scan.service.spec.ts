import { Test, TestingModule } from "@nestjs/testing";
import { QrScanService } from "../qr-scan.service";
import { PrismaService } from "../../prisma/prisma.service";

describe("QrScanService", () => {
  let service: QrScanService;
  let prisma: PrismaService;

  const mockPrisma = {
    qrScan: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrisma)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QrScanService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<QrScanService>(QrScanService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe("recordScan", () => {
    it("should create new scan when no duplicate in 24h", async () => {
      mockPrisma.qrScan.findFirst.mockResolvedValue(null);
      mockPrisma.qrScan.create.mockResolvedValue({
        id: "scan-1",
        qrCode: "QR-TEST-123",
        referrerCode: "REF-DRIVER-1",
        converted: false,
      });

      const result = await service.recordScan({
        qrCode: "QR-TEST-123",
        referrerCode: "REF-DRIVER-1",
        ipAddress: "192.168.1.1",
      });

      expect(result).toBeDefined();
      expect(result.scan.qrCode).toBe("QR-TEST-123");
      expect(mockPrisma.qrScan.create).toHaveBeenCalled();
    });

    it("should return existing scan when duplicate in 24h", async () => {
      const existing = {
        id: "scan-1",
        qrCode: "QR-TEST-123",
        referrerCode: "REF-DRIVER-1",
        converted: false,
      };
      mockPrisma.qrScan.findFirst.mockResolvedValue(existing);

      const result = await service.recordScan({
        qrCode: "QR-TEST-123",
        referrerCode: "REF-DRIVER-1",
        ipAddress: "192.168.1.1",
      });

      expect(result).toEqual(
        expect.objectContaining({
          scan: existing,
          isDuplicate: true,
          converted: false,
        }),
      );
      expect(mockPrisma.qrScan.create).not.toHaveBeenCalled();
    });
  });

  describe("markConverted", () => {
    it("should mark scan as converted and link to lead", async () => {
      mockPrisma.qrScan.findUnique.mockResolvedValue({
        id: "scan-1",
        qrCode: "QR-TEST-123",
        referrerCode: "REF-DRIVER-1",
        converted: false,
      });
      mockPrisma.qrScan.update.mockResolvedValue({
        id: "scan-1",
        converted: true,
        leadId: "lead-1",
      });

      const result = await service.markConverted("scan-1", "lead-1");
      expect(result.converted).toBe(true);
      expect(result.leadId).toBe("lead-1");
    });
  });
});
