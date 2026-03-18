import { useState, useEffect, useCallback } from 'react';
import { getDeviceCampaigns, removeCampaignFromDevice } from '../services/api';

export default function DeviceCampaignsPanel({ deviceId }: { deviceId: string }) {
  const [campaigns, setCampaigns] = useState<{ id: string; name: string; advertiser: string; assigned_at: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCampaigns = useCallback(async () => {
    try {
      const data = await getDeviceCampaigns(deviceId);
      setCampaigns(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [deviceId]);

  useEffect(() => {
    if (deviceId) {
      fetchCampaigns();
    }
  }, [deviceId, fetchCampaigns]);

  const removeCampaign = async (campaignId: string) => {
    if(!confirm('¿Seguro que deseas remover este anuncio de este taxi?')) return;
    
    try {
      await removeCampaignFromDevice(deviceId, campaignId);
      // Actualizamos el estado local para quitarlo de la lista
      setCampaigns(campaigns.filter(c => c.id !== campaignId));
    } catch (e) {
      console.error(e);
      alert('Error al remover el anuncio');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center p-8 bg-zinc-900/30 border border-white/5 rounded-2xl animate-pulse">
      <div className="text-zinc-600 font-black text-[10px] uppercase tracking-widest">Cargando inventario...</div>
    </div>
  );

  return (
    <div className="bg-zinc-950/50 border border-white/5 p-6 rounded-2xl backdrop-blur-md">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-tad-yellow font-black text-xs uppercase tracking-[0.2em] mb-1">Inventario Asignado</h3>
          <p className="text-[10px] text-zinc-600 font-bold uppercase">{campaigns.length} / 15 SLOTS OCUPADOS</p>
        </div>
        <div className="h-1 flex-1 mx-6 bg-zinc-900 rounded-full overflow-hidden">
          <div className="h-full bg-tad-yellow transition-all duration-1000 progress-bar" />
        </div>
        <style jsx>{`
          .progress-bar {
            width: ${(campaigns.length / 15) * 100}%;
          }
        `}</style>
      </div>

      {campaigns.length === 0 ? (
        <div className="py-8 text-center bg-black/40 rounded-xl border border-dashed border-white/5">
          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Este taxi no tiene campañas asignadas.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {campaigns.map(c => (
            <div key={c.id} className="group flex justify-between items-center bg-black/40 hover:bg-zinc-900/40 p-4 rounded-xl border border-white/5 transition-all">
              <div className="min-w-0 flex-1 pr-4">
                <span className="text-white block font-black text-[11px] uppercase tracking-tight truncate">{c.name || 'Campaña sin nombre'}</span>
                <div className="flex items-center gap-3 mt-1">
                   <span className="text-[10px] text-tad-yellow font-black uppercase tracking-tight">{c.advertiser}</span>
                   <span className="text-zinc-700 text-[10px] font-mono">ASIGNADO: {new Date(c.assigned_at).toLocaleDateString()}</span>
                </div>
              </div>
              <button 
                onClick={() => removeCampaign(c.id)}
                className="opacity-0 group-hover:opacity-100 flex items-center justify-center bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest border border-red-500/20 transition-all active:scale-95"
              >
                Remover
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
