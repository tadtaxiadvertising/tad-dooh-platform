import { useEffect, useState } from 'react';
import { getCampaigns } from '../../services/api';
import { PlusCircle, Megaphone, Zap, Calendar, Users, Activity, ExternalLink, MoreVertical } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getCampaigns()
      .then(setCampaigns)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">
            Network <span className="text-tad-yellow text-shadow-glow">Campaigns</span>
          </h1>
          <p className="text-gray-400 max-w-2xl">
            Real-time management of DOOH broadcasts. Monitor state and deployment across the global tablet network.
          </p>
        </div>
        <Link 
          href="/campaigns/new"
          className="group relative flex items-center justify-center gap-2 bg-tad-yellow hover:bg-yellow-400 text-black font-bold py-3 px-6 rounded-xl transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(250,212,0,0.4)]"
        >
          <PlusCircle className="w-5 h-5 transition-transform group-hover:rotate-12" />
          Create New Campaign
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {loading ? (
          [1,2,3].map(i => <div key={i} className="h-24 bg-zinc-900/40 animate-pulse rounded-2xl border border-white/5" />)
        ) : campaigns.length > 0 ? (
          <div className="bg-zinc-900/30 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-white/5">
                <thead>
                  <tr className="bg-white/5">
                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Campaign</th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Advertiser</th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Status</th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Timeline</th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest text-center">Payloads</th>
                    <th scope="col" className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {campaigns.map((camp) => (
                    <tr key={camp.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-tad-yellow/10 rounded-lg text-tad-yellow">
                            <Megaphone className="w-4 h-4" />
                          </div>
                          <span className="text-sm font-bold text-white group-hover:text-tad-yellow transition-colors uppercase tracking-tight">{camp.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-400 font-medium">
                        {camp.advertiser}
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase border ${
                          camp.active 
                          ? 'bg-tad-yellow/10 text-tad-yellow border-tad-yellow/20' 
                          : 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20'
                        }`}>
                          <Activity className="w-3 h-3" />
                          {camp.active ? 'Broadcasting' : 'Paused'}
                        </span>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-[11px] text-gray-500 font-mono">
                        <div className="flex flex-col">
                          <span>START: {format(new Date(camp.startDate || camp.start_date), 'MM/dd/yyyy')}</span>
                          <span>END: {format(new Date(camp.endDate || camp.end_date), 'MM/dd/yyyy')}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-tad-yellow/10 text-tad-yellow text-xs font-black border border-tad-yellow/20">
                          {camp.mediaAssets?.length || 0}
                        </span>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-right">
                        <button className="p-2 text-gray-600 hover:text-white transition-colors">
                          <MoreVertical className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="py-20 bg-zinc-900/30 border border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center text-center">
            <Megaphone className="w-16 h-16 text-zinc-700 mb-4" />
            <h3 className="text-xl font-bold text-gray-400">No active campaigns</h3>
            <p className="text-gray-500 mt-2 max-w-sm">
              Your network is currently idle. Create a new campaign to begin distributing content.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
