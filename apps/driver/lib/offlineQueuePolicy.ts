/**
 * Retry policy for locally queued driver actions.
 *
 * HTTP 409 cannot safely be treated as a successful acknowledgement:
 * the API may be reporting an in-progress or unknown-outcome payment.
 * Preserve that action until it can be reconciled or acknowledged.
 */
export type OfflineQueueDisposition = "ack" | "pause" | "retain";

export const classifyOfflineQueueStatus = (
  status: number,
): OfflineQueueDisposition => {
  if (status >= 200 && status < 300) return "ack";
  if (status === 401 || status === 402) return "pause";
  // Retain the item and pause FIFO processing to preserve action ordering.
  if (status === 409) return "pause";

  // Preserve previous handling of other terminal 4xx responses. A future
  // dead-letter queue should retain their payloads for user review.
  if (status >= 400 && status < 500) return "ack";
  return "retain";
};
