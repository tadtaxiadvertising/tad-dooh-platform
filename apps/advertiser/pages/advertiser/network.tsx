import React, { useState, useEffect } from 'react';
import { AdvertiserLayout } from '../../components/layout/AdvertiserLayout';
import { BiHeatmap } from '../../components/bi/BiHeatmap';
import { Map as MapIcon } from 'lucide-react';

export default function NetworkPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <AdvertiserLayout title="Red de Pantallas" subtitle="Inventario & Alcance">
      <div className="flex items-center gap-3">
        <MapIcon className="text-[#FFD700]" />
        <h1 className="text-4xl font-black tracking-tighter text-white uppercase italic">
          Red de <span className="text-[#FFD700]">Pantallas</span>
        </h1>
      </div>
      
      <div className="bg-[#18181B] p-6 rounded-2xl border border-[#F4F4F5]/5">
        <h3 className="text-lg font-bold mb-4 uppercase tracking-wider">Cobertura en Tiempo Real</h3>
        <div className="h-[500px] w-full bg-[#09090B] rounded-xl overflow-hidden">
           <BiHeatmap />
        </div>
      </div>
    </AdvertiserLayout>
  );
}
