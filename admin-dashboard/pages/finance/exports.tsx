import { useState, useEffect } from 'react';
import { 
  FileText, Download, Car, Briefcase, History, Search, 
  ArrowLeft, FileDown, ShieldCheck, Printer, CheckCircle
} from 'lucide-react';
import Link from 'next/link';
import { 
  getCampaigns, getDevices, getFinancialLedger,
  downloadCampaignPdf, downloadFleetPdf, downloadTransactionPdf,
  downloadWeeklyCampaignPdf
} from '../../services/api';

export default function ExportsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [ledgers, setLedgers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [c, l] = await Promise.all([getCampaigns(), getFinancialLedger()]);
        setCampaigns(Array.isArray(c) ? c : []);
        setLedgers(Array.isArray(l) ? l : []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filteredCampaigns = campaigns.filter(c => 
    c.name.toLowerCase().includes(query.toLowerCase()) || 
    c.advertiser.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white font-sans p-4 md:p-8 animate-in fade-in duration-500">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <Link href="/finance" className="flex items-center gap-2 text-gray-400 hover:text-tad-yellow transition-colors mb-4 text-xs font-bold uppercase tracking-widest">
              <ArrowLeft className="w-4 h-4" /> Volver a Finanzas
            </Link>
            <h1 className="text-4xl font-black tracking-tighter text-white flex items-center gap-4">
              <FileDown className="w-10 h-10 text-tad-yellow" />
              CENTRO DE EXPORTACIÓN
            </h1>
            <p className="text-gray-500 mt-2 text-sm font-medium">Generación de documentación legal y técnica de base de datos.</p>
          </div>
          
          <button 
            onClick={() => downloadFleetPdf()}
            className="bg-tad-yellow text-black px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-wider flex items-center gap-3 hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,212,0,0.2)]"
          >
            <Car className="w-5 h-5" /> Reporte de Flota Global (PDF)
          </button>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Campaigns Column */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-3">
                <Briefcase className="w-6 h-6 text-tad-yellow" />
                Certificados de Exhibición
              </h2>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input 
                  type="text" 
                  placeholder="Buscar campaña..."
                  className="bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-xs focus:border-tad-yellow outline-none transition-all w-48"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800 rounded-[32px] overflow-hidden backdrop-blur-sm">
              <div className="p-2">
                {loading ? (
                  <div className="p-12 text-center text-gray-500 text-sm font-bold uppercase tracking-widest animate-pulse">Cargando Campañas...</div>
                ) : filteredCampaigns.length === 0 ? (
                  <div className="p-12 text-center text-gray-500 text-sm">No hay campañas para exportar.</div>
                ) : filteredCampaigns.map((c, i) => (
                  <div key={i} className="flex items-center justify-between p-4 hover:bg-white/[0.03] rounded-2xl transition-colors group">
                    <div>
                      <h4 className="font-bold text-white text-sm">{c.name}</h4>
                      <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mt-1">{c.advertiser}</p>
                    </div>
                    <div className="flex gap-2">
                       <button 
                        onClick={() => downloadWeeklyCampaignPdf(c.id, c.name)}
                        className="p-3 bg-zinc-800 text-emerald-400 rounded-xl hover:bg-emerald-500 hover:text-white transition-all group-hover:scale-110"
                        title="Reporte Semanal (PDF)"
                      >
                        <History className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => downloadCampaignPdf(c.id, c.name)}
                        className="p-3 bg-zinc-800 text-tad-yellow rounded-xl hover:bg-tad-yellow hover:text-black transition-all group-hover:scale-110"
                        title="Certificado POP Total"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Ledger Column */}
          <div className="space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-3">
              <History className="w-6 h-6 text-tad-yellow" />
              Recibos de Transacción
            </h2>

            <div className="bg-zinc-900/50 border border-zinc-800 rounded-[32px] overflow-hidden backdrop-blur-sm">
              <div className="p-2">
                {loading ? (
                  <div className="p-12 text-center text-gray-500 text-sm font-bold uppercase tracking-widest animate-pulse">Cargando Libro Mayor...</div>
                ) : ledgers.length === 0 ? (
                  <div className="p-12 text-center text-gray-500 text-sm">No hay transacciones recientes.</div>
                ) : ledgers.slice(0, 8).map((l, i) => (
                  <div key={i} className="flex items-center justify-between p-4 hover:bg-white/[0.03] rounded-2xl transition-colors group">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black ${l.type === 'INCOMING' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                        {l.type === 'INCOMING' ? 'IN' : 'OUT'}
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-sm">RD$ {l.amount.toLocaleString()}</h4>
                        <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mt-1">{l.category} • {new Date(l.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => downloadTransactionPdf(l.id)}
                      className="p-3 bg-zinc-800 text-white rounded-xl hover:bg-white hover:text-black transition-all group-hover:scale-110"
                      title="Descargar Recibo de Pago"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-tad-yellow/5 border border-tad-yellow/10 p-6 rounded-3xl">
              <div className="flex items-center gap-3 mb-4">
                 <ShieldCheck className="w-5 h-5 text-tad-yellow" />
                 <h4 className="font-bold text-sm">Auditoría SRE Digital</h4>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                Todos los documentos generados están firmados digitalmente por el núcleo TAD y son trazables mediante la cadena de bloques de telemetría de las tablets.
              </p>
            </div>
          </div>

        </div>

        {/* Footer info */}
        <div className="mt-12 pt-8 border-t border-zinc-900 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.4em]">TAD Advertising Platform © 2026 / NEXUS_EXPORT_v2</p>
            <div className="flex items-center gap-6">
                <span className="flex items-center gap-2 text-[10px] font-bold text-emerald-500">
                   <CheckCircle className="w-3 h-3" /> PDF_ENGINE_ONLINE
                </span>
                <span className="flex items-center gap-2 text-[10px] font-bold text-gray-500">
                   STORAGE: ENCRYPTED
                </span>
            </div>
        </div>

      </div>
    </div>
  );
}
