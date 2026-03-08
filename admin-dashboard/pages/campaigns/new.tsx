import { useState } from 'react';
import { useRouter } from 'next/router';
import { createCampaign } from '../../services/api';
import { ArrowLeft, Save, Megaphone, Calendar, Activity, Info, Zap } from 'lucide-react';
import Link from 'next/link';
import clsx from 'clsx';

export default function NewCampaignPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '',
    advertiser: '',
    start_date: '',
    end_date: '',
    active: true
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createCampaign(form);
      router.push('/campaigns');
    } catch (err) {
      console.error(err);
      alert('Failed to initialize container. Check network console.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="mb-10 flex items-center justify-between">
        <Link href="/campaigns" className="group flex items-center gap-2 text-zinc-500 hover:text-white transition-colors">
          <div className="p-2 bg-zinc-900 rounded-lg group-hover:bg-zinc-800 transition-colors border border-white/5">
            <ArrowLeft className="w-4 h-4" />
          </div>
          <span className="text-sm font-bold uppercase tracking-widest">Back to Network</span>
        </Link>
      </div>

      <div className="bg-zinc-950/50 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        <div className="p-8 border-b border-white/5 bg-white/[0.02]">
          <h3 className="text-3xl font-black text-white flex items-center gap-4">
            <div className="p-3 bg-tad-yellow rounded-2xl shadow-[0_0_20px_rgba(250,212,0,0.3)]">
              <Megaphone className="w-6 h-6 text-black" />
            </div>
            New <span className="text-tad-yellow text-shadow-glow">Container</span>
          </h3>
          <p className="text-gray-400 mt-2 text-sm">Define a new network container for media payload distribution.</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="group">
                <label className="text-xs font-black text-gray-500 uppercase tracking-[0.2em] mb-3 block group-focus-within:text-tad-yellow transition-colors">Campaign Label</label>
                <input 
                  required
                  type="text" 
                  value={form.name}
                  onChange={e => setForm({...form, name: e.target.value})}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white focus:border-tad-yellow focus:ring-1 focus:ring-tad-yellow outline-none transition-all placeholder:text-zinc-700 font-bold"
                  placeholder="e.g. SUMMER_FESTIVAL_2026"
                />
              </div>

              <div className="group">
                <label className="text-xs font-black text-gray-500 uppercase tracking-[0.2em] mb-3 block group-focus-within:text-tad-yellow transition-colors">Advertiser Entity</label>
                <div className="relative">
                  <input 
                    required
                    type="text" 
                    value={form.advertiser}
                    onChange={e => setForm({...form, advertiser: e.target.value})}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white focus:border-tad-yellow outline-none transition-all placeholder:text-zinc-700 font-bold"
                    placeholder="e.g. Coca-Cola Global"
                  />
                  <Zap className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-tad-yellow/50" />
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="group">
                  <label className="text-xs font-black text-gray-500 uppercase tracking-[0.2em] mb-3 block group-focus-within:text-tad-yellow transition-colors">Launch Date</label>
                  <div className="relative">
                    <input 
                      required
                      type="date" 
                      value={form.start_date}
                      onChange={e => setForm({...form, start_date: e.target.value})}
                      className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white focus:border-tad-yellow outline-none transition-all [color-scheme:dark] font-mono text-sm" 
                    />
                  </div>
                </div>
                <div className="group">
                  <label className="text-xs font-black text-gray-500 uppercase tracking-[0.2em] mb-3 block group-focus-within:text-tad-yellow transition-colors">Retract Date</label>
                  <input 
                    required
                    type="date" 
                    value={form.end_date}
                    onChange={e => setForm({...form, end_date: e.target.value})}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white focus:border-tad-yellow outline-none transition-all [color-scheme:dark] font-mono text-sm" 
                  />
                </div>
              </div>

              <div className="bg-white/5 border border-white/5 p-6 rounded-3xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={clsx(
                    "w-10 h-10 rounded-xl flex items-center justify-center transition-colors border border-white/5",
                    form.active ? "bg-tad-yellow/10 text-tad-yellow" : "bg-zinc-900 text-zinc-700"
                  )}>
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white uppercase tracking-tight">Active Deployment</p>
                    <p className="text-[10px] text-zinc-500 uppercase font-black">Immediate activation upon save</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={form.active}
                    onChange={e => setForm({...form, active: e.target.checked})}
                    className="sr-only peer" 
                  />
                  <div className="w-14 h-7 bg-zinc-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-tad-yellow"></div>
                </label>
              </div>
            </div>
          </div>

          <div className="pt-10 flex flex-col items-center border-t border-white/5">
            <button 
              type="submit" 
              disabled={loading}
              className="group w-full md:w-auto min-w-[300px] flex justify-center py-5 px-10 bg-tad-yellow hover:bg-yellow-400 text-black font-black rounded-2xl shadow-[0_0_30px_rgba(250,212,0,0.4)] transition-all disabled:opacity-50 active:scale-95 items-center gap-3 uppercase tracking-widest text-sm"
            >
              {loading ? (
                <Zap className="w-5 h-5 animate-spin text-black" />
              ) : (
                <Save className="w-5 h-5 group-hover:scale-110 transition-transform" />
              )}
              {loading ? 'Initializing...' : 'Authorize & Create'}
            </button>
            
            <div className="mt-6 flex items-center gap-2 text-[10px] text-zinc-500 text-center max-w-sm">
              <Info className="w-4 h-4 text-tad-yellow flex-shrink-0" />
              Once created, this container becomes a valid target for media payloads in the ecosystem dashboard.
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
