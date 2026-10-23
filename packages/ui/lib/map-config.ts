/**
 * CARTO Map Configuration & Tile Provider
 * Centralized map configuration for TAD DOOH Platform
 */

export const CARTO_CONFIG = {
  apiBaseUrl:
    process.env.NEXT_PUBLIC_CARTO_API_BASE_URL ||
    "https://gcp-us-east1.api.carto.com",
  apiKey:
    process.env.NEXT_PUBLIC_CARTO_API_KEY ||
    process.env.NEXT_PUBLIC_CARTO_ACCESS_TOKEN ||
    "eyJhbGciOiJIUzI1NiJ9.eyJhIjoiYWNfNnIyNDE3aDkiLCJqdGkiOiJjODA4ODc0YTRiMTFlN2FmZGMzOTIxZGI1ZDYwNTc2MyJ9.hz_I6k0AY6Rx_QjRGZS_kxH-Ptt2x6bFZ-i_M9aroW0",
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a>',
};

/**
 * Returns CARTO tile layer URL for a given theme ('dark' | 'light').
 * Supports standard CARTO raster styles with authenticated API key query parameter.
 */
export function getCartoTileUrl(theme: "dark" | "light" = "dark"): string {
  const style = theme === "dark" ? "dark_all" : "light_all";
  const key = CARTO_CONFIG.apiKey ? `?key=${CARTO_CONFIG.apiKey}` : "";
  return `https://{s}.basemaps.cartocdn.com/rastertiles/${style}/{z}/{x}/{y}{r}.png${key}`;
}

export function getCartoAttribution(): string {
  return CARTO_CONFIG.attribution;
}
