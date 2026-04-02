import React from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import HeatmapLayer from './HeatmapLayer';

interface AdvertiserMapProps {
  points: [number, number, number][]; // [lat, lng, intensity]
}

export default function AdvertiserMap({ points }: AdvertiserMapProps) {
  // Default bounds roughly inside Santo Domingo
  const defaultCenter: [number, number] = [18.4861, -69.9312];

  return (
    <MapContainer 
      center={defaultCenter} 
      zoom={13} 
      className="w-full h-full"
      zoomControl={false}
      attributionControl={false}
    >
      <TileLayer
        url="https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png"
      />
      {points && points.length > 0 && <HeatmapLayer points={points} />}
    </MapContainer>
  );
}
