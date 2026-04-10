import React, { useState, useEffect } from 'react';
import { AdvertiserLayout } from '../../components/layout/AdvertiserLayout';
import { MetricsGrid } from '../../components/bi/MetricsGrid';
import { ScreenUpsellCalculator } from '../../components/bi/ScreenUpsellCalculator';
import { BillingPortal } from '../../components/bi/BillingPortal';
import { 
  ShieldCheck, 
  Zap, 
} from 'lucide-react';

export default function AdvertiserDashboard() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <AdvertiserLayout title="Advertiser BI v6.0" subtitle="Intelligence Dashboard">
      {/* Hero Section */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-[#FFD700] mb-2">
            <ShieldCheck size={18} />
            <span className="text-xs font-black uppercase tracking-[0.2em]">Military Grade Analytics</span>
          </div>
          <h1 className="text-5xl font-black tracking-tighter text-white uppercase italic">
            Advertiser <span className="text-[#FFD700]">BI</span>
          </h1>
          <p className="text-[#F4F4F5]/60 max-w-md mt-2">
            Panel de control avanzado para el monitoreo de campañas DOOH y gestión de inventario en tiempo real.
          </p>
        </div>
        
        <div className="flex gap-4">
          <div className="bg-[#18181B] p-4 rounded-2xl border border-[#F4F4F5]/5 flex flex-col items-center">
            <span className="text-[10px] font-bold text-[#F4F4F5]/40 uppercase tracking-widest mb-1">Status</span>
            <span className="text-sm font-black text-white">SECURE_NODE</span>
          </div>
          <div className="bg-[#18181B] p-4 rounded-2xl border border-[#F4F4F5]/5 flex flex-col items-center">
            <span className="text-[10px] font-bold text-[#F4F4F5]/40 uppercase tracking-widest mb-1">Latency</span>
            <span className="text-sm font-black text-[#FFD700]">14ms</span>
          </div>
        </div>
      </section>

      {/* Module 4: Marketing Insights */}
      <section id="insights">
        <MetricsGrid />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Module 2: Expansion of Inventory */}
        <div className="lg:col-span-2">
          <ScreenUpsellCalculator />
          
          <div className="mt-6 p-6 bg-gradient-to-br from-[#18181B] to-[#09090B] rounded-2xl border border-[#F4F4F5]/5">
            <div className="flex items-center gap-3 mb-4">
              <Zap className="text-[#FFD700]" size={20} />
              <h4 className="font-bold text-white uppercase text-sm tracking-wider">Despliegue Instantáneo</h4>
            </div>
            <p className="text-xs text-[#F4F4F5]/50 leading-relaxed italic">
              "Nuestro motor de sincronización garantiza que cualquier expansión de pantallas se refleje en su inventario activo en menos de 5 minutos una vez aprobado el pago."
            </p>
          </div>
        </div>

        {/* Module 3: Billing & Finance */}
        <div className="lg:col-span-3">
          <BillingPortal />
          
          <div className="mt-8 grid grid-cols-2 gap-4">
            <div className="p-4 bg-[#18181B]/40 rounded-xl border border-[#F4F4F5]/5">
              <span className="text-[10px] font-bold text-[#F4F4F5]/40 uppercase block mb-1">Último Pago</span>
              <span className="text-sm font-bold text-white">Marzo 15, 2026</span>
            </div>
            <div className="p-4 bg-[#18181B]/40 rounded-xl border border-[#F4F4F5]/5">
              <span className="text-[10px] font-bold text-[#F4F4F5]/40 uppercase block mb-1">Referencia Fiscal</span>
              <span className="text-sm font-bold text-white truncate">TAD-RNC-00123</span>
            </div>
          </div>
        </div>
      </div>
    </AdvertiserLayout>
  );
}
