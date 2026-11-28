import { AnalyticsService } from "../analytics/analytics.service";
import { BiService } from "../bi/bi.service";
import { MonitoringService } from "../monitoring/monitoring.service";
import { SimulationService } from "../simulation/simulation.service";
import { DeviceAdminController } from "./device-admin.controller";

const uuid = "00000000-0000-4000-8000-000000000001";
const hardwareId = "GPS-HARDWARE-FIXTURE";
const driverId = "00000000-0000-4000-8000-000000000002";
const device = { id: uuid, deviceId: hardwareId, driverId };

describe("GPS device identity storage boundary", () => {
  it("stores the resolved UUID for monitoring batches and ignores caller driver identity", async () => {
    const stored: Array<{ deviceId: string; driverId: string }> = [];
    const prisma = {
      device: {
        findUnique: jest.fn().mockResolvedValue(device),
        update: jest.fn().mockResolvedValue(device),
      },
      driverLocation: {
        createMany: jest.fn(async ({ data }) => {
          stored.push(...data);
          return { count: data.length };
        }),
      },
    };
    const service = new MonitoringService(
      prisma as never,
      {} as never,
      {} as never,
    );
    const result = await service.processGpsBatch({
      deviceId: hardwareId,
      driverId: "spoofed-driver",
      points: [
        {
          latitude: 19.45,
          longitude: -70.69,
          speed: 12,
          timestamp: "2026-11-25T00:00:00Z",
        },
      ],
    } as never);
    expect(result.status).toBe("success");
    expect(stored).toEqual([
      expect.objectContaining({ deviceId: uuid, driverId }),
    ]);
    expect(prisma.device.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { deviceId: hardwareId },
      }),
    );
  });

  it("stores the selected device UUID for mobile GPS while keeping the hardware lookup", async () => {
    const stored: Array<{ deviceId: string }> = [];
    const prisma = {
      device: {
        findUnique: jest.fn(async ({ where, select }) => {
          expect(where).toEqual({ deviceId: hardwareId });
          return Object.fromEntries(
            Object.keys(select).map((key) => [
              key,
              device[key as keyof typeof device],
            ]),
          );
        }),
        update: jest.fn().mockResolvedValue(device),
      },
      driverLocation: {
        create: jest.fn(async ({ data }) => {
          stored.push(data);
          return data;
        }),
      },
    };
    const service = new AnalyticsService(prisma as never, {} as never);
    await expect(
      service.updateDeviceLocationFromMobile({
        deviceId: hardwareId,
        lat: 19.45,
        lng: -70.69,
      }),
    ).resolves.toEqual(device);
    expect(stored).toEqual([
      expect.objectContaining({ deviceId: uuid, driverId }),
    ]);
  });

  it("returns a taxi trail through the internal UUID relationship without changing its public hardware ID", async () => {
    const trail = [{ deviceId: uuid, latitude: 19.45, longitude: -70.69 }];
    const prisma = {
      device: { findUnique: jest.fn().mockResolvedValue(device) },
      deviceHeartbeat: { findMany: jest.fn().mockResolvedValue([]) },
      driverLocation: {
        findMany: jest.fn(async ({ where }) =>
          where.deviceId === uuid || where.device?.deviceId === hardwareId
            ? trail
            : [],
        ),
      },
      payrollPayment: { findFirst: jest.fn().mockResolvedValue(null) },
      subscription: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const response = await new BiService(prisma as never).getTaxiDrillDown(
      hardwareId,
    );
    expect(response.device.deviceId).toBe(hardwareId);
    expect(response.gps.lastKnownLocations).toEqual(trail);
  });

  it("uses the UUID returned by nested device creation for simulated GPS", async () => {
    const stored: Array<{ deviceId: string }> = [];
    const prisma = {
      driver: {
        create: jest.fn(async ({ include }) => ({
          id: driverId,
          ...(include?.devices ? { devices: [{ id: uuid }] } : {}),
        })),
      },
      driverLocation: {
        createMany: jest.fn(async ({ data }) => {
          stored.push(...data);
          return { count: data.length };
        }),
      },
    };
    const service = new SimulationService(prisma as never);
    jest.spyOn(service, "clearTestData").mockResolvedValue(undefined);
    await service.loadScenario({
      name: "fixture",
      activeNodes: 1,
      centerLat: 19.45,
      centerLng: -70.69,
      radiusKm: 1,
      anomalyRate: 0,
      minSpeed: 1,
      maxSpeed: 2,
    } as never);
    await service.handleSimulationTick();
    expect(stored).toEqual([
      expect.objectContaining({ deviceId: uuid, driverId, isSimulated: true }),
    ]);
  });

  it("deletes only the resolved UUID's GPS rows inside the existing admin transaction", async () => {
    const rows = [
      { deviceId: uuid },
      { deviceId: "00000000-0000-4000-8000-000000000003" },
    ];
    const tx: Record<string, { deleteMany?: jest.Mock; delete?: jest.Mock }> =
      Object.fromEntries(
        [
          "analyticsEvent",
          "campaignMetric",
          "playbackEvent",
          "deviceHeartbeat",
          "playlistItem",
          "deviceCommand",
          "deviceCampaign",
          "subscription",
          "notification",
        ].map((name) => [
          name,
          { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
        ]),
      );
    tx.driverLocation = {
      deleteMany: jest.fn(async ({ where }) => {
        for (let i = rows.length - 1; i >= 0; i--)
          if (rows[i].deviceId === where.deviceId) rows.splice(i, 1);
        return { count: 1 };
      }),
    };
    tx.device = { delete: jest.fn().mockResolvedValue(device) };
    const prisma = {
      device: { findMany: jest.fn().mockResolvedValue([device]) },
      $transaction: jest.fn(async (run) => run(tx)),
    };
    const result = await new DeviceAdminController(
      prisma as never,
      {} as never,
    ).deleteDevice(hardwareId);
    expect(result.success).toBe(true);
    expect(rows).toEqual([
      { deviceId: "00000000-0000-4000-8000-000000000003" },
    ]);
    expect(tx.device.delete).toHaveBeenCalledWith({ where: { id: uuid } });
  });
});
