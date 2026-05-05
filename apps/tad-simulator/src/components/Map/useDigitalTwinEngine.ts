import { useEffect, useRef, useState } from 'react';

export interface TwinNode {
  id: string;
  lat: number;
  lng: number;
  targetLat: number;
  targetLng: number;
  heading: number;
  status: 'online' | 'debtor';
  history: [number, number][];
}

const DR_CENTER = { lat: 18.4861, lng: -69.9312 };

const getRandomTarget = (baseLat: number, baseLng: number, radius = 0.05) => ({
  lat: baseLat + (Math.random() - 0.5) * radius,
  lng: baseLng + (Math.random() - 0.5) * radius,
});

export function useDigitalTwinEngine(volume: number, speedMultiplier: number, debtorRate: number, isLocalMode: boolean) {
  const nodesRef = useRef<TwinNode[]>([]);
  const reqRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(typeof performance !== 'undefined' ? performance.now() : 0);
  const framesRef = useRef(0);
  const lastFpsTimeRef = useRef(typeof performance !== 'undefined' ? performance.now() : 0);
  
  const [stats, setStats] = useState({ fps: 60, activeNodes: 0, debtorNodes: 0 });

  useEffect(() => {
    const currentNodes = nodesRef.current;
    if (currentNodes.length < volume) {
      const newNodes = Array.from({ length: volume - currentNodes.length }).map((_, i) => {
        const id = `tax-${Date.now()}-${i}`;
        const start = getRandomTarget(DR_CENTER.lat, DR_CENTER.lng, 0.15);
        const target = getRandomTarget(start.lat, start.lng, 0.03);
        return {
          id,
          lat: start.lat,
          lng: start.lng,
          targetLat: target.lat,
          targetLng: target.lng,
          heading: Math.random() * 360,
          status: 'online',
          history: [[start.lat, start.lng]],
        } as TwinNode;
      });
      nodesRef.current = [...currentNodes, ...newNodes];
    } else if (currentNodes.length > volume) {
      nodesRef.current = currentNodes.slice(0, volume);
    }
  }, [volume]);

  useEffect(() => {
    const update = (time: number) => {
      const dt = time - lastTimeRef.current;
      lastTimeRef.current = time;
      framesRef.current++;

      let activeCount = 0;
      let debtorCount = 0;

      const baseSpeed = 0.00001;
      const lerpSpeed = baseSpeed * speedMultiplier * dt;

      nodesRef.current.forEach(node => {
        // En Local Engine Mode simulamos la morosidad internamente. 
        // Si no fuera fallback, consumiríamos estado de una API real en otro lugar de la app.
        const randomSeed = parseInt(node.id.slice(-5), 36);
        node.status = (randomSeed % 100) < debtorRate ? 'debtor' : 'online';
        
        if (node.status === 'online') activeCount++;
        else debtorCount++;

        const dLat = node.targetLat - node.lat;
        const dLng = node.targetLng - node.lng;
        const dist = Math.sqrt(dLat * dLat + dLng * dLng);

        if (dist < 0.0001) {
          const newTarget = getRandomTarget(node.lat, node.lng, 0.02);
          node.targetLat = newTarget.lat;
          node.targetLng = newTarget.lng;
        } else {
          node.lat += dLat * lerpSpeed;
          node.lng += dLng * lerpSpeed;
        }

        const targetHeading = (Math.atan2(dLng, dLat) * 180) / Math.PI;
        node.heading = targetHeading;

        if (framesRef.current % 3 === 0) {
          node.history.push([node.lat, node.lng]);
          if (node.history.length > 8) node.history.shift();
        }
      });

      if (time - lastFpsTimeRef.current >= 1000) {
        setStats({ fps: framesRef.current, activeNodes: activeCount, debtorNodes: debtorCount });
        framesRef.current = 0;
        lastFpsTimeRef.current = time;
      }

      const event = new CustomEvent('digital-twin-tick', { detail: { nodes: nodesRef.current } });
      window.dispatchEvent(event);

      reqRef.current = requestAnimationFrame(update);
    };

    reqRef.current = requestAnimationFrame(update);
    return () => cancelAnimationFrame(reqRef.current);
  }, [speedMultiplier, debtorRate, volume, isLocalMode]);

  return stats;
}
