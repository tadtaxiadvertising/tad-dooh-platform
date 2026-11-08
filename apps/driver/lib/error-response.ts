export function getErrorResponse(
  error: unknown,
): Record<string, unknown> | undefined {
  if (typeof error !== "object" || error === null || !("response" in error))
    return;
  const response = error.response;
  if (typeof response === "object" && response !== null) {
    return response as Record<string, unknown>;
  }
}
