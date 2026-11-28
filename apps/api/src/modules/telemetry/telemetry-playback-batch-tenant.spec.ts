import { TelemetryController } from "./telemetry.controller";
import { TelemetryService } from "./telemetry.service";

describe("Telemetry playback PoP — device and event-type isolation", () => {
  const validateDevice = jest.fn();
  const validateTabletKey = jest.fn();
  const validateVideo = jest.fn();
  const checkPlaybackRateLimit = jest.fn();
  const recordPlaybackBatch = jest.fn();
  const recordPlayback = jest.fn();

  const makeController = () =>
    new TelemetryController(
      {
        validateDevice,
        validateTabletKey,
        validateVideo,
        checkPlaybackRateLimit,
        recordPlaybackBatch,
        recordPlayback,
      } as unknown as TelemetryService,
      {} as never,
    );

  const owner = {
    deviceId: "OWNER-TABLET",
    videoId: "VIDEO-1",
    eventType: "END" as const,
  };
  const foreign = {
    deviceId: "OTHER-TABLET",
    videoId: "VIDEO-1",
    eventType: "END" as const,
  };

  beforeEach(() => {
    jest.resetAllMocks();
    validateDevice.mockResolvedValue(true);
    validateTabletKey.mockResolvedValue(true);
    validateVideo.mockResolvedValue(true);
    checkPlaybackRateLimit.mockResolvedValue(true);
    recordPlaybackBatch.mockResolvedValue({ processed: 2, rejected: 0 });
  });

  it("rejects a mixed-device batch before authentication lookups, rate limits or writes", async () => {
    await expect(
      makeController().recordPlaybackBatch([owner, foreign], "valid-key"),
    ).resolves.toMatchObject({ success: false, reason: "DEVICE_MISMATCH" });

    expect(validateDevice).not.toHaveBeenCalled();
    expect(validateTabletKey).not.toHaveBeenCalled();
    expect(validateVideo).not.toHaveBeenCalled();
    expect(checkPlaybackRateLimit).not.toHaveBeenCalled();
    expect(recordPlaybackBatch).not.toHaveBeenCalled();
  });

  it("rejects a forged runtime play_confirm eventType in a batch", async () => {
    await expect(
      makeController().recordPlaybackBatch(
        [owner, { ...owner, eventType: "play_confirm" } as never],
        "valid-key",
      ),
    ).resolves.toMatchObject({ success: false, reason: "EVENT_TYPE_INVALID" });
    expect(recordPlaybackBatch).not.toHaveBeenCalled();
    expect(validateTabletKey).not.toHaveBeenCalled();
  });

  it("rejects a forged runtime play_confirm on single-event playback", async () => {
    await expect(
      makeController().recordPlayback(
        { ...owner, eventType: "play_confirm" } as never,
        "valid-key",
      ),
    ).resolves.toMatchObject({ success: false, reason: "EVENT_TYPE_INVALID" });
    expect(recordPlayback).not.toHaveBeenCalled();
    expect(validateDevice).not.toHaveBeenCalled();
  });

  it("rejects malformed runtime batches instead of throwing", async () => {
    await expect(
      makeController().recordPlaybackBatch(
        { deviceId: owner.deviceId } as never,
        "valid-key",
      ),
    ).resolves.toMatchObject({ success: false, reason: "EMPTY_PAYLOAD" });
    await expect(
      makeController().recordPlaybackBatch([owner, null] as never, "valid-key"),
    ).resolves.toMatchObject({ success: false, reason: "DEVICE_MISMATCH" });
    expect(recordPlaybackBatch).not.toHaveBeenCalled();
  });

  it("still accepts a valid, single-device offline batch after key and media checks", async () => {
    const payload = [owner, { ...owner, eventType: "START" as const }];
    await expect(
      makeController().recordPlaybackBatch(payload, "valid-key"),
    ).resolves.toEqual({ success: true, processed: 2, rejected: 0 });
    expect(validateDevice).toHaveBeenCalledWith(owner.deviceId);
    expect(validateTabletKey).toHaveBeenCalledWith(owner.deviceId, "valid-key");
    expect(validateVideo).toHaveBeenCalledWith(owner.videoId);
    expect(checkPlaybackRateLimit).toHaveBeenCalledWith(owner.deviceId, 2);
    expect(recordPlaybackBatch).toHaveBeenCalledWith(payload);
  });

  it("rejects a single-event PoP when async quota resolves false", async () => {
    checkPlaybackRateLimit.mockResolvedValueOnce(false);
    await expect(
      makeController().recordPlayback(owner, "valid-key"),
    ).resolves.toMatchObject({ success: false, reason: "RATE_LIMITED" });
    expect(checkPlaybackRateLimit).toHaveBeenCalledWith(owner.deviceId);
    expect(validateDevice).not.toHaveBeenCalled();
    expect(recordPlayback).not.toHaveBeenCalled();
  });

  it("rejects a full offline PoP batch when async quota resolves false", async () => {
    checkPlaybackRateLimit.mockResolvedValueOnce(false);
    const payload = [owner, { ...owner, eventType: "START" as const }];
    await expect(
      makeController().recordPlaybackBatch(payload, "valid-key"),
    ).resolves.toMatchObject({ success: false, reason: "RATE_LIMITED" });
    expect(checkPlaybackRateLimit).toHaveBeenCalledWith(owner.deviceId, 2);
    expect(recordPlaybackBatch).not.toHaveBeenCalled();
  });

  it("rejects malformed single-event timestamps before a verified write", async () => {
    await expect(
      makeController().recordPlayback(
        { ...owner, clientTimestamp: "not-a-date" },
        "valid-key",
      ),
    ).resolves.toMatchObject({ success: false, reason: "TIMESTAMP_INVALID" });
    expect(recordPlayback).not.toHaveBeenCalled();
  });

  it("rejects malformed batch timestamps before any verified writes", async () => {
    await expect(
      makeController().recordPlaybackBatch(
        [owner, { ...owner, clientTimestamp: "not-a-date" }],
        "valid-key",
      ),
    ).resolves.toMatchObject({ success: false, reason: "TIMESTAMP_INVALID" });
    expect(recordPlaybackBatch).not.toHaveBeenCalled();
  });

  it("fails closed on invalid device key", async () => {
    validateTabletKey.mockResolvedValueOnce(false);
    await expect(
      makeController().recordPlaybackBatch([owner], "bad-key"),
    ).resolves.toMatchObject({ success: false, reason: "TABLET_KEY_INVALID" });
    expect(recordPlaybackBatch).not.toHaveBeenCalled();
  });
});
