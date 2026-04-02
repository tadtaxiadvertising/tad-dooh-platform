import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import { Toaster, toast } from 'sonner';
import { DirectUpload } from '../../../components/DirectUpload';
import { AntigravityButton } from '../../../components/ui/AntigravityButton';
import { PlayCircle, Eye, BarChart3, Clock, AlertCircle } from 'lucide-react';
import API from '../../../services/api';

// Leaflet requires window, we must dynamically import
const MapWithHeatmap = dynamic(
  () => import('../../../components/map/AdvertiserMap'), 
  { ssr: false, loading: () => <div className="h-96 w-full animate-pulse bg-zinc-900 rounded-2xl border border-white/10" /> }
);

export default function AdvertiserDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [heatmapPoints, setHeatmapPoints] = useState<[number, number, number][]>([]);

  // Using a mock or logged in advertiser ID. For now test id:
  const ADVERTISER_ID = "test-advertiser-id"; 

  useEffect(() => {
    // Attempt to load portal data dynamically
    const loadPortal = async () => {
      try {
        // Fallback to fetch from new endpoint or mock
        // Since we didn't implement the full auth context yet, let's use API if possible, otherwise mock it.
        const res = await API.get(`/advertisers/${ADVERTISER_ID}/portal`).catch(() => null);
        
        if (res && res.data) {
          setData(res.data);
        } else {
          // MOCK DATA PARA FINES ESCTRUCTURALES (si no existe BD conectada actual)
          setData({
            brand: { name: 'Empresa Demo S.R.L', category: 'Retail' },
            stats: { 
              promocionesContratadas: 150000,
              totalImpressions: 124500,
              totalCompletions: 118000,
              totalScans: 430,
              activeCampaigns: 2
            },
            financials: {
              costPerAd: 1500,
              taxRate: 0.18,
              subtotal: 3000,
              taxAmount: 540,
              totalCost: 3540
            },
            campaigns: [
              { id: '1', name: 'Promo Navidad', promocionesContratadas: 100000, impressions: 84000, completions: 80000 },
              { id: '2', name: 'Oferta Especial', promocionesContratadas: 50000, impressions: 40500, completions: 38000 }
            ]
          });
        }

        // Mock some heatmap points in Santo Domingo
        setHeatmapPoints([
          [18.4861, -69.9312, 0.8],
          [18.4712, -69.9324, 0.6],
          [18.4633, -69.9388, 0.9],
          [18.4678, -69.9248, 0.5],
        ]);
        
      } catch (err) {
        toast.error("Error cargando el dashboard");
      } finally {
        setLoading(false);
      }
    };
    loadPortal();
  }, []);

  const handleUploadSuccess = (url: string, filename: string) => {
    toast.success(`Contenido "${filename}" ha sido enviado a validación.`);
    // Here we'd call API to create PortalRequest TYPE: CONTENT_UPDATE
    API.post('/portal-requests', {
      advertiserId: ADVERTISER_ID,
      type: 'CONTENT_UPDATE',
      title: 'Nuevo contenido multimedia',
      data: { url, filename }
    }).then(() => {
      toast.success('Solicitud enviada al Administrador.');
    }).catch(() => {
      toast.error('Error enviando solicitud');
    });
  };

  if (loading) return <div className="min-h-screen bg-black text-white flex items-center justify-center">Cargando Portal...</div>;

  const { stats, financials, brand, campaigns } = data;

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-zinc-100 font-sans selection:bg-[#FFD400]/30 selection:text-white">
      <Head>
        <title>Portal de Anunciantes | TAD DOOH</title>
      </Head>
      <Toaster theme="dark" position="top-right" richColors />

      {/* HEADER PREMIUM */}
      <header className="sticky top-0 z-50 bg-black/40 backdrop-blur-2xl border-b border-white/5 py-4 px-6 md:px-12 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-[#FFD400] flex items-center justify-center font-bold text-black">
            T
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-wide">TAD <span className="opacity-70">DOOH</span></h1>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-zinc-300 bg-white/5 px-4 py-1.5 rounded-full border border-white/5">
            {brand.name}
          </span>
          <AntigravityButton actionName="Support" variant="secondary" onClick={() => toast.success("Soporte en línea en breve.")}>
            Soporte
          </AntigravityButton>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 md:px-12 py-10 space-y-12">
        {/* WELCOME SECTION */}
        <section>
          <h2 className="text-3xl font-light text-white">Hola, <span className="font-semibold text-[#FFD400]">{brand.name}</span></h2>
          <p className="text-zinc-400 mt-2">Monitoreo en tiempo real de tu impacto geográfico.</p>
        </section>

        {/* METRICS DASHBOARD (GLASSMORPHISM) */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-black/20 backdrop-blur-3xl border border-[#FFD400]/20 rounded-3xl p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <PlayCircle size={48} className="text-[#FFD400]" />
            </div>
            <p className="text-sm text-zinc-400 font-medium tracking-wide uppercase">Promociones (Ciclos) Contratados</p>
            <h3 className="text-4xl font-bold text-white mt-2">{stats.promocionesContratadas.toLocaleString()}</h3>
            <p className="text-xs text-[#FFD400] mt-3 bg-[#FFD400]/10 inline-flex px-2 py-1 rounded-md mb-0">Objetivo Mensual</p>
          </div>

          <div className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-3xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <Eye size={48} className="text-white" />
            </div>
            <p className="text-sm text-zinc-400 font-medium tracking-wide uppercase">Visitas Estimadas Cumplidas</p>
            <h3 className="text-4xl font-bold text-white mt-2">{stats.totalImpressions.toLocaleString()}</h3>
            <div className="w-full bg-white/10 h-1 mt-4 rounded-full overflow-hidden">
              <div 
                className="bg-emerald-500 h-full rounded-full" 
                style={{ width: `${Math.min((stats.totalImpressions / Math.max(1, stats.promocionesContratadas)) * 100, 100)}%` }} 
              />
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-3xl p-6 relative overflow-hidden">
            <p className="text-sm text-zinc-400 font-medium tracking-wide uppercase">Inversión Actual</p>
            <div className="mt-2 flex items-baseline space-x-1">
              <span className="text-lg text-zinc-500">RD$</span>
              <h3 className="text-4xl font-bold text-white">{financials.totalCost.toLocaleString()}</h3>
            </div>
            <p className="text-xs text-zinc-400 mt-2">
              Incluye {financials.taxRate * 100}% ITBIS (RD${financials.taxAmount.toLocaleString()})
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-3xl p-6 flex flex-col justify-center items-center text-center">
            <BarChart3 className="w-8 h-8 text-[#FFD400] mb-3" />
            <h4 className="text-white font-medium">Reportando {stats.activeCampaigns} Campañas</h4>
            <p className="text-xs text-zinc-400 mt-1">Cálculo exacto: RD$1,500/mes x Campaña</p>
          </div>
        </section>

        {/* MAP & DIRECT UPLOAD */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="col-span-1 lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-medium text-white">Densidad Geográfica de Emisión</h3>
            </div>
            <div className="rounded-3xl overflow-hidden border border-white/10 bg-black/40 h-[450px] relative">
              <MapWithHeatmap points={heatmapPoints} />
            </div>
          </div>

          <div className="col-span-1 space-y-6">
            <h3 className="text-xl font-medium text-white">Actualización de Contenido</h3>
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 flex items-start space-x-3 mb-4">
              <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-yellow-200/80">Todo contenido subido requerirá la validación del Administrador Maestro mediante solicitud automática.</p>
            </div>
            <DirectUpload onSuccess={handleUploadSuccess} />
          </div>

        </section>

        {/* CAMPAIGN LIST */}
        <section>
          <h3 className="text-xl font-medium text-white mb-6">Desglose de Campañas</h3>
          <div className="bg-black/20 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-3xl">
            <table className="w-full text-left text-sm text-zinc-400">
              <thead className="bg-white/5 border-b border-white/10 text-xs uppercase font-medium">
                <tr>
                  <th className="px-6 py-4">Campaña</th>
                  <th className="px-6 py-4 text-right">Promociones Contratadas</th>
                  <th className="px-6 py-4 text-right">Ejecutadas</th>
                  <th className="px-6 py-4 text-right">Efectividad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {campaigns.map((camp: any) => (
                  <tr key={camp.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-white font-medium">{camp.name}</p>
                      <p className="text-xs flex items-center mt-1">
                        <Clock size={12} className="mr-1 inline text-[#FFD400]" /> 
                        {new Date(camp.start).toLocaleDateString()} - {new Date(camp.end).toLocaleDateString()}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-white">
                      {camp.promocionesContratadas.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {camp.impressions.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {camp.promocionesContratadas > 0 ? 
                        <span className="text-emerald-400 font-medium">
                          {((camp.impressions / camp.promocionesContratadas) * 100).toFixed(1)}%
                        </span> 
                      : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
