/**
 * Delivery policy for the IndexedDB-backed FIFO driver action queue.
 *
 * Only a successful 2xx response proves acknowledgement. Transient failures,
 * unknown outcomes and redirects must preserve the queued item and PAUSE FIFO
 * processing so a later dependent bank action cannot overtake it.
 *
 * Legacy terminal 4xx behavior is retained for compatibility until #221 adds
 * a durable dead-letter store; it is not an endorsement of dropping the data.
 */
export type OfflineQueueDisposition = "ack" | "pause";

export const classifyOfflineQueueStatus = (
  status: number,
): OfflineQueueDisposition => {
  if (status >= 200 && status < 300) return "ack";

  // Authentication, payment state, incomplete operations, conflicts and rate
  // limiting must not be treated as successful delivery.
  if (
    status === 401 ||
    status === 402 ||
    status === 408 ||
    status === 409 ||
    status === 425 ||
    status === 429
  ) {
    return "pause";
  }

  // 5xx and unrecognized/redirect statuses have uncertain outcomes.
  if (status < 400 || status >= 500) return "pause";

  // Legacy behavior for other terminal 4xx: move to a dead-letter store
  // in issue #221 instead of silently discarding.
  return "ack";
};
