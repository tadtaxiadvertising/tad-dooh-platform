import React, { useEffect, useState } from 'react';
import { getFleetLocations } from "@tad/services";
import MapView from '../MapView';

const BiHeatmapInner = () => {
  const [fleetLocations, setFleetLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const locations = await getFleetLocations();
        setFleetLocations(locations || []);
      } catch (error) {
        console.error('Error fetching fleet locations:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden border border-zinc-800 relative bg-zinc-950">
      {loading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tad-yellow"></div>
        </div>
      )}
      
      {!loading && (
        <MapView 
          locations={fleetLocations}
          mode="live"
          mapTheme="dark"
        />
      )}

      {/* Overlay controls */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-black/80 border border-zinc-800 px-3 py-1.5 rounded-lg backdrop-blur-md pointer-events-none">
        <p className="text-[9px] font-black tracking-widest text-[#FFD700] uppercase">Red Operativa en Tiempo Real</p>
      </div>
    </div>
  );
};

export default BiHeatmapInner;
