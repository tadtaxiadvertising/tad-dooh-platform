import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

// leaflet.heat is a side-effect plugin that adds L.heatLayer
// We import it this way to ensure it only runs in the browser
if (typeof window !== 'undefined') {
  require('leaflet.heat');
}

interface HeatmapLayerProps {
  points: [number, number, number][]; // [lat, lng, intensity]
  radius?: number;
  blur?: number;
  max?: number;
  gradient?: { [key: string]: string };
}

const HeatmapLayer: React.FC<HeatmapLayerProps> = ({ 
  points, 
  radius = 18, 
  blur = 15, 
  max = 0.5,
  gradient = {
    0.2: 'rgba(250, 212, 0, 0.1)',
    0.4: 'rgba(250, 212, 0, 0.3)',
    0.6: 'rgba(250, 212, 0, 0.6)',
    0.9: 'rgba(250, 212, 0, 1)',
    1.0: '#ffffff'
  }
}) => {
  const map = useMap();

  useEffect(() => {
    if (!map || !points || points.length === 0) return;

    // @ts-ignore - heatLayer is added by the plugin
    const heatLayer = (L as any).heatLayer(points, {
      radius,
      blur,
      max,
      gradient
    });

    heatLayer.addTo(map);

    return () => {
      if (map && heatLayer) {
        map.removeLayer(heatLayer);
      }
    };
  }, [map, points, radius, blur, max, gradient]);

  return null;
};

export default HeatmapLayer;
