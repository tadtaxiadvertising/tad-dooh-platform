import { useEffect, useState } from 'react';
import { getDevices, getCampaigns, getMedia } from '../services/api';
import { Activity, CarFront, Megaphone, CloudUpload, Zap, TrendingUp, ShieldCheck, Globe } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

export default function Home() {
  const [stats, setStats] = useState({
    devices: 0,
    online: 0,
    campaigns: 0,
    media: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setError(null);
    Promise.all([getDevices(), getCampaigns(), getMedia()])
      .then(([devices, campaigns, media]) => {
        setStats({
          devices: Array.isArray(devices) ? devices.length : 0,
          online: Array.isArray(devices) ? devices.filter((d: any) => d.status === 'online').length : 0,
          campaigns: Array.isArray(campaigns) ? campaigns.length : 0,
          media: Array.isArray(media) ? media.length : 0
        });
      })
      .catch(err => {
        console.error("Dashboard Load Error:", err);
        setError("Failed to synchronize with central node. Verify uplink.");
      })
      .finally(() => setLoading(false));
  }, []);

  const mockChartData = [
    { name: '00:00', val: 400 },
    { name: '04:00', val: 300 },
    { name: '08:00', val: 900 },
    { name: '12:00', val: 1200 },
    { name: '16:00', val: 1500 },
    { name: '20:00', val: 1100 },
    { name: '23:59', val: 600 },
  ];

  return (
    <div className="animate-in fade-in duration-1000">
      <div className="mb-10">
        <h1 className="text-4xl font-black tracking-tighter text-white uppercase italic">
          System <span className="text-tad-yellow text-shadow-glow">Intelligence</span>
        </h1>
        <p className="text-zinc-500 font-bold uppercase tracking-[0.2em] text-[10px] mt-1">Global Node Authorization & Signal Distribution</p>
      </div>

      {error && (
        <div className="mb-10 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-4 text-red-500 animate-pulse">
           <Activity className="w-5 h-5 flex-shrink-0" />
           <div>
              <p className="text-[10px] font-black uppercase tracking-widest">Signal Error</p>
              <p className="text-xs font-bold leading-tight">{error}</p>
           </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <StatCard 
          icon={<CarFront className="w-5 h-5" />} 
          label="Active Fleet" 
          value={stats.devices} 
          sub={`${stats.online} Units Online`}
          color="yellow"
        />
        <StatCard 
          icon={<Megaphone className="w-5 h-5" />} 
          label="Active Streams" 
          value={stats.campaigns} 
          sub="Production Ready"
          color="gray"
        />
        <StatCard 
          icon={<CloudUpload className="w-5 h-5" />} 
          label="Object Blobs" 
          value={stats.media} 
          sub="Cloud Optimized"
          color="yellow"
        />
        <StatCard 
          icon={<Activity className="w-5 h-5" />} 
          label="Sys Health" 
          value="100%" 
          sub="No Packet Loss"
          color="gray"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-zinc-950/50 backdrop-blur-xl border border-white/5 p-8 rounded-3xl shadow-2xl">
           <div className="flex items-center justify-between mb-8">
              <div>
              <h3 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-tad-yellow" /> Network Throughput
              </h3>
              <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mt-1">Cumulative impressions across 24h cycle</p>
            </div>
          </div>
          <div className="h-[300px] w-full" style={{ minHeight: '300px' }}>
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={200}>
                <AreaChart data={mockChartData}>
                  <defs>
                    <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#fad400" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#fad400" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="name" stroke="#52525b" fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} />
                  <YAxis stroke="#52525b" fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#000', border: '1px solid #27272a', borderRadius: '12px', fontSize: '10px', fontWeight: 'bold' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Area type="monotone" dataKey="val" stroke="#fad400" strokeWidth={4} fillOpacity={1} fill="url(#colorVal)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-800 font-black italic">
                SYNCHRONIZING DATASTREAM...
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
           <div className="bg-zinc-950/50 backdrop-blur-xl border border-white/5 p-8 rounded-3xl shadow-2xl relative overflow-hidden">
              <div className="relative z-10">
                 <ShieldCheck className="w-12 h-12 text-tad-yellow mb-4" />
                 <h4 className="text-xl font-black text-white uppercase tracking-tighter">Secure Protocol</h4>
                 <p className="text-sm text-zinc-500 mt-2 font-medium">All tablet communications are encrypted via SSL/OIDC handshake 4.0.</p>
                 <div className="mt-6 flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-tad-yellow animate-ping" />
                    <span className="text-[10px] font-black text-tad-yellow uppercase tracking-[0.2em]">Active Protection</span>
                 </div>
              </div>
              <div className="absolute -right-4 -bottom-4 opacity-5">
                 <Globe className="w-40 h-40 text-white" />
              </div>
           </div>

           <div className="bg-zinc-900 border border-white/5 p-8 rounded-3xl shadow-2xl">
              <h4 className="text-lg font-black text-white uppercase tracking-tighter mb-2">Expansion Pack</h4>
              <p className="text-xs text-zinc-500 font-medium">Ready to deploy 2,000 additional nodes in Santo Domingo sector.</p>
              <button className="mt-6 bg-tad-yellow text-black text-[10px] font-black uppercase tracking-[0.2em] px-6 py-3 rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all">
                 Scan Local Subnets
              </button>
           </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub, color }: any) {
  const colorMap: any = {
    yellow: "text-tad-yellow bg-tad-yellow/10 border-tad-yellow/20 shadow-tad-yellow/20",
    gray: "text-zinc-400 bg-zinc-400/10 border-zinc-400/20 shadow-zinc-400/20"
  };

  return (
    <div className="bg-zinc-950/50 backdrop-blur-xl border border-white/5 p-6 rounded-3xl shadow-2xl group hover:border-white/10 transition-all">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-2.5 rounded-xl border ${colorMap[color] || colorMap.yellow}`}>
           {icon}
        </div>
        <div className="w-2 h-2 rounded-full bg-zinc-800" />
      </div>
      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">{label}</p>
      <h3 className="text-4xl font-black text-white tracking-tighter group-hover:scale-105 transition-transform origin-left italic">{value}</h3>
      <p className="text-[10px] font-bold text-zinc-600 mt-2 flex items-center gap-1">
         <span className="w-1.5 h-1.5 rounded-full bg-tad-yellow/40 inline-block shrink-0" /> {sub}
      </p>
    </div>
  );
}
