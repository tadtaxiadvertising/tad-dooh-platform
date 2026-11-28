import { BadRequestException } from "@nestjs/common";
import { TelemetryController } from "./telemetry.controller";
import { PLAYBACK_MAX_BATCH_SIZE, TelemetryService } from "./telemetry.service";

const sample = {
  deviceId: "TABLET-1",
  videoId: "VIDEO-1",
  eventType: "END" as const,
};

const oversized = () =>
  Array.from({ length: PLAYBACK_MAX_BATCH_SIZE + 1 }, () => ({ ...sample }));

describe("PoP batch size: fail closed before any database writes", () => {
  it("rejects an oversized controller request without touching identity or the database", async () => {
    const validateDevice = jest.fn();
    const validateTabletKey = jest.fn();
    const recordPlaybackBatch = jest.fn();
    const controller = new TelemetryController(
      {
        validateDevice,
        validateTabletKey,
        recordPlaybackBatch,
      } as unknown as TelemetryService,
      {} as never,
    );

    await expect(
      controller.recordPlaybackBatch(oversized(), "valid-key"),
    ).rejects.toThrow(BadRequestException);
    await expect(
      controller.recordPlaybackBatch(oversized(), "valid-key"),
    ).rejects.toThrow("PLAYBACK_BATCH_TOO_LARGE");
    expect(validateDevice).not.toHaveBeenCalled();
    expect(validateTabletKey).not.toHaveBeenCalled();
    expect(recordPlaybackBatch).not.toHaveBeenCalled();
  });

  it("rejects an oversized direct service call without attempting SQL or ORM inserts", async () => {
    const execute = jest.fn();
    const create = jest.fn();
    const service = new TelemetryService({
      $executeRawUnsafe: execute,
      playbackEvent: { create },
    } as never);

    await expect(service.recordPlaybackBatch(oversized())).rejects.toThrow(
      "PLAYBACK_BATCH_TOO_LARGE",
    );
    expect(execute).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it("rejects empty direct service batches before any insert", async () => {
    const execute = jest.fn();
    const service = new TelemetryService({
      $executeRawUnsafe: execute,
      playbackEvent: { create: jest.fn() },
    } as never);
    await expect(service.recordPlaybackBatch([])).rejects.toThrow(
      "EMPTY_PAYLOAD",
    );
    expect(execute).not.toHaveBeenCalled();
  });
});
