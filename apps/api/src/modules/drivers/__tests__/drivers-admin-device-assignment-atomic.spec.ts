import { DriversService } from "../drivers.service";

describe("DriversService.assignDevice atomic handoff", () => {
  const makeHarness = () => {
    const links = new Map<string, string | null>([
      ["old-tablet", "driver-1"],
      ["target-tablet", null],
    ]);
    let failTargetWrite = false;
    let nextTargetOwnerBeforeTx: string | null | undefined;

    const tx = {
      driver: {
        // A driver row update is the per-driver serialization lock.
        update: jest.fn(async ({ where }: { where: { id: string }; data: { updatedAt: Date } }) =>
          ({ id: where.id }),
        ),
      },
      device: {
        updateMany: jest.fn(async ({ where, data }: {
          where: { driverId: string; id: { not: string } };
          data: { driverId: null };
        }) => {
          let count = 0;
          for (const [id, owner] of links) {
            if (owner === where.driverId && id !== where.id.not) {
              links.set(id, data.driverId);
              count++;
            }
          }
          return { count };
        }),
        update: jest.fn(async ({ where, data }: {
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
        }),
      },
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
        findFirst: jest.fn().mockResolvedValue({
          id: "target-tablet",
          deviceId: "TAD-TARGET",
          driverId: null,
        }),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      // Simulate the atomic rollback contract of a Prisma interactive
      // transaction; this fixture is not a real PostgreSQL integration test.
      $transaction: jest.fn(async (callback: (client: typeof tx) => Promise<unknown>) => {
        // An unrelated admin may change the target after the initial read.
        if (nextTargetOwnerBeforeTx !== undefined) {
          links.set("target-tablet", nextTargetOwnerBeforeTx);
        }
        const snapshot = new Map(links);
        try {
          return await callback(tx);
        } catch (error) {
          links.clear();
          for (const [id, owner] of snapshot) links.set(id, owner);
          throw error;
        }
      }),
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
      setFailTargetWrite: () => { failTargetWrite = true; },
      setTargetOwnerBeforeTx: (owner: string | null) => {
        nextTargetOwnerBeforeTx = owner;
      },
    };
  };

  it("updates previous and target device inside one transaction", async () => {
    const { service, prisma, tx, links } = makeHarness();
    await expect(service.assignDevice("driver-1", "TAD-TARGET")).resolves.toEqual({
      id: "target-tablet",
      driverId: "driver-1",
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.driver.update).toHaveBeenCalledWith({
      where: { id: "driver-1" },
      data: { updatedAt: expect.any(Date) },
    });
    expect(tx.device.updateMany).toHaveBeenCalledWith({
      where: { driverId: "driver-1", id: { not: "target-tablet" } },
      data: { driverId: null },
    });
    expect(tx.device.update).toHaveBeenCalledWith({
      where: { id: "target-tablet", driverId: null },
      data: { driverId: "driver-1" },
    });
    expect(tx.driver.update.mock.invocationCallOrder[0])
      .toBeLessThan(tx.device.updateMany.mock.invocationCallOrder[0]);
    expect(links.get("old-tablet")).toBeNull();
    expect(links.get("target-tablet")).toBe("driver-1");
    expect(prisma.device.updateMany).not.toHaveBeenCalled();
    expect(prisma.device.update).not.toHaveBeenCalled();
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

  it("does not unlink a driver when the target device does not exist", async () => {
    const { service, prisma, links } = makeHarness();
    prisma.device.findFirst.mockResolvedValueOnce(null);
    await expect(
      service.assignDevice("driver-1", "MISSING"),
    ).rejects.toThrow("Dispositivo no encontrado");
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
    prisma.device.findFirst.mockResolvedValueOnce({
      id: "target-tablet",
      deviceId: "TAD-TARGET",
      driverId: "driver-1",
    });
    await expect(service.assignDevice("driver-1", "TAD-TARGET"))
      .resolves.toEqual({ id: "target-tablet", driverId: "driver-1" });
    expect(links.get("old-tablet")).toBeNull();
    expect(links.get("target-tablet")).toBe("driver-1");
  });
});
