import { MediaScheduler } from "./media.scheduler";
import type { PrismaService } from "../prisma/prisma.service";
import type { SupabaseService } from "../supabase/supabase.service";

describe("MediaScheduler: fail-closed orphan cleanup", () => {
  const previousApproval = process.env.TAD_STORAGE_GC_OPERATOR_APPROVAL;
  const oldObject = {
    id: "synthetic-media-record",
    name: "synthetic-orphan.mp4",
    created_at: "2020-01-01T00:00:00.000Z",
    metadata: { size: "5" },
  };
  const list = jest.fn();
  const remove = jest.fn();
  const mediaFindMany = jest.fn();
  const assetFindMany = jest.fn();
  let scheduler: MediaScheduler;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.TAD_STORAGE_GC_OPERATOR_APPROVAL;
    list.mockResolvedValue({ data: [oldObject], error: null });
    remove.mockResolvedValue({ error: null });
    mediaFindMany.mockResolvedValue([]);
    assetFindMany.mockResolvedValue([]);

    const prisma = {
      media: { findMany: mediaFindMany },
      mediaAsset: { findMany: assetFindMany },
    } as unknown as PrismaService;

    const storage = { from: jest.fn(() => ({ list, remove })) };
    const supabase = {
      getClient: jest.fn(() => ({ storage })),
    } as unknown as SupabaseService;

    scheduler = new MediaScheduler(prisma, supabase);
  });

  afterAll(() => {
    if (previousApproval === undefined) {
      delete process.env.TAD_STORAGE_GC_OPERATOR_APPROVAL;
    } else {
      process.env.TAD_STORAGE_GC_OPERATOR_APPROVAL = previousApproval;
    }
  });

  it("blocks the scheduled job by default without touching database or Storage", async () => {
    await scheduler.handleOrphanCleanup();
    expect(list).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
    expect(mediaFindMany).not.toHaveBeenCalled();
    expect(assetFindMany).not.toHaveBeenCalled();
  });

  it("rejects an unrelated enablement flag", async () => {
    process.env.TAD_STORAGE_GC_OPERATOR_APPROVAL = "true";
    await scheduler.handleOrphanCleanup();
    expect(list).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
  });

  it("does not delete any file when both reference catalogs are empty", async () => {
    process.env.TAD_STORAGE_GC_OPERATOR_APPROVAL =
      "AUTHORIZED_AFTER_VERIFIED_RESTORE";
    await scheduler.handleOrphanCleanup();
    expect(list).toHaveBeenCalledTimes(2);
    expect(mediaFindMany).toHaveBeenCalledTimes(2);
    expect(assetFindMany).toHaveBeenCalledTimes(2);
    expect(remove).not.toHaveBeenCalled();
  });

  it("preserves a referenced file under authorized cleanup", async () => {
    process.env.TAD_STORAGE_GC_OPERATOR_APPROVAL =
      "AUTHORIZED_AFTER_VERIFIED_RESTORE";
    mediaFindMany.mockResolvedValue([{ storageKey: "synthetic-orphan.mp4" }]);
    await scheduler.handleOrphanCleanup();
    expect(remove).not.toHaveBeenCalled();
  });

  it("allows only the explicitly authorized, populated-catalog cleanup path", async () => {
    process.env.TAD_STORAGE_GC_OPERATOR_APPROVAL =
      "AUTHORIZED_AFTER_VERIFIED_RESTORE";
    mediaFindMany.mockResolvedValue([{ storageKey: "different.mp4" }]);
    await scheduler.handleOrphanCleanup();
    expect(remove).toHaveBeenCalledTimes(2);
    expect(remove).toHaveBeenCalledWith(["synthetic-orphan.mp4"]);
  });

  it("fails closed when Storage listing is unavailable", async () => {
    process.env.TAD_STORAGE_GC_OPERATOR_APPROVAL =
      "AUTHORIZED_AFTER_VERIFIED_RESTORE";
    mediaFindMany.mockResolvedValue([{ storageKey: "different.mp4" }]);
    list.mockResolvedValue({ data: null, error: { message: "offline" } });
    await scheduler.handleOrphanCleanup();
    expect(remove).not.toHaveBeenCalled();
  });

  it("never deletes when Prisma cannot load the reference catalog", async () => {
    process.env.TAD_STORAGE_GC_OPERATOR_APPROVAL =
      "AUTHORIZED_AFTER_VERIFIED_RESTORE";
    mediaFindMany.mockRejectedValue(new Error("read failure"));
    await scheduler.handleOrphanCleanup();
    expect(remove).not.toHaveBeenCalled();
  });
  it("refuses to delete root files when the bucket listing contains a folder", async () => {
    process.env.TAD_STORAGE_GC_OPERATOR_APPROVAL =
      "AUTHORIZED_AFTER_VERIFIED_RESTORE";
    list.mockResolvedValue({
      data: [
        oldObject,
        { name: "advertiser-uploads", id: null, metadata: null },
      ],
      error: null,
    });
    mediaFindMany.mockResolvedValue([{ storageKey: "different.mp4" }]);
    await scheduler.handleOrphanCleanup();
    expect(list).toHaveBeenCalledTimes(2);
    expect(remove).not.toHaveBeenCalled();
    expect(mediaFindMany).not.toHaveBeenCalled();
  });

  it("refuses to delete from a listing at its 1000-object page limit", async () => {
    process.env.TAD_STORAGE_GC_OPERATOR_APPROVAL =
      "AUTHORIZED_AFTER_VERIFIED_RESTORE";
    list.mockResolvedValue({
      data: Array.from({ length: 1000 }, (_, i) => ({
        ...oldObject,
        name: `synthetic-${i}.mp4`,
      })),
      error: null,
    });
    mediaFindMany.mockResolvedValue([{ storageKey: "different.mp4" }]);
    await scheduler.handleOrphanCleanup();
    expect(remove).not.toHaveBeenCalled();
    expect(mediaFindMany).not.toHaveBeenCalled();
  });

  it("refuses to delete when a stored media key has path traversal", async () => {
    process.env.TAD_STORAGE_GC_OPERATOR_APPROVAL =
      "AUTHORIZED_AFTER_VERIFIED_RESTORE";
    mediaFindMany.mockResolvedValue([{ storageKey: "../untrusted.mp4" }]);
    await scheduler.handleOrphanCleanup();
    expect(remove).not.toHaveBeenCalled();
  });

  it("preserves an asset with URL-encoded filename, query and fragment", async () => {
    process.env.TAD_STORAGE_GC_OPERATOR_APPROVAL =
      "AUTHORIZED_AFTER_VERIFIED_RESTORE";
    list
      .mockResolvedValueOnce({
        data: [{ ...oldObject, name: "creative final.mp4" }],
        error: null,
      })
      .mockResolvedValueOnce({ data: [], error: null });
    mediaFindMany.mockResolvedValue([{ storageKey: "different.mp4" }]);
    assetFindMany.mockResolvedValue([
      {
        url: "https://cdn.example.invalid/storage/v1/object/public/campaign-videos/creative%20final.mp4?v=1#live",
      },
    ]);
    await scheduler.handleOrphanCleanup();
    expect(remove).not.toHaveBeenCalled();
  });

  it("refuses to delete when a reference points to an unrecognized URL", async () => {
    process.env.TAD_STORAGE_GC_OPERATOR_APPROVAL =
      "AUTHORIZED_AFTER_VERIFIED_RESTORE";
    mediaFindMany.mockResolvedValue([{ storageKey: "different.mp4" }]);
    assetFindMany.mockResolvedValue([
      { url: "https://cdn.example.invalid/custom-path/creative.mp4" },
    ]);
    await scheduler.handleOrphanCleanup();
    expect(remove).not.toHaveBeenCalled();
  });

  it("refuses to delete when a storage URL decodes to traversal", async () => {
    process.env.TAD_STORAGE_GC_OPERATOR_APPROVAL =
      "AUTHORIZED_AFTER_VERIFIED_RESTORE";
    mediaFindMany.mockResolvedValue([{ storageKey: "different.mp4" }]);
    assetFindMany.mockResolvedValue([
      {
        url: "https://cdn.example.invalid/storage/v1/object/public/campaign-videos/%2e%2e%2Fescape.mp4",
      },
    ]);
    await scheduler.handleOrphanCleanup();
    expect(remove).not.toHaveBeenCalled();
  });

  it("does not incorrectly protect a different bucket using a foreign URL", async () => {
    process.env.TAD_STORAGE_GC_OPERATOR_APPROVAL =
      "AUTHORIZED_AFTER_VERIFIED_RESTORE";
    mediaFindMany.mockResolvedValue([{ storageKey: "different.mp4" }]);
    assetFindMany.mockResolvedValue([
      {
        url: "https://cdn.example.invalid/storage/v1/object/public/ads-videos/synthetic-orphan.mp4",
      },
    ]);
    await scheduler.handleOrphanCleanup();
    expect(remove).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledWith(["synthetic-orphan.mp4"]);
  });
});
