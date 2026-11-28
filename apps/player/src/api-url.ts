/**
 * Player requests append /device, /sync and /telemetry directly to API_URL.
 * The NestJS service exposes these controllers under the /api/v1 prefix.
 * A missing Vite build variable must not silently contact a retired API.
 */
export function resolvePlayerApiUrl(
  value: unknown,
  development: boolean,
): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("PLAYER_API_URL_REQUIRED");
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("PLAYER_API_URL_INVALID");
  }

  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (
    url.protocol !== "https:" &&
    !(development && local && url.protocol === "http:")
  ) {
    throw new Error("PLAYER_API_URL_INSECURE");
  }

  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname.replace(/\/+$/, "") !== "/api/v1"
  ) {
    throw new Error("PLAYER_API_URL_PATH_INVALID");
  }

  return `${url.origin}/api/v1`;
}
