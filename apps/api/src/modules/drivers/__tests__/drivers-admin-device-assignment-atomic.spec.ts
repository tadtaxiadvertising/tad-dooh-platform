import { DriversService } from "../drivers.service";

describe("DriversService.assignDevice atomic handoff", () => {
  const makeHarness = () => {
    const links = new Map<string, string | null>([
      ["old-tablet", "driver-1"],
      ["target-tablet", null],
    ]);
    let failTargetWrite = false;
    let nextTargetOwnerBeforeTx: string | null | undefined;

    // Simulates PostgreSQL's per-driver row lock, released at transaction end.
    let lockHeld = false;
    const lockWaiters: Array<() => void> = [];
    const tx = {
      driver: {
        // A driver row update is the per-driver serialization lock.
        update: jest.fn(
          async (_args: {
            where: { id: string };
            data: { updatedAt: Date };
            select: { status: true; onboardingStatus: true };
          }) => ({
            status: "OPERATIVO",
            onboardingStatus: "COMPLETED",
          }),
        ),
      },
      $queryRaw: jest.fn(async (_sql: TemplateStringsArray, id: string) => {
        if (lockHeld) {
          await new Promise<void>((resolve) => lockWaiters.push(resolve));
        }
        lockHeld = true;
        return [{ id }];
      }),
      device: {
        updateMany: jest.fn(
          async ({
            where,
            data,
          }: {
            where: { driverId: string; id?: { not: string } };
            data: { driverId: null };
          }) => {
            let count = 0;
            for (const [id, owner] of links) {
              if (
                owner === where.driverId &&
                (!where.id || id !== where.id.not)
              ) {
                links.set(id, data.driverId);
                count++;
              }
            }
            return { count };
          },
        ),
        update: jest.fn(
          async ({
            where,
            data,
          }: {
            where: { id: string; driverId: string | null };
            data: { driverId: string };
          }) => {
            if (failTargetWrite) throw new Error("target device write failed");
            if (!links.has(where.id)) throw new Error("device missing");
            if (links.get(where.id) !== where.driverId) {
              throw new Error("target ownership changed (CAS rejected)");
            }
            links.set(where.id, data.driverId);
            return { id: where.id, driverId: data.driverId };
          },
        ),
      },
    };

    const targetDevice = {
      id: "target-tablet",
      deviceId: "TAD-TARGET",
      driverId: null,
    };
    const prisma = {
      driver: {
        findUnique: jest.fn().mockResolvedValue({
          id: "driver-1",
          status: "OPERATIVO",
          onboardingStatus: "COMPLETED",
        }),
      },
      device: {
        findMany: jest.fn().mockResolvedValue([targetDevice]),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      // Simulate both rollback and the release of the row lock on commit.
      // This fixture does not replace a real PostgreSQL concurrency test.
      $transaction: jest.fn(
        async (callback: (client: typeof tx) => Promise<unknown>) => {
          // An unrelated admin may change the target after the initial read.
          if (nextTargetOwnerBeforeTx !== undefined) {
            links.set("target-tablet", nextTargetOwnerBeforeTx);
          }
          let acquired = false;
          const snapshot = new Map(links);
          try {
            const result = await callback(tx);
            acquired = true;
            return result;
          } catch (error) {
            links.clear();
            for (const [id, owner] of snapshot) links.set(id, owner);
            acquired = true;
            throw error;
          } finally {
            if (acquired) {
              lockHeld = false;
              lockWaiters.shift()?.();
            }
          }
        },
      ),
    };

    return {
      service: new DriversService(
        prisma as never,
        { get: jest.fn() } as never,
        {} as never,
        {} as never,
      ),
      prisma,
      tx,
      links,
      setFailTargetWrite: () => {
        failTargetWrite = true;
      },
      setTargetOwnerBeforeTx: (owner: string | null) => {
        nextTargetOwnerBeforeTx = owner;
      },
    };
  };

  it("updates previous and target device inside one transaction", async () => {
    const { service, prisma, tx, links } = makeHarness();
    await expect(
      service.assignDevice("driver-1", "TAD-TARGET"),
    ).resolves.toEqual({
      id: "target-tablet",
      driverId: "driver-1",
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.driver.update).toHaveBeenCalledWith({
      where: { id: "driver-1" },
      data: { updatedAt: expect.any(Date) },
      select: { status: true, onboardingStatus: true },
    });
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    const [sql, lockedDriverId] = tx.$queryRaw.mock.calls[0];
    expect(sql.join("?")).toContain("FOR NO KEY UPDATE");
    expect(lockedDriverId).toBe("driver-1");
    expect(tx.device.updateMany).toHaveBeenCalledWith({
      where: { driverId: "driver-1", id: { not: "target-tablet" } },
      data: { driverId: null },
    });
    expect(tx.device.update).toHaveBeenCalledWith({
      where: { id: "target-tablet", driverId: null },
      data: { driverId: "driver-1" },
    });
    expect(tx.driver.update.mock.invocationCallOrder[0]).toBeLessThan(
      tx.device.updateMany.mock.invocationCallOrder[0],
    );
    expect(links.get("old-tablet")).toBeNull();
    expect(links.get("target-tablet")).toBe("driver-1");
    expect(prisma.device.updateMany).not.toHaveBeenCalled();
    expect(prisma.device.update).not.toHaveBeenCalled();
  });

  it("uses only the hardware predicate for non-UUID tablet IDs", async () => {
    const { service, prisma } = makeHarness();
    await service.assignDevice("driver-1", "TAD-TARGET");
    expect(prisma.device.findMany).toHaveBeenCalledWith({
      where: { deviceId: "TAD-TARGET" },
      take: 2,
    });
  });

  it("rejects an ambiguous UUID device ID", async () => {
    const { service, prisma, tx, links } = makeHarness();
    const uuid = "9c783afa-605f-4688-932a-46883711ba04";
    prisma.device.findMany.mockResolvedValueOnce([
      { id: uuid, deviceId: "TAD-OTHER", driverId: null },
      {
        id: "a27af095-edb0-43e7-a9e5-466a892ad943",
        deviceId: uuid,
        driverId: null,
      },
    ]);
    await expect(service.assignDevice("driver-1", uuid)).rejects.toThrow(
      "Identificador de dispositivo ambiguo",
    );
    expect(prisma.device.findMany).toHaveBeenCalledWith({
      where: { OR: [{ id: uuid }, { deviceId: uuid }] },
      take: 2,
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(tx.device.updateMany).not.toHaveBeenCalled();
    expect(links.get("old-tablet")).toBe("driver-1");
  });

  it("rejects a blocked driver even with completed onboarding", async () => {
    const { service, prisma, tx, links } = makeHarness();
    prisma.driver.findUnique.mockResolvedValueOnce({
      id: "driver-1",
      status: "BLOQUEADO",
      onboardingStatus: "COMPLETED",
    });

    await expect(
      service.assignDevice("driver-1", "TAD-TARGET"),
    ).rejects.toThrow("Conductor bloqueado");
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(tx.device.updateMany).not.toHaveBeenCalled();
    expect(links.get("old-tablet")).toBe("driver-1");
  });

  it("rejects a driver blocked after pre-read but before the row lock", async () => {
    const { service, prisma, tx, links } = makeHarness();
    tx.driver.update.mockResolvedValueOnce({
      status: "BLOQUEADO",
      onboardingStatus: "COMPLETED",
    });

    await expect(
      service.assignDevice("driver-1", "TAD-TARGET"),
    ).rejects.toThrow("Conductor bloqueado");
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.driver.update).toHaveBeenCalledTimes(1);
    expect(tx.$queryRaw).not.toHaveBeenCalled();
    expect(tx.device.updateMany).not.toHaveBeenCalled();
    expect(tx.device.update).not.toHaveBeenCalled();
    expect(links.get("old-tablet")).toBe("driver-1");
    expect(links.get("target-tablet")).toBeNull();
  });

  it("rolls back previous binding if the target device write fails", async () => {
    const { service, prisma, tx, links, setFailTargetWrite } = makeHarness();
    setFailTargetWrite();
    await expect(
      service.assignDevice("driver-1", "TAD-TARGET"),
    ).rejects.toThrow("target device write failed");
    expect(tx.device.updateMany).toHaveBeenCalledTimes(1);
    expect(tx.device.update).toHaveBeenCalledTimes(1);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(links.get("old-tablet")).toBe("driver-1");
    expect(links.get("target-tablet")).toBeNull();
  });

  it("rejects a missing locked driver before unlinking any device", async () => {
    const { service, tx, links } = makeHarness();
    tx.$queryRaw.mockResolvedValueOnce([]);
    await expect(
      service.assignDevice("driver-1", "TAD-TARGET"),
    ).rejects.toThrow("Chofer no encontrado");
    expect(tx.device.updateMany).not.toHaveBeenCalled();
    expect(tx.device.update).not.toHaveBeenCalled();
    expect(links.get("old-tablet")).toBe("driver-1");
  });

  it("serializes concurrent admin handoffs for the same driver", async () => {
    const { service, prisma, tx, links } = makeHarness();
    links.set("second-target", null);
    prisma.device.findMany.mockImplementation(
      async ({ where }: { where: { deviceId: string } }) => {
        const id =
          where.deviceId === "TAD-SECOND" ? "second-target" : "target-tablet";
        const target = {
          id,
          deviceId: where.deviceId,
          driverId: links.get(id) ?? null,
        };
        return [target];
      },
    );

    await Promise.all([
      service.assignDevice("driver-1", "TAD-TARGET"),
      service.assignDevice("driver-1", "TAD-SECOND"),
    ]);
    const owned = [...links.values()].filter((owner) => owner === "driver-1");
    expect(owned).toHaveLength(1);
    expect(tx.$queryRaw).toHaveBeenCalledTimes(2);
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
  });

  it("unlinks devices through the same driver-row lock used by assignment", async () => {
    const { service, prisma, tx, links } = makeHarness();
    await expect(service.unlinkDevice("driver-1")).resolves.toEqual({
      count: 1,
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    const [sql, id] = tx.$queryRaw.mock.calls[0];
    expect(sql.join("?")).toContain("FOR NO KEY UPDATE");
    expect(id).toBe("driver-1");
    expect(tx.device.updateMany).toHaveBeenCalledWith({
      where: { driverId: "driver-1" },
      data: { driverId: null },
    });
    expect(prisma.device.updateMany).not.toHaveBeenCalled();
    expect(links.get("old-tablet")).toBeNull();
  });

  it("keeps unlink's existing count-zero contract for a missing driver", async () => {
    const { service, tx, links } = makeHarness();
    tx.$queryRaw.mockResolvedValueOnce([]);
    await expect(service.unlinkDevice("missing-driver")).resolves.toEqual({
      count: 0,
    });
    expect(tx.device.updateMany).not.toHaveBeenCalled();
    expect(links.get("old-tablet")).toBe("driver-1");
  });

  it("serializes unlink behind an in-flight admin assignment for the same driver", async () => {
    const { service, prisma, tx, links } = makeHarness();
    const originalUpdateMany = tx.device.updateMany.getMockImplementation();
    if (!originalUpdateMany) throw new Error("missing fixture implementation");
    let entered!: () => void;
    let resume!: () => void;
    const enteredFirstWrite = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const releaseFirstWrite = new Promise<void>((resolve) => {
      resume = resolve;
    });

    tx.device.updateMany.mockImplementationOnce(async (args) => {
      entered();
      await releaseFirstWrite;
      return originalUpdateMany(args);
    });

    // Assignment has already acquired the row lock, but has not completed
    // unlink+target-binding. Unlink must wait on that same row.
    const assignment = service.assignDevice("driver-1", "TAD-TARGET");
    await enteredFirstWrite;
    const unlink = service.unlinkDevice("driver-1");
    await Promise.resolve();
    await Promise.resolve();
    expect(tx.device.updateMany).toHaveBeenCalledTimes(1);
    expect(prisma.device.updateMany).not.toHaveBeenCalled();

    resume();
    await expect(assignment).resolves.toMatchObject({
      id: "target-tablet",
      driverId: "driver-1",
    });
    await expect(unlink).resolves.toEqual({ count: 1 });

    expect(tx.$queryRaw).toHaveBeenCalledTimes(2);
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
    expect(
      [...links.values()].filter((owner) => owner === "driver-1"),
    ).toHaveLength(0);
  });

  it("does not unlink a driver when the target device does not exist", async () => {
    const { service, prisma, links } = makeHarness();
    prisma.device.findMany.mockResolvedValueOnce([]);
    await expect(service.assignDevice("driver-1", "MISSING")).rejects.toThrow(
      "Dispositivo no encontrado",
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(links.get("old-tablet")).toBe("driver-1");
  });

  it("rolls back the old binding if the target owner changed after pre-read", async () => {
    const { service, tx, links, setTargetOwnerBeforeTx } = makeHarness();
    setTargetOwnerBeforeTx("driver-2");
    await expect(
      service.assignDevice("driver-1", "TAD-TARGET"),
    ).rejects.toThrow("target ownership changed");
    expect(tx.device.update).toHaveBeenCalledWith({
      where: { id: "target-tablet", driverId: null },
      data: { driverId: "driver-1" },
    });
    expect(links.get("old-tablet")).toBe("driver-1");
    expect(links.get("target-tablet")).toBe("driver-2");
  });

  it("keeps the target linked during a repeated assignment", async () => {
    const { service, prisma, links } = makeHarness();
    links.set("target-tablet", "driver-1");
    prisma.device.findMany.mockResolvedValueOnce([
      {
        id: "target-tablet",
        deviceId: "TAD-TARGET",
        driverId: "driver-1",
      },
    ]);
    await expect(
      service.assignDevice("driver-1", "TAD-TARGET"),
    ).resolves.toEqual({ id: "target-tablet", driverId: "driver-1" });
    expect(links.get("old-tablet")).toBeNull();
    expect(links.get("target-tablet")).toBe("driver-1");
  });
});
