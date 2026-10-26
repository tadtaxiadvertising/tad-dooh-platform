import { Reflector } from "@nestjs/core";
import { DriversController } from "../drivers.controller";
import { ROLES_KEY, UserRole } from "../../auth/decorators/roles.decorator";

describe("DriversController Authorization", () => {
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
  });

  it("should enforce ADMIN role on linkActiveAd endpoint", () => {
    const roles = reflector.get<UserRole[]>(
      ROLES_KEY,
      DriversController.prototype.linkActiveAd,
    );
    expect(roles).toBeDefined();
    expect(roles).toEqual([UserRole.ADMIN]);
  });
});
