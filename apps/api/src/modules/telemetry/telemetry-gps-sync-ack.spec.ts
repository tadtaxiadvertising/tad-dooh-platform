import { TelemetryController } from "./telemetry.controller";
import {
  TelemetryService,
  TELEMETRY_GPS_BATCH_LIMIT,
} from "./telemetry.service";

describe("Telemetry GPS synchronization — bounded, atomic, acknowledged", () => {
  const driverFindUnique = jest.fn();
  const sync = jest.fn();

  const makeController = () =>
    new TelemetryController(
      { sync } as unknown as TelemetryService,
      { driver: { findUnique: driverFindUnique } } as never,
    );

  const point = {
    driverId: "driver-authorized",
    lat: 19.45,
    lng: -70.7,
    speed: 20,
  };

  beforeEach(() => {
    jest.resetAllMocks();
    driverFindUnique.mockResolvedValue({ id: point.driverId });
    sync.mockResolvedValue(undefined);
  });

  it("refuses oversized offline batches instead of silently truncating them", async () => {
    const controller = makeController();
    const huge = Array.from(
      { length: TELEMETRY_GPS_BATCH_LIMIT + 1 },
      () => point,
    );

    await expect(controller.sync(huge)).rejects.toThrow(
      "TELEMETRY_BATCH_TOO_LARGE",
    );
    expect(driverFindUnique).not.toHaveBeenCalled();
    expect(sync).not.toHaveBeenCalled();
  });

  it("rejects foreign driver IDs before database and telemetry writes", async () => {
    const controller = makeController();
    const mixed = [point, { ...point, driverId: "foreign-driver" }];

    await expect(controller.sync(mixed)).rejects.toThrow("DRIVER_MISMATCH");
    expect(driverFindUnique).not.toHaveBeenCalled();
    expect(sync).not.toHaveBeenCalled();
  });

  it("does not acknowledge GPS upload before the transaction resolves", async () => {
    let commit!: () => void;
    const inFlight = new Promise<void>((resolve) => {
      commit = resolve;
    });
    sync.mockReturnValueOnce(inFlight);
    let completed = false;
    const response = makeController()
      .sync([point])
      .then((value) => {
        completed = true;
        return value;
      });
    await Promise.resolve();
    await Promise.resolve();
    expect(completed).toBe(false);
    expect(sync).toHaveBeenCalledWith([point]);
    commit();
    await expect(response).resolves.toEqual({ success: true });
    expect(completed).toBe(true);
  });

  it("propagates persistence errors instead of returning a false positive ACK", async () => {
    sync.mockRejectedValueOnce(new Error("synthetic SQL write failure"));
    await expect(makeController().sync([point])).rejects.toThrow(
      "synthetic SQL write failure",
    );
    expect(sync).toHaveBeenCalledWith([point]);
  });

  it("refuses an unknown driver rather than inserting anonymous coordinates", async () => {
    driverFindUnique.mockResolvedValueOnce(null);
    await expect(makeController().sync([point])).rejects.toThrow(
      "DRIVER_NOT_FOUND",
    );
    expect(sync).not.toHaveBeenCalled();
  });
});

describe("TelemetryService GPS upload transaction", () => {
  const write = jest.fn();
  const transaction = jest.fn();
  const service = new TelemetryService({
    $transaction: transaction,
  } as never);

  const makePoints = (count: number) =>
    Array.from({ length: count }, (_, i) => ({
      driverId: "driver-authorized",
      lat: 19.45,
      lng: -70.7,
      speed: 15,
      timestamp: new Date(Date.UTC(2026, 10, 19, 18, 0, i)).toISOString(),
    }));

  beforeEach(() => {
    jest.resetAllMocks();
    write.mockResolvedValue(100);
    transaction.mockImplementation(async (work) =>
      work({ $executeRawUnsafe: write }),
    );
  });

  it("persists a 101-point batch in one transaction with two SQL chunks", async () => {
    await expect(service.sync(makePoints(101))).resolves.toBeUndefined();
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(write).toHaveBeenCalledTimes(2);
    const first = write.mock.calls[0];
    const last = write.mock.calls[1];
    expect(first[0]).toContain("ON CONFLICT");
    expect(first).toHaveLength(1 + 100 * 5);
    expect(last).toHaveLength(1 + 1 * 5);
  });

  it("propagates an error from the second chunk to roll back the shared transaction", async () => {
    write.mockResolvedValueOnce(100);
    write.mockRejectedValueOnce(new Error("synthetic second chunk failure"));

    await expect(service.sync(makePoints(101))).rejects.toThrow(
      "synthetic second chunk failure",
    );
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(write).toHaveBeenCalledTimes(2);
  });

  it("does not write an oversized batch even when called outside the controller", async () => {
    await expect(
      service.sync(makePoints(TELEMETRY_GPS_BATCH_LIMIT + 1)),
    ).rejects.toThrow("TELEMETRY_BATCH_TOO_LARGE");
    expect(transaction).not.toHaveBeenCalled();
    expect(write).not.toHaveBeenCalled();
  });
});
