'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// Importación dinámica del mapa para deshabilitar SSR y evitar errores de hidratación con Leaflet.js
// que requiere acceso al objeto `window` durante su inicialización.
const DigitalTwinMap = dynamic(() => import('./DigitalTwinMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-screen bg-neutral-900 flex flex-col items-center justify-center text-yellow-500">
      <div className="relative flex items-center justify-center mb-6">
        <div className="w-16 h-16 border-4 border-yellow-500/30 rounded-full"></div>
        <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin absolute"></div>
        <div className="w-4 h-4 bg-yellow-500 rounded-full animate-pulse"></div>
      </div>
      <p className="font-mono text-sm tracking-[0.2em] uppercase text-neutral-400 animate-pulse">
        Inicializando Gemelo Digital...
      </p>
    </div>
  ),
});

export default function DigitalTwinContainer() {
  return (
    <div className="relative w-full h-full min-h-screen bg-black overflow-hidden group">
      <Suspense fallback={null}>
        <DigitalTwinMap />
      </Suspense>
    </div>
  );
}
