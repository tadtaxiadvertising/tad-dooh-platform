/**
 * A 2xx status is only a transport receipt. The Fleet API explicitly returns
 * { input, count } after createMany commits (count=0 on idempotent replay).
 * Keep GPS in IndexedDB unless the server acknowledges every submitted point.
 */
export async function isCompleteGpsBatchReceipt(
  response: Pick<Response, "ok" | "json">,
  expectedCount: number,
): Promise<boolean> {
  if (
    !response.ok ||
    !Number.isSafeInteger(expectedCount) ||
    expectedCount < 1
  ) {
    return false;
  }

  try {
    const receipt: unknown = await response.json();
    if (
      typeof receipt !== "object" ||
      receipt === null ||
      Array.isArray(receipt)
    ) {
      return false;
    }
    const { input, count } = receipt as Record<string, unknown>;
    return (
      typeof input === "number" &&
      Number.isSafeInteger(input) &&
      input === expectedCount &&
      typeof count === "number" &&
      Number.isSafeInteger(count) &&
      count >= 0 &&
      count <= input
    );
  } catch {
    return false;
  }
}
