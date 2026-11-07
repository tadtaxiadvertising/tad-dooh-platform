import { Reflector } from "@nestjs/core";
import { AnalyticsController } from "../analytics.controller";
import { ROLES_KEY, UserRole } from "../../auth/decorators/roles.decorator";

describe("AnalyticsController RBAC", () => {
  let reflector: Reflector;
  let controller: AnalyticsController;

  beforeEach(() => {
    reflector = new Reflector();
    controller = AnalyticsController.prototype;
  });

  it("should restrict getCampaignAnalytics to ADMIN and ADVERTISER roles", () => {
    const roles = reflector.get<UserRole[]>(
      ROLES_KEY,
      controller.getCampaignAnalytics,
    );
    expect(roles).toEqual([UserRole.ADMIN, UserRole.ADVERTISER]);
  });
});
