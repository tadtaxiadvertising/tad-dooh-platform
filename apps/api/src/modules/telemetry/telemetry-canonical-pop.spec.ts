import { TelemetryService } from "./telemetry.service";

describe("TelemetryService canonical verified Proof of Play", () => {
  const execute = jest.fn();
  const create = jest.fn();
  const makeService = () =>
    new TelemetryService({
      $executeRawUnsafe: execute,
      playbackEvent: { create },
    } as never);

  beforeEach(() => {
    jest.resetAllMocks();
    execute.mockResolvedValue(1);
  });

  it("persists validated END as the canonical verified play_confirm", async () => {
    const result = await makeService().recordPlayback({
      deviceId: "TAD-DEVICE",
      videoId: "VIDEO-1",
      eventType: "END",
      clientTimestamp: "2026-11-19T17:00:35.000Z",
      verified: true,
    });

    expect(result).toEqual({ success: true, verified: true });
    expect(execute).toHaveBeenCalledTimes(1);
    const [sql, deviceId, eventType, videoId, lat, lng, timestamp, verified] =
      execute.mock.calls[0];
    expect(sql).toContain("ON CONFLICT (device_id, video_id, timestamp)");
    expect(sql).toContain("DO UPDATE SET");
    expect(sql).toContain("EXCLUDED.event_type = 'play_confirm'");
    expect(deviceId).toBe("TAD-DEVICE");
    expect(eventType).toBe("play_confirm");
    expect(videoId).toBe("VIDEO-1");
    expect(lat).toBeNull();
    expect(lng).toBeNull();
    expect(timestamp).toEqual(new Date("2026-11-19T17:00:35.000Z"));
    expect(verified).toBe(true);
    expect(create).not.toHaveBeenCalled();
  });

  it("does not transform a START into a billable completion", async () => {
    await makeService().recordPlayback({
      deviceId: "TAD-DEVICE",
      videoId: "VIDEO-1",
      eventType: "START",
      verified: true,
    });
    expect(execute.mock.calls[0][2]).toBe("START");
  });

  it("keeps unverified END unverified even when using the canonical event type", async () => {
    await makeService().recordPlayback({
      deviceId: "TAD-DEVICE",
      videoId: "VIDEO-1",
      eventType: "END",
      verified: false,
    });
    expect(execute.mock.calls[0][2]).toBe("play_confirm");
    expect(execute.mock.calls[0][7]).toBe(false);
  });

  it("prefers END over same-minute START in one batch and acknowledges both", async () => {
    const service = makeService();
    const result = await service.recordPlaybackBatch([
      {
        deviceId: "TAD-DEVICE",
        videoId: "VIDEO-1",
        eventType: "START",
        clientTimestamp: "2026-11-19T17:00:05.000Z",
      },
      {
        deviceId: "TAD-DEVICE",
        videoId: "VIDEO-1",
        eventType: "END",
        clientTimestamp: "2026-11-19T17:00:35.000Z",
      },
    ]);

    expect(result).toEqual({ processed: 2, rejected: 0 });
    expect(execute).toHaveBeenCalledTimes(1);
    const [sql, ...params] = execute.mock.calls[0];
    expect(sql).toContain("DO UPDATE SET");
    expect(sql).toContain("playback_events.verified = false");
    // One 7-parameter canonical row, never two competing INSERT rows.
    expect(params).toHaveLength(7);
    expect(params[0]).toBe("TAD-DEVICE");
    expect(params[1]).toBe("play_confirm");
    expect(params[2]).toBe("VIDEO-1");
    expect(params[6]).toBe(true);
  });

  it("does not let a later START replace a same-minute verified END", async () => {
    const result = await makeService().recordPlaybackBatch([
      {
        deviceId: "TAD-DEVICE",
        videoId: "VIDEO-1",
        eventType: "END",
        clientTimestamp: "2026-11-19T17:00:35.000Z",
      },
      {
        deviceId: "TAD-DEVICE",
        videoId: "VIDEO-1",
        eventType: "START",
        clientTimestamp: "2026-11-19T17:00:05.000Z",
      },
    ]);
    expect(result).toEqual({ processed: 2, rejected: 0 });
    expect(execute.mock.calls[0][2]).toBe("play_confirm");
  });

  it("acknowledges already-stored duplicates after a successful idempotent statement", async () => {
    execute.mockResolvedValueOnce(0); // ON CONFLICT, no new row was needed.
    const result = await makeService().recordPlaybackBatch([
      {
        deviceId: "TAD-DEVICE",
        videoId: "VIDEO-1",
        eventType: "END",
        clientTimestamp: "2026-11-19T17:00:35.000Z",
      },
    ]);
    expect(result).toEqual({ processed: 1, rejected: 0 });
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it("preserves distinct minute slots while normalizing only completion", async () => {
    const result = await makeService().recordPlaybackBatch([
      {
        deviceId: "TAD-DEVICE",
        videoId: "VIDEO-1",
        eventType: "START",
        clientTimestamp: "2026-11-19T17:00:50.000Z",
      },
      {
        deviceId: "TAD-DEVICE",
        videoId: "VIDEO-1",
        eventType: "END",
        clientTimestamp: "2026-11-19T17:01:20.000Z",
      },
    ]);
    expect(result).toEqual({ processed: 2, rejected: 0 });
    expect(execute).toHaveBeenCalledTimes(1);
    // Two 7-parameter database rows, because the minute differs.
    expect(execute.mock.calls[0].slice(1)).toHaveLength(14);
    expect(execute.mock.calls[0][2]).toBe("START");
    expect(execute.mock.calls[0][9]).toBe("play_confirm");
  });

  it("does not send a full receipt when the SQL write fails and fallback only handles one canonical slot", async () => {
    execute.mockRejectedValueOnce(new Error("synthetic SQL error"));
    create.mockResolvedValueOnce({ id: "event-1" });
    const result = await makeService().recordPlaybackBatch([
      {
        deviceId: "TAD-DEVICE",
        videoId: "VIDEO-1",
        eventType: "START",
        clientTimestamp: "2026-11-19T17:00:05.000Z",
      },
      {
        deviceId: "TAD-DEVICE",
        videoId: "VIDEO-1",
        eventType: "END",
        clientTimestamp: "2026-11-19T17:00:35.000Z",
      },
    ]);
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({ eventType: "play_confirm" }),
    });
    expect(result.processed).toBe(1);
    // The player must retain the original 2 events until full receipt.
    expect(result.processed).not.toBe(2);
  });

  it("preserves the canonical type in the ORM fallback when raw SQL fails", async () => {
    execute.mockRejectedValueOnce(new Error("synthetic DB SQL failure"));
    create.mockResolvedValueOnce({ id: "event-1" });

    await makeService().recordPlayback({
      deviceId: "TAD-DEVICE",
      videoId: "VIDEO-1",
      eventType: "END",
      verified: true,
    });

    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventType: "play_confirm",
        verified: true,
      }),
    });
  });
});
