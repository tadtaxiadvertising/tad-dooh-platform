function messageFrom(value: unknown): string | undefined {
  if (!value || typeof value !== "object" || !("message" in value)) return;
  if (typeof value.message === "string") return value.message || undefined;
  if (
    Array.isArray(value.message) &&
    value.message.every((part) => typeof part === "string")
  ) {
    return value.message.join(", ") || undefined;
  }
}

/** Read a human-readable error without trusting arbitrary API payloads. */
export function getErrorMessage(error: unknown, fallback = ""): string {
  if (error && typeof error === "object" && "response" in error) {
    const response = error.response;
    if (response && typeof response === "object" && "data" in response) {
      const message = messageFrom(response.data);
      if (message) return message;
    }
  }
  return messageFrom(error) || fallback;
}
