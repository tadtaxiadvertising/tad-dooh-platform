import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';
import 'leaflet/dist/leaflet.css';
import { getBiHotspots } from '../../services/api';

// Plugin component to handle the heat layer
const HeatLayer = ({ points }: { points: any[] }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || !points || points.length === 0) return;

    // @ts-ignore
    const heatLayer = L.heatLayer(points, {
      radius: 20,
      blur: 15,
      maxZoom: 17,
      gradient: {
        0.4: '#1e1b4b', // Deep indigo
        0.6: '#4338ca', // Indigo
        0.7: '#facc15', // TAD Yellow
        1.0: '#fbbf24'  // Amber
      }
    }).addTo(map);

    return () => {
      map.removeLayer(heatLayer);
    };
  }, [map, points]);

  return null;
};

export const BiHeatmap = () => {
  const [points, setPoints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPoints = async () => {
      try {
        const data = await getBiHotspots();
        setPoints(data);
      } catch (error) {
        console.error('Error fetching hotspots:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPoints();
  }, []);

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden border border-zinc-800 relative bg-zinc-950">
      {loading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tad-yellow"></div>
        </div>
      )}
      
      <MapContainer 
        center={[18.4861, -69.9312]} // Santo Domingo
        zoom={12} 
        style={{ height: '100%', width: '100%', filter: 'invert(100%) hue-rotate(180deg) brightness(0.95) contrast(0.9)' }}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <HeatLayer points={points} />
      </MapContainer>

      {/* Overlay controls */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-black/80 border border-zinc-800 px-3 py-1.5 rounded-lg backdrop-blur-md">
        <p className="text-[9px] font-black tracking-widest text-zinc-400 uppercase">Hotspots de Impacto (MTD)</p>
      </div>
    </div>
  );
};
