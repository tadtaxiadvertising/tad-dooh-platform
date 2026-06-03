// @ts-nocheck
'use client';

import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '../../styles/map-effects.css';
import { TwinNode } from './useDigitalTwinEngine';

const DR_CENTER = { lat: 18.4861, lng: -69.9312 };

function NodeRenderer() {
  const map = useMap();
  const layersRef = useRef<Record<string, { marker: L.Marker, trail: L.Polyline }>>({});

  useEffect(() => {
    const handleTick = (e: Event) => {
      const customEvent = e as CustomEvent;
      const nodes: TwinNode[] = customEvent.detail.nodes;
      
      const currentIds = new Set(nodes.map(n => n.id));
      
      // Cleanup removed nodes
      Object.keys(layersRef.current).forEach(id => {
        if (!currentIds.has(id)) {
          map.removeLayer(layersRef.current[id].marker);
          map.removeLayer(layersRef.current[id].trail);
          delete layersRef.current[id];
        }
      });

      // Update nodes
      nodes.forEach(node => {
        let items = layersRef.current[node.id];
        const isDebtor = node.status === 'debtor';
        
        const cssClass = isDebtor ? 'marker-blink-debtor' : 'marker-glow-online';
        const trailColor = isDebtor ? '#ef4444' : '#eab308'; // Red for debtor, TAD Yellow for online

        // Dynamic SVG Icon rotating with heading
        const svgHtml = `
          <div class="relative w-5 h-8 rounded-sm ${cssClass} flex items-center justify-center transition-transform duration-100 ease-linear shadow-xl" style="transform: rotate(${node.heading}deg);">
            <div class="w-full h-[25%] bg-white/40 absolute top-[1px] rounded-[1px]"></div>
            ${isDebtor ? '<div class="absolute w-12 h-12 border border-red-500/70 rounded-full animate-ping pointer-events-none"></div>' : ''}
          </div>
        `;

        const icon = L.divIcon({
          html: svgHtml,
          className: 'bg-transparent border-none',
          iconSize: [20, 32],
          iconAnchor: [10, 16], // Center of the vehicle
        });

        if (!items) {
          const marker = L.marker([node.lat, node.lng], { icon }).addTo(map);
          
          // Motion trail
          const trail = L.polyline(node.history, { 
            color: trailColor, 
            weight: 3, 
            opacity: 0.5,
            lineCap: 'round',
            lineJoin: 'round',
            className: 'transition-all duration-300 pointer-events-none'
          }).addTo(map);
          
          layersRef.current[node.id] = { marker, trail };
        } else {
          items.marker.setLatLng([node.lat, node.lng]);
          items.marker.setIcon(icon);
          items.trail.setLatLngs(node.history);
          items.trail.setStyle({ color: trailColor });
        }
      });
    };

    window.addEventListener('digital-twin-tick', handleTick);
    
    return () => {
      window.removeEventListener('digital-twin-tick', handleTick);
      // Cleanup all layers on unmount
      Object.values(layersRef.current).forEach(({marker, trail}) => {
        map.removeLayer(marker);
        map.removeLayer(trail);
      });
      layersRef.current = {};
    };
  }, [map]);

  return null;
}

export default function MapView() {
  return (
    <MapContainer 
      center={[DR_CENTER.lat, DR_CENTER.lng]} 
      zoom={14} 
      zoomControl={false}
      className="w-full h-full absolute inset-0 z-0 bg-[#0e0e0e]"
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
      />
      <NodeRenderer />
    </MapContainer>
  );
}
