import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Activity } from 'lucide-react';

export function ImpressionChart({ timeSeries, loading }: { timeSeries: any[], loading: boolean }) {
  if (loading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 gap-4">
        <Activity className="w-12 h-12 opacity-20 animate-pulse" />
        <p className="text-[10px] font-black tracking-[0.3em] uppercase">Recopilando telemetría...</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={timeSeries || []} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="advChartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#FFD400" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#FFD400" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
        <XAxis dataKey="date" stroke="#52525b" fontSize={10} axisLine={false} tickLine={false} dy={10} tick={{ fill: '#71717a', fontWeight: 700 }} />
        <YAxis stroke="#52525b" fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontWeight: 700 }} />
        <Tooltip
          contentStyle={{ backgroundColor: 'rgba(9,9,11,0.95)', border: '1px solid rgba(255,212,0,0.2)', borderRadius: '1.5rem', fontSize: '12px', backdropFilter: 'blur(20px)' }}
          itemStyle={{ color: '#FFD400', fontWeight: '900' }}
          labelStyle={{ color: '#fff', marginBottom: '8px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em' }}
        />
        <Area
          type="monotone"
          dataKey="impressions"
          stroke="#FFD400"
          strokeWidth={4}
          fillOpacity={1}
          fill="url(#advChartGradient)"
          animationDuration={2000}
          activeDot={{ r: 8, fill: '#FFD400', stroke: '#000', strokeWidth: 4 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
