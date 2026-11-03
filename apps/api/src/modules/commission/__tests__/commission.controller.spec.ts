import { ForbiddenException } from "@nestjs/common";
import { CommissionController } from "../commission.controller";
import type { CommissionService } from "../commission.service";
import type { AuthUser } from "../../auth/auth.types";

describe("CommissionController ownership guard", () => {
  const pending = jest.fn();
  const history = jest.fn();
  const service = {
    getPendingCommissions: pending,
    getDriverCommissionHistory: history,
    prisma: {},
  } as unknown as CommissionService;
  const controller = new CommissionController(service);

  const user = (role: string, entityId?: string): { user: AuthUser } => ({
    user: {
      id: "session-user",
      email: "example@example.invalid",
      role,
      entityId,
    },
  });

  beforeEach(() => {
    jest.clearAllMocks();
    pending.mockResolvedValue([]);
    history.mockResolvedValue([]);
  });

  it("allows a driver to view only their own pending commissions", async () => {
    await expect(
      controller.getPendingCommissions("driver-1", user("DRIVER", "driver-1")),
    ).resolves.toEqual({ success: true, commissions: [] });
    expect(pending).toHaveBeenCalledWith("driver-1");
  });

  it("rejects pending access to another driver before hitting the service", async () => {
    await expect(
      controller.getPendingCommissions("driver-2", user("DRIVER", "driver-1")),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(pending).not.toHaveBeenCalled();
  });

  it("rejects commission history access to another driver before hitting the service", async () => {
    await expect(
      controller.getCommissionHistory("driver-2", user("DRIVER", "driver-1")),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(history).not.toHaveBeenCalled();
  });

  it("rejects driver tokens without entity ownership and missing sessions", async () => {
    await expect(
      controller.getCommissionHistory("driver-1", user("DRIVER")),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      controller.getPendingCommissions("driver-1", { user: undefined }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(history).not.toHaveBeenCalled();
    expect(pending).not.toHaveBeenCalled();
  });

  it("allows a privileged admin to query both endpoints", async () => {
    await expect(
      controller.getCommissionHistory("driver-2", user("ADMIN")),
    ).resolves.toEqual({ success: true, commissions: [] });
    await expect(
      controller.getPendingCommissions("driver-2", user("ADMIN")),
    ).resolves.toEqual({ success: true, commissions: [] });
    expect(history).toHaveBeenCalledWith("driver-2");
    expect(pending).toHaveBeenCalledWith("driver-2");
  });
});
