import { BiScheduler } from "./bi.scheduler";

describe("BiScheduler idempotency retention", () => {
  it("does not delete expired completed keys that could be replayed after 24h", async () => {
    const count = jest.fn().mockResolvedValue(2);
    const findFirst = jest.fn().mockResolvedValue({ id: "opaque-row-id" });
    const deleteMany = jest.fn();
    const logger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
    const scheduler = Object.create(BiScheduler.prototype) as BiScheduler;
    Object.assign(scheduler, {
      prisma: { idempotencyKey: { count, findFirst, deleteMany } },
      logger,
    });

    await scheduler.handleIdempotencyCleanup();

    expect(count).toHaveBeenCalledWith({
      where: {
        isLocked: true,
        createdAt: { lt: expect.any(Date) },
      },
    });
    expect(findFirst).toHaveBeenCalledWith({
      where: {
        expiresAt: { lt: expect.any(Date) },
        isLocked: false,
      },
      select: { id: true },
    });
    expect(deleteMany).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("IDEMPOTENCY_RECONCILIATION_REQUIRED"),
    );
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("IDEMPOTENCY_ARCHIVE_REQUIRED"),
    );
    expect(logger.error).not.toHaveBeenCalled();
  });

  it("does not warn about archives when no old completed rows exist", async () => {
    const logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
    const scheduler = Object.create(BiScheduler.prototype) as BiScheduler;
    Object.assign(scheduler, {
      prisma: {
        idempotencyKey: {
          count: jest.fn().mockResolvedValue(0),
          findFirst: jest.fn().mockResolvedValue(null),
          deleteMany: jest.fn(),
        },
      },
      logger,
    });

    await scheduler.handleIdempotencyCleanup();

    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });
});
