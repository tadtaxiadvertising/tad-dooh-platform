import { advertiserSafeSelect } from "../advertisers/advertiser-safe-select";
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { PortalRequestsService } from "./portal-requests.service";

describe("PortalRequestsService approval containment (#299)", () => {
  const findUnique = jest.fn();
  const updateMany = jest.fn();
  const update = jest.fn();
  const prisma = { portalRequest: { findUnique, updateMany, update } };
  const service = new PortalRequestsService(prisma as never);

  const general = { type: "GENERAL", campaignId: null, status: "PENDING" };

  beforeEach(() => {
    jest.resetAllMocks();
    findUnique.mockResolvedValue(general);
    updateMany.mockResolvedValue({ count: 1 });
    update.mockResolvedValue({ id: "req-1", ...general });
  });

  it.each(["PAYOUT", "CAMPAIGN_CREATE", "CONTENT_UPDATE", "CAMPAIGN_UPDATE"])(
    "rejects %s approval BEFORE ANY write or side effect",
    async (type) => {
      findUnique.mockResolvedValue({
        type,
        campaignId: null,
        status: "PENDING",
      });
      await expect(
        service.update("req-1", { status: "APPROVED" }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(updateMany).not.toHaveBeenCalled();
      expect(update).not.toHaveBeenCalled();
      expect(findUnique).toHaveBeenCalledTimes(1);
    },
  );

  it("blocks even GENERAL requests that reference a campaign", async () => {
    findUnique.mockResolvedValue({ ...general, campaignId: "campaign-1" });
    await expect(
      service.update("req-1", { status: "APPROVED" }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("approves GENERAL exactly once with a database compare-and-set", async () => {
    await service.update("req-1", {
      status: "APPROVED",
      adminNotes: "Resuelto",
    });
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "req-1", status: "PENDING" },
      data: { status: "APPROVED", adminNotes: "Resuelto" },
    });
    expect(update).not.toHaveBeenCalled();
  });

  it("rejects repeated approval, rejection and stale concurrent transitions", async () => {
    updateMany.mockResolvedValue({ count: 0 });
    for (const status of ["APPROVED", "REJECTED"]) {
      await expect(service.update("req-1", { status })).rejects.toBeInstanceOf(
        ConflictException,
      );
    }
    expect(updateMany).toHaveBeenCalledTimes(2);
  });

  it("permits rejecting an unsafe request without triggering payout", async () => {
    findUnique.mockResolvedValue({
      type: "PAYOUT",
      campaignId: null,
      status: "PENDING",
    });
    await service.update("req-1", { status: "REJECTED" });
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "req-1", status: "PENDING" },
      data: { status: "REJECTED" },
    });
    expect(update).not.toHaveBeenCalled();
  });

  it("allows notes-only edits without approval or campaign activation", async () => {
    findUnique.mockResolvedValue({ ...general, status: "APPROVED" });
    await service.update("req-1", { adminNotes: "Revisión manual" });
    expect(update).toHaveBeenCalledWith({
      where: { id: "req-1" },
      data: { adminNotes: "Revisión manual" },
      include: {
        advertiser: { select: advertiserSafeSelect },
        driver: true,
      },
    });
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("rejects unknown state transitions and empty updates", async () => {
    for (const data of [{ status: "PENDING" }, { status: "PROCESSING" }, {}]) {
      await expect(service.update("req-1", data)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    }
    expect(findUnique).not.toHaveBeenCalled();
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("returns 404 for missing requests and makes no write", async () => {
    findUnique.mockResolvedValueOnce(null);
    await expect(
      service.update("missing", { status: "REJECTED" }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("makes two concurrent approval attempts contend on the same PENDING predicate", async () => {
    updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });
    const attempts = await Promise.allSettled([
      service.update("req-1", { status: "APPROVED" }),
      service.update("req-1", { status: "APPROVED" }),
    ]);
    expect(
      attempts.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect(
      attempts.filter((result) => result.status === "rejected"),
    ).toHaveLength(1);
    expect(updateMany).toHaveBeenCalledTimes(2);
    for (const [params] of updateMany.mock.calls) {
      expect(params.where).toEqual({ id: "req-1", status: "PENDING" });
    }
  });
});
