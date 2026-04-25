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

const NUMBER_COLOR_ACTIVE  = '#eab308'; // Yellow — online
const NUMBER_COLOR_OFFLINE = '#dc2626'; // Red   — offline

const createGlassIcon = (device: Device, selected: boolean = false) => {
  const isActive = device.isOnline;
  const W = 52;
  const H = 64;
  const short = device.taxiNumber ? device.taxiNumber.replace(/^STI0/i, '').replace(/^STI/i, '').substring(0, 3) : device.deviceId.replace(/^TADSTI-?/i, '').substring(0, 3) || '?';
  const safeId = device.deviceId.replace(/[^a-zA-Z0-9]/g, '');
  
  // ── Color logic ──────────────────────────────────────────────────────────
  const numberColor = isActive ? NUMBER_COLOR_ACTIVE : NUMBER_COLOR_OFFLINE;
  const textGlow    = isActive 
    ? '0 0 10px rgba(234,179,8,0.85)' 
    : '0 0 8px rgba(220,38,38,0.7)';

  // For MonitoringMap (Standard OSM light tiles), we use a DARK car body
  const bodyGrad = { from: '#1e293b', mid: '#0f172a', to: '#0a0a0b' };
  const bodyStroke = '#374151';
  const screenFill = '#1e293b';
  const screenStrok = '#334155';
  const shineStroke = '#475569';
  const shineOpacity = '0.3';
  const glassGrad = { from: '#1e293b', to: '#020617' };

  const html = `
    <div style="position: relative; width: ${W}px; height: ${H}px; display: flex; flex-direction: column; align-items: center; justify-content: center;">
      <!-- Car SVG Container -->
      <div style="
        width: 35px;
        height: 45px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        transform: ${selected ? 'scale(1.15)' : 'scale(1)'};
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        z-index: 2;
        filter: ${selected ? `drop-shadow(0 0 8px ${numberColor}80)` : 'none'};
      ">
        <svg width="100%" height="100%" viewBox="0 0 140 180" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="ds-${safeId}" x="-30%" y="-20%" width="160%" height="150%">
              <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#000000" flood-opacity="0.35"/>
            </filter>
            <filter id="ts-${safeId}" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-color="#000000" flood-opacity="0.25"/>
            </filter>
            <linearGradient id="bg-${safeId}" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stop-color="${bodyGrad.from}"/>
              <stop offset="50%"  stop-color="${bodyGrad.mid}"/>
              <stop offset="100%" stop-color="${bodyGrad.to}"/>
            </linearGradient>
            <linearGradient id="gg-${safeId}" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%"   stop-color="${glassGrad.from}"/>
              <stop offset="100%" stop-color="${glassGrad.to}"/>
            </linearGradient>
          </defs>

          <rect x="25" y="10" width="90" height="160" rx="20" fill="url(#bg-${safeId})" stroke="${bodyStroke}" stroke-width="1" filter="url(#ds-${safeId})"/>
          <path d="M 32 60 Q 32 30 50 20" fill="none" stroke="${shineStroke}" stroke-width="2" stroke-linecap="round" opacity="${shineOpacity}"/>
          <path d="M 45 45 Q 70 38 95 45 L 96 58 Q 70 65 44 58 Z" fill="url(#gg-${safeId})"/>
          <rect x="30" y="65" width="80" height="55" rx="6" fill="${screenFill}" stroke="${screenStrok}" stroke-width="0.5"/>
          
          <text x="70" y="104" font-family="Inter, system-ui, -apple-system, sans-serif" font-size="36" font-weight="900" fill="${numberColor}" text-anchor="middle" letter-spacing="-1.5" filter="url(#ts-${safeId})" style="text-shadow: ${textGlow};">${short}</text>

          <path d="M 45 130 Q 70 123 95 130 L 96 143 Q 70 150 44 143 Z" fill="url(#gg-${safeId})"/>
          <rect x="42" y="15" width="16" height="5" rx="2" fill="${numberColor}"/>
          <rect x="82" y="15" width="16" height="5" rx="2" fill="${numberColor}"/>
          <rect x="42" y="160" width="18" height="5" rx="2" fill="#dc2626"/>
          <rect x="80" y="160" width="18" height="5" rx="2" fill="#dc2626"/>
          <path d="M 60 18 Q 70 15 80 18" fill="none" stroke="${shineStroke}" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </div>
    </div>
  `;

  return L.divIcon({
    className: '',
    html,
    iconSize: [W, H],
    iconAnchor: [W / 2, H / 2],
    popupAnchor: [0, -H / 2],
  });
};

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
              icon={createGlassIcon(device)}
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






