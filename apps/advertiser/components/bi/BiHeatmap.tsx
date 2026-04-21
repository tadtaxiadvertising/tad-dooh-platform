import React from 'react';
import dynamic from 'next/dynamic';

// Lazy-load the actual map to avoid "window is not defined" during SSR.
// The @ alias resolves through tsconfig paths, which avoids module-not-found TS errors.
const BiHeatmapInner = dynamic(
  () => import('@/components/bi/BiHeatmapInner'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-zinc-950 rounded-2xl">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FFD700]" />
      </div>
    ),
  }
);

export const BiHeatmap = () => {
  return <BiHeatmapInner />;
};
