import { ForbiddenException } from "@nestjs/common";
import type { AuthenticatedRequest } from "../auth/auth.types";
import { UserRole } from "../auth/decorators/roles.decorator";
import { AnalyticsController } from "./analytics.controller";

describe("Advertiser analytics tenant-scope invariant", () => {
  const analytics = {
    getAnalyticsSummary: jest.fn(),
    getTotalImpressions: jest.fn(),
    getAntiFraudMetrics: jest.fn(),
    getTopTaxis: jest.fn(),
    getHourlyAnalytics: jest.fn(),
    getRecentPlays: jest.fn(),
    getPlaybackHeatmap: jest.fn(),
  };
  const controller = new AnalyticsController(
    analytics as never,
    {} as never,
    {} as never,
    {} as never,
  );

  const request = (role: UserRole, entityId?: unknown) =>
    ({
      user: {
        id: "user-1",
        email: "test@example.invalid",
        role,
        entityId: entityId as string | undefined,
      },
    }) as AuthenticatedRequest;

  const endpoints: Array<{
    name: string;
    call: (req: AuthenticatedRequest) => Promise<unknown>;
    spy: jest.Mock;
    adminScope?: string;
  }> = [
    {
      name: "summary",
      call: (req) => controller.getAnalyticsSummary(req),
      spy: analytics.getAnalyticsSummary,
    },
    {
      name: "total-impressions",
      call: (req) => controller.getTotalImpressions(req),
      spy: analytics.getTotalImpressions,
    },
    {
      name: "anti-fraud",
      call: (req) => controller.getAntiFraudMetrics(req),
      spy: analytics.getAntiFraudMetrics,
    },
    {
      name: "top-taxis",
      call: (req) => controller.getTopTaxis(req),
      spy: analytics.getTopTaxis,
    },
    {
      name: "hourly",
      call: (req) => controller.getHourlyAnalytics(req),
      spy: analytics.getHourlyAnalytics,
    },
    {
      name: "recent-plays",
      call: (req) => controller.getRecentPlays(req),
      spy: analytics.getRecentPlays,
    },
    {
      name: "heatmap",
      call: (req) => controller.getHeatmap("requested-other-tenant", req),
      spy: analytics.getPlaybackHeatmap,
      adminScope: "requested-other-tenant",
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  for (const endpoint of endpoints) {
    it.each([undefined, null, "", "   "])(
      `rejects ${endpoint.name} for an advertiser missing entityId: %p`,
      async (entityId) => {
        await expect(
          endpoint.call(request(UserRole.ADVERTISER, entityId)),
        ).rejects.toBeInstanceOf(ForbiddenException);
        expect(endpoint.spy).not.toHaveBeenCalled();
      },
    );

    it(`scopes ${endpoint.name} to authenticated advertiser identity`, async () => {
      await endpoint.call(request(UserRole.ADVERTISER, "owned-advertiser"));
      expect(endpoint.spy).toHaveBeenCalledTimes(1);
      expect(endpoint.spy).toHaveBeenCalledWith("owned-advertiser");
    });

    it(`retains authorized admin scope for ${endpoint.name}`, async () => {
      await endpoint.call(request(UserRole.ADMIN));
      expect(endpoint.spy).toHaveBeenCalledTimes(1);
      expect(endpoint.spy).toHaveBeenCalledWith(endpoint.adminScope);
    });
  }
});
