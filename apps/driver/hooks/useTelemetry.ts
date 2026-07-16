// apps/driver/hooks/useTelemetry.ts
/**
 * useTelemetry — Wrapper backward-compatible que re-exporta desde useBackgroundTelemetry
 *
 * V13: El hook canónico se consolidó como `useBackgroundTelemetry` con soporte
 * para tracking en segundo plano, debounce estricto 5-min y non-blocking batch sync.
 * Este archivo mantiene la exportación `useTelemetry` para componentes existentes
 * que importan desde esta ruta.
 */

export {
  useBackgroundTelemetry as useTelemetry,
  type ConnectionStatus,
  type TelemetryCoord,
} from './useBackgroundTelemetry';
