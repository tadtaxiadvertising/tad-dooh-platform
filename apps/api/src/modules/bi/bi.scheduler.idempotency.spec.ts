import { BiScheduler } from "./bi.scheduler";

describe("BiScheduler idempotency cleanup", () => {
  it("only purges expired completed keys; unknown outcomes remain locked", async () => {
    const count = jest.fn().mockResolvedValue(2);
    const deleteMany = jest.fn().mockResolvedValue({ count: 3 });
    const logger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
    // Test the scheduled handler directly without starting background crons.
    const scheduler = Object.create(BiScheduler.prototype) as BiScheduler;
    Object.assign(scheduler, {
      prisma: { idempotencyKey: { count, deleteMany } },
      logger,
    });

    await scheduler.handleIdempotencyCleanup();

    expect(count).toHaveBeenCalledWith({
      where: {
        isLocked: true,
        createdAt: { lt: expect.any(Date) },
      },
    });
    expect(deleteMany).toHaveBeenCalledWith({
      where: {
        expiresAt: { lt: expect.any(Date) },
        isLocked: false,
      },
    });
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("IDEMPOTENCY_RECONCILIATION_REQUIRED"),
    );
    expect(logger.error).not.toHaveBeenCalled();
  });
});
