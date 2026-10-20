// apps/driver/components/dashboard/dashboard-utils.tsx
/**
 * Dashboard utilities — extracted from pages/driver/dashboard.tsx
 * so they can be shared between the page and the DriverShell component.
 */
import React from "react";

/** Indicador de punto pulsante */
export function PulseDot({ color }: { color: string }) {
  return (
    <span className="relative inline-flex h-2 w-2">
      <span
        className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-40"
        style={{ backgroundColor: color }}
      />
      <span
        className="relative inline-flex rounded-full h-2 w-2 shadow-[0_0_8px_rgba(255,212,0,0.5)]"
        style={{ backgroundColor: color }}
      />
    </span>
  );
}

export default PulseDot;
