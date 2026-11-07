import { PrismaService } from "./prisma.service";

/**
 * Regression coverage for 2026-11-07: the API formerly executed DROP
 * MATERIALIZED VIEW during bootstrap and silently continued when the CREATE
 * failed. This suite never connects to PostgreSQL or mutates production.
 */
function makeService(rows: { ispopulated: boolean }[] = []) {
  const service = Object.create(PrismaService.prototype) as PrismaService;
  const logger = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  };
  const query = jest.fn().mockResolvedValue(rows);
  const execute = jest.fn().mockResolvedValue(0);
  const connect = jest.fn().mockResolvedValue(undefined);
  Object.assign(service, {
    logger,
    $queryRaw: query,
    $executeRawUnsafe: execute,
    $connect: connect,
    masterSyncViewReady: false,
    masterSyncNextCheckAt: 0,
    masterSyncWarningEmitted: false,
  });
  return { service, logger, query, execute, connect };
}

describe("PrismaService Master Sync startup protection", () => {
  it("does not execute DDL at startup when materialized view is missing", async () => {
    const { service, logger, query, execute } = makeService([]);
    await service.onModuleInit();

    expect(service.isDatabaseAvailable).toBe(true);
    expect(query).toHaveBeenCalledTimes(1);
    expect(execute).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining("MASTER_SYNC_VIEW_UNAVAILABLE"),
    );
  });

  it("does not refresh an absent view or emit duplicate alerts", async () => {
    const { service, logger, execute, query } = makeService([]);
    await service.refreshActiveCampaignsView();
    await service.refreshActiveCampaignsView();

    expect(execute).not.toHaveBeenCalled();
    expect(query).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledTimes(1);
  });

  it("refreshes a populated view without DROP or CREATE", async () => {
    const { service, execute, logger } = makeService([{ ispopulated: true }]);
    await service.refreshActiveCampaignsView();

    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledWith(
      "REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_active_campaigns;",
    );
    expect(logger.error).not.toHaveBeenCalled();
  });

  it("never attempts refresh on a view that has not been populated", async () => {
    const { service, execute, logger } = makeService([{ ispopulated: false }]);
    await service.refreshActiveCampaignsView();
    expect(execute).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining("MASTER_SYNC_VIEW_UNAVAILABLE"),
    );
  });

  it("recovers if the view appears after the readiness cache expires", async () => {
    const { service, execute, query, logger } = makeService([]);
    await service.refreshActiveCampaignsView();

    query.mockResolvedValue([{ ispopulated: true }]);
    Object.assign(service, { masterSyncNextCheckAt: 0 });
    await service.refreshActiveCampaignsView();

    expect(execute).toHaveBeenCalledTimes(1);
    expect(logger.log).toHaveBeenCalledWith(
      expect.stringContaining("MASTER_SYNC_VIEW_READY"),
    );
  });
});
