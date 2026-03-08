import { useEffect, useState } from 'react';
import { getTopTaxis, getHourlyPlays } from '../../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area } from 'recharts';
import { BarChart3, Clock, TrendingUp, Zap, Activity } from 'lucide-react';

export default function AnalyticsPage() {
  const [topTaxis, setTopTaxis] = useState<any[]>([]);
  const [hourlyPlays, setHourlyPlays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setError(null);
    Promise.all([
      getTopTaxis().then(data => {
        setTopTaxis(data.map((d: any) => ({ name: d.device_id.slice(0, 8), Plays: Number(d.plays) })));
      }),
      getHourlyPlays().then(data => {
        const formatted = Array.isArray(data) ? data.sort((a: any, b: any) => a.hour.localeCompare(b.hour)) : [];
        setHourlyPlays(formatted.map((d: any) => ({ time: `${d.hour}:00`, 'Ad Impressions': Number(d.plays) })));
      })
    ])
    .catch(err => {
      console.error("Analytics Load Error", err);
      setError("FAILED TO RETRIEVE NETWORK INTELLIGENCE. UPLINK SATURATED.");
    })
    .finally(() => setLoading(false));
  }, []);

  return (
    <div className="animate-in fade-in duration-1000">
      <div className="mb-10">
        <h1 className="text-4xl font-black tracking-tighter text-white uppercase italic">
          Network <span className="text-tad-yellow text-shadow-glow">Intelligence</span>
        </h1>
        <p className="text-zinc-500 font-bold uppercase tracking-[0.2em] text-[10px] mt-1">Real-time Ad Propagation & Impression Metrics</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Top Taxis Chart  */}
        <div className="bg-zinc-950/50 backdrop-blur-xl border border-white/5 p-8 rounded-3xl shadow-2xl relative overflow-hidden group hover:border-white/10 transition-all">
           <div className="flex items-center gap-3 mb-8">
              <div className="p-2 bg-tad-yellow/20 rounded-lg text-tad-yellow">
                 <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                 <h4 className="text-lg font-black text-white uppercase tracking-tighter italic">Top Fleet Nodes</h4>
                 <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Top 20 units by cumulative impressions</p>
              </div>
           </div>
           
            <div className="h-80 w-full" style={{ minHeight: '320px' }}>
              {!mounted ? (
                <div className="h-full flex items-center justify-center text-zinc-800 font-black italic">INITIALIZING SENSORS...</div>
              ) : topTaxis.length === 0 ? (
                <div className="h-full flex items-center justify-center text-zinc-700 font-black italic text-sm">NO DATA AVAILABLE — AWAITING FLEET TRANSMISSIONS</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={200}>
                  <BarChart data={topTaxis}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                    <XAxis 
                       dataKey="name" 
                       stroke="#52525b" 
                       fontSize={10} 
                       fontWeight="bold"
                       axisLine={false} 
                       tickLine={false} 
                       angle={-45} 
                       textAnchor="end" 
                       height={60}
                     />
                    <YAxis stroke="#52525b" fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} />
                    <Tooltip 
                       contentStyle={{ backgroundColor: '#000', border: '1px solid #27272a', borderRadius: '12px', fontSize: '10px', fontWeight: 'bold' }}
                       itemStyle={{ color: 'white' }}
                       cursor={{ fill: 'rgba(250,212,0,0.05)' }} 
                     />
                    <Bar dataKey="Plays" fill="#fad400" radius={[4, 4, 0, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
        </div>

        {/* Hourly Traffic Pattern Chart  */}
        <div className="bg-zinc-950/50 backdrop-blur-xl border border-white/5 p-8 rounded-3xl shadow-2xl relative overflow-hidden group hover:border-white/10 transition-all">
           <div className="flex items-center gap-3 mb-8">
              <div className="p-2 bg-tad-yellow/20 rounded-lg text-tad-yellow">
                 <Clock className="w-5 h-5" />
              </div>
              <div>
                 <h4 className="text-lg font-black text-white uppercase tracking-tighter italic">Peak Transit Density</h4>
                 <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Hourly impression distribution across nodes</p>
              </div>
           </div>

           <div className="h-80 w-full" style={{ minHeight: '320px' }}>
             {!mounted ? (
               <div className="h-full flex items-center justify-center text-zinc-800 font-black italic">SYNCHRONIZING...</div>
             ) : hourlyPlays.length === 0 ? (
               <div className="h-full flex items-center justify-center text-zinc-700 font-black italic text-sm">NO HOURLY DATA — UPLINK PENDING</div>
             ) : (
               <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={200}>
                <AreaChart data={hourlyPlays}>
                  <defs>
                    <linearGradient id="colorImpressions" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#fad400" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#fad400" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis 
                     dataKey="time" 
                     stroke="#52525b" 
                     fontSize={10} 
                     fontWeight="bold"
                     axisLine={false} 
                     tickLine={false} 
                  />
                  <YAxis stroke="#52525b" fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#000', border: '1px solid #27272a', borderRadius: '12px', fontSize: '10px', fontWeight: 'bold' }}
                    itemStyle={{ color: 'white' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="Ad Impressions" 
                    stroke="#fad400" 
                    strokeWidth={4} 
                    fillOpacity={1} 
                    fill="url(#colorImpressions)"
                  />
                </AreaChart>
               </ResponsiveContainer>
             )}
           </div>
        </div>
      </div>

      <div className="bg-zinc-950/50 border border-white/5 p-8 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative">
         <div className="flex items-center gap-4 relative z-10">
            <div className="p-4 bg-zinc-900 rounded-2xl shadow-xl border border-white/5">
               <TrendingUp className="text-tad-yellow w-8 h-8" />
            </div>
            <div>
               <h4 className="text-xl font-black text-white uppercase italic tracking-tighter leading-tight">Efficiency Coefficient</h4>
               <p className="text-xs text-zinc-400 font-medium">Network optimization is performing 12% above Q1 baseline.</p>
            </div>
         </div>
         <div className="flex gap-3 relative z-10">
            <button className="px-6 py-3 bg-tad-yellow text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-tad-yellow/10">Download Report</button>
            <button className="px-6 py-3 bg-zinc-800 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-all outline-none border border-white/10">Configure Alerts</button>
         </div>
         <div className="absolute top-0 right-0 w-[400px] h-full bg-tad-yellow/5 skew-x-12 -z-0" />
      </div>
    </div>
  );
}
