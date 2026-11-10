import { Reflector } from "@nestjs/core";
import { ConversationController } from "../conversation.controller";
import { ROLES_KEY, UserRole } from "../../auth/decorators/roles.decorator";
import { IS_PUBLIC_KEY } from "../../auth/decorators/public.decorator";

describe("ConversationController RBAC", () => {
  let reflector: Reflector;
  let controller: ConversationController;

  beforeEach(() => {
    reflector = new Reflector();
    controller = ConversationController.prototype;
  });

  it("should restrict ConversationController at class level to ADMIN role", () => {
    const roles = reflector.get<UserRole[]>(ROLES_KEY, ConversationController);
    expect(roles).toEqual([UserRole.ADMIN]);
  });

  it("must NOT be marked with @Public() at class or method level", () => {
    const isPublicClass = reflector.get<boolean>(
      IS_PUBLIC_KEY,
      ConversationController,
    );
    expect(isPublicClass).toBeFalsy();

    const isPublicFindOrCreate = reflector.get<boolean>(
      IS_PUBLIC_KEY,
      controller.findOrCreate,
    );
    expect(isPublicFindOrCreate).toBeFalsy();
  });

  it("should restrict findOrCreate to ADMIN role", () => {
    const roles = reflector.get<UserRole[]>(ROLES_KEY, controller.findOrCreate);
    expect(roles).toEqual([UserRole.ADMIN]);
  });

  it("should restrict addMessage to ADMIN role", () => {
    const roles = reflector.get<UserRole[]>(ROLES_KEY, controller.addMessage);
    expect(roles).toEqual([UserRole.ADMIN]);
  });

  it("should restrict updateConversation to ADMIN role", () => {
    const roles = reflector.get<UserRole[]>(
      ROLES_KEY,
      controller.updateConversation,
    );
    expect(roles).toEqual([UserRole.ADMIN]);
  });

  it("should restrict handoff to ADMIN role", () => {
    const roles = reflector.get<UserRole[]>(ROLES_KEY, controller.handoff);
    expect(roles).toEqual([UserRole.ADMIN]);
  });

  it("should restrict close to ADMIN role", () => {
    const roles = reflector.get<UserRole[]>(ROLES_KEY, controller.close);
    expect(roles).toEqual([UserRole.ADMIN]);
  });

  it("should restrict getById to ADMIN role", () => {
    const roles = reflector.get<UserRole[]>(ROLES_KEY, controller.getById);
    expect(roles).toEqual([UserRole.ADMIN]);
  });

  it("should restrict getByThreadId to ADMIN role", () => {
    const roles = reflector.get<UserRole[]>(
      ROLES_KEY,
      controller.getByThreadId,
    );
    expect(roles).toEqual([UserRole.ADMIN]);
  });

  it("should restrict list to ADMIN role", () => {
    const roles = reflector.get<UserRole[]>(ROLES_KEY, controller.list);
    expect(roles).toEqual([UserRole.ADMIN]);
  });

  it("should restrict getStats to ADMIN role", () => {
    const roles = reflector.get<UserRole[]>(ROLES_KEY, controller.getStats);
    expect(roles).toEqual([UserRole.ADMIN]);
  });
});
