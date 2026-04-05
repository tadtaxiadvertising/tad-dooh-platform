import { useEffect, useState } from 'react';
import { getOfflineDevices } from '@/services/api';
import { MonitorOff } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function OfflineFleetPage() {
  const [devices, setDevices] = useState<{ device_id: string; last_seen?: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getOfflineDevices();
      setDevices(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="animate-in fade-in duration-700">
      <div className="mb-10">
        <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">
          Alertas <span className="text-tad-yellow text-shadow-glow">Críticas</span>
        </h1>
        <p className="text-gray-400 max-w-2xl">
          Detección de pantallas inactivos y fallos de señal. Estas unidades no responden actualmente y requieren intervención técnica.
        </p>
      </div>

      <div className="bg-zinc-950/50 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-rose-500/20 bg-rose-500/5 flex items-center gap-4">
          <div className="p-3 bg-rose-500/10 rounded-2xl text-rose-500 animate-pulse">
            <MonitorOff className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-white font-black uppercase tracking-tighter text-lg">Inventario Fuera de Línea</h3>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">Detección de fallo de pulso (heartbeat) de enlace</p>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-white/5">
            <thead>
              <tr className="bg-white/5">
                <th scope="col" className="px-6 py-4 text-left text-xs font-black text-zinc-500 uppercase tracking-widest">UUID Global</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-black text-zinc-500 uppercase tracking-widest">Último Rastro</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-black text-zinc-500 uppercase tracking-widest">Duración Inactividad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {devices.map((device) => (
                <tr key={device.device_id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-5 whitespace-nowrap text-xs font-mono font-bold text-white">
                    {device.device_id}
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap text-xs text-zinc-400 font-medium">
                    {device.last_seen ? new Date(device.last_seen).toLocaleString().toUpperCase() : 'SIN RASTRO DE AUT.'}
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <span className="text-xs font-black text-rose-500 uppercase tracking-widest bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20">
                      {device.last_seen ? formatDistanceToNow(new Date(device.last_seen), { addSuffix: true }).toUpperCase() : 'INACTIVIDAD INFINITA'}
                    </span>
                  </td>
                </tr>
              ))}
              {devices.length === 0 && !loading && (
                <tr>
                  <td colSpan={3} className="px-6 py-20 text-center">
                    <h3 className="text-lg font-black text-emerald-500 uppercase tracking-widest mb-2">Red Limpia</h3>
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-tight">Todos los paquetes de hardware registrados se están comunicando eficazmente.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

