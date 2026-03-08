import { useEffect, useState } from 'react';
import { getDevices } from '../../services/api';
import { RefreshCcw, Tablet, Wifi, WifiOff, Battery, HardDrive, MapPin, Gauge } from 'lucide-react';
import clsx from 'clsx';
import { formatDistanceToNow } from 'date-fns';

export default function FleetPage() {
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getDevices();
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">
            Fleet <span className="text-tad-yellow text-shadow-glow">Monitoring</span>
          </h1>
          <p className="text-gray-400 max-w-2xl">
            Real-time synchronization status of the tablet hardware network. Monitor battery health, storage, and connectivity across all active units.
          </p>
        </div>
        <button 
          onClick={loadData}
          className="group flex gap-2 items-center bg-zinc-900 hover:bg-zinc-800 text-white font-bold py-3 px-6 rounded-xl border border-white/10 transition-all active:scale-95 shadow-lg"
        >
          <RefreshCcw className={clsx("h-5 w-5 text-tad-yellow", loading && "animate-spin")} />
          Sync Fleet Data
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading && devices.length === 0 ? (
          [1,2,3,4,5,6].map(i => <div key={i} className="h-48 bg-zinc-900/40 animate-pulse rounded-2xl border border-white/5" />)
        ) : devices.map((device) => {
          const isOnline = device.status === 'online';
          const isPlaying = device.player_status === 'playing';
          
          return (
            <div key={device.device_id} className="relative bg-zinc-950 border border-white/10 rounded-2xl p-6 hover:border-tad-yellow/30 transition-all overflow-hidden group shadow-2xl">
              <div className="absolute top-0 right-0 p-4">
                <div className={clsx(
                  "w-2 h-2 rounded-full",
                  isOnline ? "bg-tad-yellow shadow-[0_0_10px_rgba(250,212,0,0.5)]" : "bg-zinc-700"
                )} />
              </div>

              <div className="flex items-start gap-4 mb-6">
                <div className="p-3 bg-zinc-900 rounded-xl text-zinc-500 group-hover:text-tad-yellow transition-colors border border-white/5">
                  <Tablet className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg leading-tight uppercase tracking-tighter">
                    {device.taxi_number || device.device_id.slice(0, 12)}
                  </h3>
                  <p className="text-[10px] text-zinc-500 font-mono mt-1">UUID: {device.device_id}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-black/40 rounded-lg p-3 border border-white/5">
                  <div className="flex items-center gap-2 text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-1">
                    <Battery className="w-3 h-3 text-tad-yellow" /> Power
                  </div>
                  <div className="text-sm font-bold text-white">
                    {device.battery_level != null ? `${device.battery_level}%` : 'N/A'}
                  </div>
                </div>
                <div className="bg-black/40 rounded-lg p-3 border border-white/5">
                  <div className="flex items-center gap-2 text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-1">
                    <HardDrive className="w-3 h-3 text-tad-yellow" /> Storage
                  </div>
                  <div className="text-sm font-bold text-white truncate">
                    {device.storage_free || 'N/A'}
                  </div>
                </div>
                <div className="bg-black/40 rounded-lg p-3 border border-white/5">
                  <div className="flex items-center gap-2 text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-1">
                    <MapPin className="w-3 h-3 text-tad-yellow" /> Zone
                  </div>
                  <div className="text-sm font-bold text-white">
                    {device.city || 'Global'}
                  </div>
                </div>
                <div className="bg-black/40 rounded-lg p-3 border border-white/5">
                  <div className="flex items-center gap-2 text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-1">
                    <Gauge className="w-3 h-3 text-tad-yellow" /> Playback
                  </div>
                  <div className={clsx(
                    "text-[10px] font-black uppercase tracking-tighter",
                    isPlaying ? "text-tad-yellow" : "text-zinc-600"
                  )}>
                    {device.player_status || 'Standby'}
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
                <div className="text-[10px] text-zinc-600 flex items-center gap-2">
                  <Wifi className="w-3 h-3" />
                  LAST SYNC: {device.last_seen ? formatDistanceToNow(new Date(device.last_seen), { addSuffix: true }).toUpperCase() : 'NEVER'}
                </div>
                <span className={clsx(
                  "text-[9px] font-black px-2 py-0.5 rounded border uppercase tracking-widest",
                  isOnline ? "bg-tad-yellow/10 text-tad-yellow border-tad-yellow/20" : "bg-zinc-800 text-zinc-500 border-white/5"
                )}>
                  {device.status}
                </span>
              </div>
            </div>
          );
        })}
        {devices.length === 0 && !loading && (
          <div className="col-span-full py-20 bg-zinc-900/30 border border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center text-center">
            <WifiOff className="w-16 h-16 text-zinc-700 mb-4" />
            <h3 className="text-xl font-bold text-gray-400">No devices connected</h3>
            <p className="text-gray-500 mt-2 max-w-sm">
              Waiting for hardware handshake. Tablets will appear here once they authorize against the API.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
