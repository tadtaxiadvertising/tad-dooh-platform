import { Reflector } from "@nestjs/core";
import { LeadController } from "../lead.controller";
import { ROLES_KEY, UserRole } from "../../auth/decorators/roles.decorator";

describe("LeadController RBAC", () => {
  let reflector: Reflector;
  let controller: LeadController;

  beforeEach(() => {
    reflector = new Reflector();
    // Metadata lives on the real methods; no service instance is needed.
    controller = LeadController.prototype;
  });

  it("should restrict getLead to ADMIN role", () => {
    const roles = reflector.get<UserRole[]>(ROLES_KEY, controller.getLead);
    expect(roles).toEqual([UserRole.ADMIN]);
  });

  it("should restrict updateLeadStatus to ADMIN role", () => {
    const roles = reflector.get<UserRole[]>(
      ROLES_KEY,
      controller.updateLeadStatus,
    );
    expect(roles).toEqual([UserRole.ADMIN]);
  });

  it("should restrict registerPaymentEvidence to ADMIN role", () => {
    const roles = reflector.get<UserRole[]>(
      ROLES_KEY,
      controller.registerPaymentEvidence,
    );
    expect(roles).toEqual([UserRole.ADMIN]);
  });

  it("should restrict verifyPayment to ADMIN role", () => {
    const roles = reflector.get<UserRole[]>(
      ROLES_KEY,
      controller.verifyPayment,
    );
    expect(roles).toEqual([UserRole.ADMIN]);
  });

  it("should restrict getLeads to ADMIN role", () => {
    const roles = reflector.get<UserRole[]>(ROLES_KEY, controller.getLeads);
    expect(roles).toEqual([UserRole.ADMIN]);
  });
});
