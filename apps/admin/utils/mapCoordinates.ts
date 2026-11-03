/**
 * Normalize coordinates from mixed API payloads without accepting blank strings.
 *
 * Zero remains valid; whitespace-only, non-finite and non-scalar values do not
 * silently become (0, 0). Range checks stay at the map rendering boundary.
 */
export function parseMapCoordinate(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : NaN;
  if (typeof value !== "string") return NaN;
  const normalized = value.trim();
  if (!normalized) return NaN;
  const coordinate = Number(normalized);
  return Number.isFinite(coordinate) ? coordinate : NaN;
}
