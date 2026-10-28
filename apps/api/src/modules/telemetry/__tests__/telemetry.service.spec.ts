import { Test, TestingModule } from "@nestjs/testing";
import { TelemetryService } from "../telemetry.service";
import { PrismaService } from "../../prisma/prisma.service";

describe("TelemetryService Security & Rate Limit", () => {
  let service: TelemetryService;
  let prisma: PrismaService;

  const mockPrismaService = {
    $executeRawUnsafe: jest.fn(),
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelemetryService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<TelemetryService>(TelemetryService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  it("should parameterize inputs in checkPlaybackRateLimit to prevent SQL injection", async () => {
    const maliciousDeviceId = "dev-123'; DROP TABLE users; --";
    mockPrismaService.$queryRaw.mockResolvedValue([{ count: 0 }]);
    mockPrismaService.$executeRaw.mockResolvedValue(1);

    const result = await service.checkPlaybackRateLimit(maliciousDeviceId, 1);

    expect(result).toBe(true);
    // Verify $queryRaw and $executeRaw were called (parameterized template tags) instead of unparameterized strings
    expect(mockPrismaService.$queryRaw).toHaveBeenCalled();
    expect(mockPrismaService.$executeRaw).toHaveBeenCalled();
  });

  it("should use parameterized $executeRaw for recordPlayback to prevent SQL injection", async () => {
    mockPrismaService.$executeRaw.mockResolvedValue(1);

    const result = await service.recordPlayback({
      deviceId: "dev-123'; DROP TABLE playback_events; --",
      videoId: "vid-456",
      eventType: "START",
      verified: true,
    });

    expect(result).toEqual({ success: true, verified: true });
    expect(mockPrismaService.$executeRaw).toHaveBeenCalled();
  });
});
