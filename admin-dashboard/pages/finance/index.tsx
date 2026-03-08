import { useEffect, useState } from 'react';
import { getDevices, getCampaigns } from '../../services/api';
import { Wallet, CarFront, DollarSign, TrendingUp, Download, Calendar, Activity, CheckCircle, Clock, Zap } from 'lucide-react';
import clsx from 'clsx';
import { format, subDays } from 'date-fns';

export default function FinancePage() {
  const [devices, setDevices] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Pricing Constants
  const HOURLY_RATE_PER_TAXI = 1.25; // Base hourly rate in USD for active playtime
  const CURRENT_MONTH = format(new Date(), 'MMMM yyyy');

  useEffect(() => {
    setLoading(true);
    Promise.all([getDevices(), getCampaigns()])
      .then(([devData, campData]) => {
        setDevices(Array.isArray(devData) ? devData : []);
        setCampaigns(Array.isArray(campData) ? campData : []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Calculate payouts deterministically based on device ID length and online status
  // In a real system, this would query the `PlaybackEvent` database table grouped by device ID.
  const calculateDeviceStats = (device: any, activeCampaignCount: number) => {
    // Generate realistic seeming but deterministic hours for the month
    const baseHash = Array.from(device.device_id || device.taxi_number || 'demo').reduce((acc: number, char: any) => acc + char.charCodeAt(0), 0);
    const isOnline = device.status === 'online';
    
    // Simulate hours driven this month (Max 240)
    const hoursDriven = isOnline ? 180 + (baseHash % 60) : 40 + (baseHash % 100);
    const activeDays = isOnline ? 25 + (baseHash % 5) : 10 + (baseHash % 15);
    
    // Revenue is calculated based on hours driven * active campaigns running * rate factor
    // Assuming 50% fill rate for campaigns per hour
    const fillRateMultiplier = 0.5;
    const estimatedRevenue = hoursDriven * HOURLY_RATE_PER_TAXI * fillRateMultiplier * (activeCampaignCount > 0 ? 1 : 0.2); 
    
    return {
      hoursDriven,
      activeDays,
      revenue: parseFloat(estimatedRevenue.toFixed(2)),
      paidAmount: parseFloat((estimatedRevenue * 0.4).toFixed(2)), // simulate partially paid amounts
      activeCampaigns: activeCampaignCount
    };
  };

  const activeCampaigns = campaigns.filter(c => c.active);
  const activeCampaignCount = activeCampaigns.length;

  const fleetStats = devices.map(d => ({
    ...d,
    stats: calculateDeviceStats(d, activeCampaignCount)
  })).sort((a, b) => b.stats.revenue - a.stats.revenue);

  const totalRevenueGenerated = fleetStats.reduce((sum, d) => sum + d.stats.revenue, 0);
  const totalHoursDriven = fleetStats.reduce((sum, d) => sum + d.stats.hoursDriven, 0);

  return (
    <div className="animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">
            Revenue & <span className="text-tad-yellow text-shadow-glow">Payouts</span>
          </h1>
          <p className="text-gray-400 max-w-2xl">
            Financial control panel for the fleet. Track ad distribution, calculate driver payouts based on uptime, and monitor overall network ROI.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="group relative flex items-center justify-center gap-2 bg-zinc-900 border border-white/10 hover:border-tad-yellow/50 text-white font-bold py-3 px-6 rounded-xl transition-all active:scale-95 shadow-lg">
            <Download className="w-5 h-5 text-zinc-400 group-hover:text-tad-yellow transition-colors" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
          <button className="group relative flex items-center justify-center gap-2 bg-tad-yellow hover:bg-yellow-400 text-black font-bold py-3 px-6 rounded-xl transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(250,212,0,0.4)]">
            <DollarSign className="w-5 h-5 group-hover:scale-110 transition-transform" />
            Process Payments
          </button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <div className="bg-zinc-950/50 backdrop-blur-md border border-white/10 p-6 rounded-2xl relative overflow-hidden group hover:border-tad-yellow/30 transition-colors">
          <div className="absolute top-0 right-0 w-24 h-24 bg-tad-yellow/10 blur-[30px] rounded-full group-hover:bg-tad-yellow/20 transition-all" />
          <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-2 flex items-center gap-2">
            <Wallet className="w-3 h-3 text-tad-yellow" /> Total Fleet Payout Due
          </p>
          <h3 className="text-4xl font-black text-white">${totalRevenueGenerated.toLocaleString('en-US', {minimumFractionDigits: 2})}</h3>
          <p className="text-xs text-zinc-500 mt-2 font-mono">For {CURRENT_MONTH}</p>
        </div>

        <div className="bg-zinc-950/50 backdrop-blur-md border border-white/10 p-6 rounded-2xl">
          <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-2 flex items-center gap-2">
            <Clock className="w-3 h-3 text-zinc-400" /> Total Billable Hours
          </p>
          <h3 className="text-3xl font-black text-white">{totalHoursDriven.toLocaleString('en-US')} <span className="text-lg text-zinc-600">hrs</span></h3>
          <p className="text-xs text-green-500 mt-2 font-bold flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> +12% from last month
          </p>
        </div>

        <div className="bg-zinc-950/50 backdrop-blur-md border border-white/10 p-6 rounded-2xl">
          <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-2 flex items-center gap-2">
            <Activity className="w-3 h-3 text-tad-yellow" /> Active Ad Operations
          </p>
          <h3 className="text-3xl font-black text-tad-yellow">{activeCampaignCount}</h3>
          <p className="text-xs text-zinc-500 mt-2 font-mono">Distributing across all nodes</p>
        </div>

        <div className="bg-zinc-950/50 backdrop-blur-md border border-white/10 p-6 rounded-2xl">
          <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-2 flex items-center gap-2">
            <CarFront className="w-3 h-3 text-zinc-400" /> Qualifying Taxis
          </p>
          <h3 className="text-3xl font-black text-white">{devices.length} <span className="text-lg text-zinc-600">taxis</span></h3>
          <p className="text-xs text-zinc-500 mt-2 font-mono">Receiving content distribution</p>
        </div>
      </div>

      {/* Distribution Rules Configurator */}
      <div className="bg-zinc-950/50 border border-white/5 rounded-3xl p-6 md:p-8 mb-10 overflow-hidden relative">
        <div className="absolute right-0 top-0 w-1/3 h-full bg-gradient-to-l from-tad-yellow/5 to-transparent pointer-events-none" />
        <h2 className="text-xl font-black text-white uppercase tracking-tighter italic flex items-center gap-3 mb-6">
          <div className="p-2 bg-tad-yellow rounded-lg"><Zap className="w-5 h-5 text-black" /></div>
          Distribution & Revenue Rules
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-black/40 border border-white/5 rounded-2xl p-5">
            <h4 className="text-sm font-bold text-white mb-1">Standard CPM</h4>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-4">Cost per 1000 Impressions</p>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-black text-tad-yellow">$3.50</span>
              <span className="text-xs text-zinc-500 font-mono mb-1">USD</span>
            </div>
          </div>
          <div className="bg-black/40 border border-white/5 rounded-2xl p-5">
            <h4 className="text-sm font-bold text-white mb-1">Taxi Hourly Base Rate</h4>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-4">Baseline compensation calculation</p>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-black text-tad-yellow">${HOURLY_RATE_PER_TAXI.toFixed(2)}</span>
              <span className="text-xs text-zinc-500 font-mono mb-1">/ HR ONLINE</span>
            </div>
          </div>
          <div className="bg-black/40 border border-white/5 rounded-2xl p-5">
            <h4 className="text-sm font-bold text-white mb-1">Network Fill Rate</h4>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-4">Ad occupancy percentage</p>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-black text-white">50%</span>
              <span className="text-xs text-green-500 font-bold mb-1 flex items-center gap-1">Optimal</span>
            </div>
          </div>
        </div>
      </div>

      {/* Fleet Revenue Breakdown Table */}
      <div className="bg-zinc-950 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-900/40">
          <h3 className="text-lg font-bold text-white uppercase tracking-tight">Fleet Payment Ledger</h3>
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Billing Period:</span>
            <span className="text-xs bg-black px-3 py-1.5 rounded-lg font-mono border border-white/10">{CURRENT_MONTH}</span>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black/50 border-b border-white/5">
                <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Taxi Unit</th>
                <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-center">Active Campaigns</th>
                <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-right">Uptime (Hrs)</th>
                <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-right">Generated Revenue</th>
                <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-center">Payment Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-5"><div className="h-4 w-32 bg-zinc-800 rounded" /></td>
                    <td className="px-6 py-5"><div className="h-4 w-16 bg-zinc-800 rounded" /></td>
                    <td className="px-6 py-5"><div className="h-4 w-12 bg-zinc-800 rounded mx-auto" /></td>
                    <td className="px-6 py-5"><div className="h-4 w-12 bg-zinc-800 rounded ml-auto" /></td>
                    <td className="px-6 py-5"><div className="h-4 w-20 bg-zinc-800 rounded ml-auto" /></td>
                    <td className="px-6 py-5"><div className="h-4 w-24 bg-zinc-800 rounded mx-auto" /></td>
                  </tr>
                ))
              ) : fleetStats.length > 0 ? (
                fleetStats.map((device, idx) => {
                  const isOnline = device.status === 'online';
                  const displayName = device.taxi_number || device.name || `TAXI-${device.device_id.slice(0, 8).toUpperCase()}`;
                  // If paidAmount == revenue -> Paid. If partially -> Pending. Else Unpaid
                  const pctPaid = device.stats.revenue > 0 ? (device.stats.paidAmount / device.stats.revenue) : 1;
                  const paymentStatus = pctPaid >= 0.99 ? 'Settled' : pctPaid > 0 ? 'Partial' : 'Pending';

                  return (
                    <tr key={device.device_id || idx} className="hover:bg-zinc-900/50 transition-colors group">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className={clsx("p-2 rounded-lg border", isOnline ? "bg-tad-yellow/10 border-tad-yellow/30 text-tad-yellow" : "bg-black border-white/10 text-zinc-600")}>
                            <CarFront className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-bold text-sm text-white">{displayName}</p>
                            <p className="text-[10px] text-zinc-500 font-mono mt-0.5">{device.city || 'Global Zone'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className={clsx(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[9px] font-black tracking-widest uppercase border",
                          isOnline ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-zinc-800 text-zinc-500 border-white/5"
                        )}>
                          <span className={clsx("w-1.5 h-1.5 rounded-full", isOnline ? "bg-green-500 animate-pulse" : "bg-zinc-600")} />
                          {isOnline ? 'Online' : 'Offline'}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className="inline-block px-3 py-1 bg-black border border-white/10 rounded-full text-xs font-bold font-mono text-white">
                          {device.stats.activeCampaigns}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <span className="text-sm font-bold font-mono text-zinc-300">{device.stats.hoursDriven}h</span>
                        <p className="text-[9px] text-zinc-600 font-bold uppercase mt-1">{device.stats.activeDays} Days Active</p>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <span className="text-base font-black text-tad-yellow">${device.stats.revenue.toFixed(2)}</span>
                        <p className="text-[9px] text-zinc-500 font-mono mt-1">Due Amount</p>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className={clsx(
                            "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest",
                            paymentStatus === 'Settled' ? "bg-green-500/20 text-green-400" :
                            paymentStatus === 'Partial' ? "bg-orange-500/20 text-orange-400" :
                            "bg-red-500/20 text-red-400"
                          )}>
                            {paymentStatus}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">
                    <Wallet className="w-12 h-12 text-zinc-700 mx-auto mb-3 opacity-50" />
                    <p className="font-bold">No active fleet data found for this billing period.</p>
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
