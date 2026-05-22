// apps/tad-simulator/src/hooks/useDigitalTwinEngine.ts
import { useRef, useEffect, useState, useCallback } from 'react';

export type NodeStatus = 'online' | 'debtor';

export interface FleetNode {
  id: string;
  lat: number;
  lng: number;
  targetLat: number;
  targetLng: number;
  heading: number;
  status: NodeStatus;
  history: { lat: number; lng: number }[];
}

export interface EngineConfig {
  volume: number;
  speed: number;
  debtorRate: number; // 0 to 20
  telemetryInterval: number; // in ms
}

// DR center approx for fallback: 18.4861, -69.9312
const CENTER_LAT = 18.4861;
const CENTER_LNG = -69.9312;

// Utility to calculate heading (bearing)
const calculateBearing = (startLat: number, startLng: number, destLat: number, destLng: number) => {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;
  const startLatRad = toRad(startLat);
  const startLngRad = toRad(startLng);
  const destLatRad = toRad(destLat);
  const destLngRad = toRad(destLng);

  const y = Math.sin(destLngRad - startLngRad) * Math.cos(destLatRad);
  const x = Math.cos(startLatRad) * Math.sin(destLatRad) -
            Math.sin(startLatRad) * Math.cos(destLatRad) * Math.cos(destLngRad - startLngRad);
  const brng = toDeg(Math.atan2(y, x));
  return (brng + 360) % 360;
};

// Linear Interpolation
const lerp = (start: number, end: number, t: number) => start + (end - start) * t;

export const useDigitalTwinEngine = (initialConfig: EngineConfig) => {
  const [config, setConfig] = useState<EngineConfig>(initialConfig);
  // Using ref for massive state to avoid React re-renders on 60fps loop
  const nodesRef = useRef<Map<string, FleetNode>>(new Map());
  const animationRef = useRef<number | null>(null);

  // Core Simulation Loop (SRE 60fps LERP)
  useEffect(() => {
    let lastTime = performance.now();

    const renderLoop = (time: number) => {
      const deltaTime = time - lastTime;
      lastTime = time;

      let stateChanged = false;

      nodesRef.current.forEach(node => {
        // Apply LERP for smooth transition
        const t = Math.min((deltaTime / 1000) * config.speed * 0.5, 1);
        
        if (Math.abs(node.targetLat - node.lat) > 0.00001 || Math.abs(node.targetLng - node.lng) > 0.00001) {
           node.lat = lerp(node.lat, node.targetLat, t);
           node.lng = lerp(node.lng, node.targetLng, t);
           
           // Dynamic heading calculation based on movement vector
           node.heading = calculateBearing(node.lat, node.lng, node.targetLat, node.targetLng);
           
           // Motion Trails buffer
           if (Math.random() > 0.7) {
             node.history.push({ lat: node.lat, lng: node.lng });
             if (node.history.length > 5) node.history.shift(); // Keep last 5 points
           }
           stateChanged = true;
        }
      });

      // Dispatch custom event to the Map UI to sync transforms without triggering React renders
      if (stateChanged) {
        window.dispatchEvent(new CustomEvent('digital-twin-tick'));
      }

      animationRef.current = requestAnimationFrame(renderLoop);
    };

    animationRef.current = requestAnimationFrame(renderLoop);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [config.speed]);

  // Telemetry Batching Loop (Simulates GPS & OSRM Routing events)
  useEffect(() => {
    const telemetryLoop = setInterval(() => {
      const currentNodes = nodesRef.current;
      
      // 1. Manage Fleet Volume dynamically
      if (currentNodes.size < config.volume) {
        const nodesToAdd = config.volume - currentNodes.size;
        for (let i = 0; i < nodesToAdd; i++) {
          const id = `tax-${Math.random().toString(36).substring(2, 9)}`;
          currentNodes.set(id, {
            id,
            lat: CENTER_LAT + (Math.random() - 0.5) * 0.05,
            lng: CENTER_LNG + (Math.random() - 0.5) * 0.05,
            targetLat: CENTER_LAT + (Math.random() - 0.5) * 0.05,
            targetLng: CENTER_LNG + (Math.random() - 0.5) * 0.05,
            heading: 0,
            status: 'online',
            history: []
          });
        }
      } else if (currentNodes.size > config.volume) {
        const nodesToRemove = currentNodes.size - config.volume;
        const keys = Array.from(currentNodes.keys());
        for (let i = 0; i < nodesToRemove; i++) {
          currentNodes.delete(keys[i]);
        }
      }

      // 2. Fetch OSRM Routing / Apply Drunk Walk Fallback
      currentNodes.forEach(node => {
        // Simulated Drunk Walk (circular interpolation fallback)
        const angle = Math.random() * Math.PI * 2;
        const distance = 0.005 + (Math.random() * 0.005);
        node.targetLat += Math.cos(angle) * distance;
        node.targetLng += Math.sin(angle) * distance;
        
        // Geofencing basic bounds validation (keep them around DR)
        if (node.targetLat > 18.6) node.targetLat = 18.6;
        if (node.targetLat < 18.3) node.targetLat = 18.3;
        if (node.targetLng > -69.8) node.targetLng = -69.8;
        if (node.targetLng < -70.1) node.targetLng = -70.1;
        
        // 3. Debtor Mode Injection (HTTP 402 Simulator)
        const isDebtor = Math.random() < (config.debtorRate / 100);
        node.status = isDebtor ? 'debtor' : 'online';
      });
      
      window.dispatchEvent(new CustomEvent('digital-twin-tick'));

    }, config.telemetryInterval);

    return () => clearInterval(telemetryLoop);
  }, [config]);

  // Force re-render just to pass down updated refs on config change
  const triggerRender = useCallback(() => setConfig(c => ({...c})), []);

  return { config, setConfig, nodesRef, triggerRender };
};
