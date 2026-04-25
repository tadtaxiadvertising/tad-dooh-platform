import React, { useState } from 'react';
import { Monitor, Calculator, TrendingUp, Loader2 } from 'lucide-react';
import { useAuth } from '@tad/ui';
import api from "@tad/services";

export const ScreenUpsellCalculator = () => {
  const { session } = useAuth();
  const [screens, setScreens] = useState(10);
  const [loading, setLoading] = useState(false);
  
  const PRICE_PER_SCREEN = 1500;
  const ITBIS_RATE = 0.18;

  const subtotal = screens * PRICE_PER_SCREEN;
  const taxes = subtotal * ITBIS_RATE;
  const total = subtotal + taxes;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP',
    }).format(value);
  };

  const handleRequest = async () => {
    const advertiserId = session?.user?.app_metadata?.entityId || (session?.user as any)?.entityId;
    
    if (!advertiserId) {
      alert('Error: No se pudo identificar tu cuenta de anunciante.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/portal-requests', {
        advertiserId,
        type: 'SCREEN_EXPANSION',
        title: `Solicitud de expansión: ${screens} pantallas`,
        description: `El anunciante solicita añadir ${screens} nuevas pantallas a su red. Total mensual estimado: ${formatCurrency(total)}`,
        data: {
          screenCount: screens,
          monthlyTotal: total,
          unitPrice: PRICE_PER_SCREEN
        }
      });

      alert('¡Solicitud enviada con éxito! Nuestro equipo revisará tu requerimiento y se pondrá en contacto en breve.');
    } catch (error: any) {
      console.error('Error al enviar solicitud:', error);
      alert('Hubo un error al procesar tu solicitud. Por favor intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#09090B] border border-[#18181B] rounded-2xl p-6 text-[#F4F4F5] max-w-xl shadow-2xl relative overflow-hidden h-full flex flex-col justify-between">
      <div className="absolute top-0 right-0 p-32 bg-[#FFD700]/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
      
      <div>
        <div className="flex items-center gap-3 mb-6 relative z-10">
          <div className="bg-[#18181B] p-3 rounded-xl text-[#FFD700] border border-[#FFD700]/20">
            <Calculator size={24} />
          </div>
          <div>
            <h3 className="text-xl font-bold tracking-tight">Expansión de Inventario</h3>
            <p className="text-sm text-[#F4F4F5]/60">Calcula tu inversión mensual en nuevas pantallas</p>
          </div>
        </div>

        <div className="mb-8 relative z-10">
          <div className="flex justify-between items-center mb-4">
            <label className="text-sm font-medium text-[#F4F4F5]/80 flex items-center gap-2">
              <Monitor size={16} />
              Unidades a contratar
            </label>
            <div className="bg-[#18181B] px-4 py-2 rounded-lg border border-[#F4F4F5]/10 font-mono text-xl text-[#FFD700] font-bold">
              {screens} {screens === 1 ? 'taxi' : 'taxis'}
            </div>
          </div>

          <input
            type="range"
            min="1"
            max="500"
            value={screens}
            onChange={(e) => setScreens(Number(e.target.value))}
            className="w-full h-2 bg-[#18181B] rounded-lg appearance-none cursor-pointer accent-[#FFD700]"
          />
          <div className="flex justify-between text-xs text-[#F4F4F5]/50 mt-2 font-mono">
            <span>1</span>
            <span>Inversión a escala</span>
            <span>500</span>
          </div>
        </div>
      </div>

      <div className="bg-[#18181B] rounded-xl p-6 border border-[#F4F4F5]/10 relative z-10">
        <div className="flex justify-between mb-3 text-sm">
          <span className="text-[#F4F4F5]/70">Inversión Base ({screens}x RD$1,500)</span>
          <span className="font-mono">{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex justify-between mb-4 text-sm">
          <span className="text-[#F4F4F5]/70">ITBIS (18%)</span>
          <span className="font-mono text-[#F4F4F5]/80">{formatCurrency(taxes)}</span>
        </div>
        
        <div className="border-t border-[#F4F4F5]/10 pt-4 flex justify-between items-center gap-4">
          <div className="min-w-0">
            <p className="text-[10px] text-[#F4F4F5]/50 uppercase tracking-widest mb-0.5">Total Mensual</p>
            <p className="text-2xl font-black text-[#FFD700] tracking-tighter truncate">
              {formatCurrency(total)}
            </p>
          </div>
          <button 
            disabled={loading}
            onClick={handleRequest}
            className="bg-[#F4F4F5] hover:bg-white text-black font-extrabold py-2.5 px-5 rounded-lg transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50 flex-shrink-0"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : <TrendingUp size={16} />}
            <span className="text-sm">{loading ? 'Procesando...' : 'Solicitar'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
