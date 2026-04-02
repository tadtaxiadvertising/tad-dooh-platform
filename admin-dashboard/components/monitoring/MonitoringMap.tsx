'use client';

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in Leaflet + Next.js
const DefaultIcon = L.icon({
  iconUrl: '/markers/marker-icon.png',
  shadowUrl: '/markers/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

const GreenIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const RedIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface Device {
  deviceId: string;
  taxiNumber: string;
  lastLat: number | null;
  lastLng: number | null;
  isOnline: boolean;
  lastSeen: string;
}

interface MonitoringMapProps {
  devices: Device[];
}

function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center);
  }, [center, map]);
  return null;
}

export default function MonitoringMap({ devices }: MonitoringMapProps) {
  const santiagoCoords: [number, number] = [19.4517, -70.6970];

  return (
    <div className="h-full w-full rounded-xl overflow-hidden shadow-2xl border-4 border-slate-800/50 bg-slate-900">
      <MapContainer 
        center={santiagoCoords} 
        zoom={13} 
        style={{ height: '100%', width: '100%' }}
        className="z-10"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {devices.map((device) => {
          if (!device.lastLat || !device.lastLng) return null;
          
          return (
            <Marker 
              key={device.deviceId} 
              position={[device.lastLat, device.lastLng]}
              icon={device.isOnline ? GreenIcon : RedIcon}
            >
              <Popup className="custom-popup">
                <div className="p-2">
                  <h3 className="font-bold text-slate-900 underline">{device.deviceId}</h3>
                  <p className="text-sm text-slate-700">Taxi: {device.taxiNumber || '---'}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Visto: {new Date(device.lastSeen).toLocaleTimeString()}
                  </p>
                  <div className={`mt-2 text-xs font-bold ${device.isOnline ? 'text-green-600' : 'text-red-600'}`}>
                    {device.isOnline ? '● ONLINE' : '● OFFLINE'}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
