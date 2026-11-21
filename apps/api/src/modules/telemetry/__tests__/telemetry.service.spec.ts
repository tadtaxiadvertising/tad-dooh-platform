import { Test, TestingModule } from "@nestjs/testing";
import { TelemetryService } from "../telemetry.service";
import { PrismaService } from "../../prisma/prisma.service";

describe("TelemetryService Security & Rate Limit", () => {
  let service: TelemetryService;

  const mockPrismaService = {
    $executeRawUnsafe: jest.fn(),
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelemetryService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();
    service = module.get<TelemetryService>(TelemetryService);
  });

  it("parameterizes deviceId and uses one atomic UPSERT instead of SELECT + UPDATE", async () => {
    const maliciousDeviceId = "dev-123'; DROP TABLE users; --";
    mockPrismaService.$queryRaw.mockResolvedValue([{ count: 1 }]);

    await expect(
      service.checkPlaybackRateLimit(maliciousDeviceId, 1),
    ).resolves.toBe(true);

    expect(mockPrismaService.$queryRaw).toHaveBeenCalledTimes(1);
    const [strings, deviceId, windowStart, requested, limit] =
      mockPrismaService.$queryRaw.mock.calls[0];
    const sql = strings.join("?");
    expect(sql).toContain("ON CONFLICT (device_id, window_start)");
    expect(sql).toContain("EXCLUDED.count");
    expect(sql).toContain("RETURNING count");
    expect(sql).not.toContain(maliciousDeviceId);
    expect(deviceId).toBe(maliciousDeviceId);
    expect(windowStart).toBeInstanceOf(Date);
    expect(requested).toBe(1);
    expect(limit).toBe(60);
    expect(mockPrismaService.$executeRaw).not.toHaveBeenCalled();
    expect(mockPrismaService.$executeRawUnsafe).not.toHaveBeenCalled();
  });

  it("charges each batch by its true size, allowing only one concurrent batch of 50", async () => {
    let used = 0;
    mockPrismaService.$queryRaw.mockImplementation(
      async (
        _sql: TemplateStringsArray,
        _deviceId: string,
        _windowStart: Date,
        requested: number,
        limit: number,
      ) => {
        // Synthetic implementation of PostgreSQL's atomic conflict predicate.
        if (used + requested > limit) return [];
        used += requested;
        return [{ count: used }];
      },
    );

    const results = await Promise.all([
      service.checkPlaybackRateLimit("TAD-DEVICE", 50),
      service.checkPlaybackRateLimit("TAD-DEVICE", 50),
    ]);
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(used).toBe(50);
    expect(mockPrismaService.$queryRaw).toHaveBeenCalledTimes(2);
  });

  it("accepts the exact 60-event boundary and rejects the next event", async () => {
    let used = 0;
    mockPrismaService.$queryRaw.mockImplementation(
      async (
        _sql: TemplateStringsArray,
        _deviceId: string,
        _windowStart: Date,
        requested: number,
        limit: number,
      ) => {
        if (used + requested > limit) return [];
        used += requested;
        return [{ count: used }];
      },
    );
    await expect(
      service.checkPlaybackRateLimit("TAD-DEVICE", 20),
    ).resolves.toBe(true);
    await expect(
      service.checkPlaybackRateLimit("TAD-DEVICE", 40),
    ).resolves.toBe(true);
    await expect(service.checkPlaybackRateLimit("TAD-DEVICE", 1)).resolves.toBe(
      false,
    );
    expect(used).toBe(60);
  });

  it.each([0, -1, 1.5, 61, NaN, Infinity])(
    "rejects an invalid batch size %s without any DB query",
    async (count) => {
      await expect(
        service.checkPlaybackRateLimit("TAD-DEVICE", count),
      ).resolves.toBe(false);
      expect(mockPrismaService.$queryRaw).not.toHaveBeenCalled();
      expect(mockPrismaService.$executeRaw).not.toHaveBeenCalled();
    },
  );
});
