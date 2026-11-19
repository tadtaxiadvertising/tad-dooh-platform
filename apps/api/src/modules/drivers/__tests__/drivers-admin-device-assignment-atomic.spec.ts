import { DriversService } from "../drivers.service";

describe("DriversService.assignDevice atomic handoff", () => {
  const makeHarness = () => {
    const links = new Map<string, string | null>([
      ["old-tablet", "driver-1"],
      ["target-tablet", null],
    ]);
    let failTargetWrite = false;

    const tx = {
      device: {
        updateMany: jest.fn(async ({ where, data }: {
          where: { driverId: string };
          data: { driverId: null };
        }) => {
          let count = 0;
          for (const [id, owner] of links) {
            if (owner === where.driverId) {
              links.set(id, data.driverId);
              count++;
            }
          }
          return { count };
        }),
        update: jest.fn(async ({ where, data }: {
          where: { id: string };
          data: { driverId: string };
        }) => {
          if (failTargetWrite) throw new Error("target device write failed");
          if (!links.has(where.id)) throw new Error("device missing");
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
        }),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      // Simulate the atomic rollback contract of a Prisma interactive
      // transaction; this fixture is not a real PostgreSQL integration test.
      $transaction: jest.fn(async (callback: (client: typeof tx) => Promise<unknown>) => {
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
    };
  };

  it("updates previous and target device inside one transaction", async () => {
    const { service, prisma, tx, links } = makeHarness();
    await expect(service.assignDevice("driver-1", "TAD-TARGET")).resolves.toEqual({
      id: "target-tablet",
      driverId: "driver-1",
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.device.updateMany).toHaveBeenCalledWith({
      where: { driverId: "driver-1" },
      data: { driverId: null },
    });
    expect(tx.device.update).toHaveBeenCalledWith({
      where: { id: "target-tablet" },
      data: { driverId: "driver-1" },
    });
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
});
