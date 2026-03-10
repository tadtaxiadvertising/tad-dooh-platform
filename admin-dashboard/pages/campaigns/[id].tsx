import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { getCampaignById } from '../../services/api';
import { ArrowLeft, Megaphone, Calendar, Activity, Film, Clock, Zap, Users, MapPin, Play } from 'lucide-react';
import Link from 'next/link';
import { format, formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';
import { CampaignModal } from '../../components/CampaignModal';

export default function CampaignDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [campaign, setCampaign] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchCampaign = () => {
    if (!id) return;
    setLoading(true);
    getCampaignById(id as string)
      .then(data => setCampaign(data))
      .catch(err => {
        console.error(err);
        setError("Error al obtener los datos de la campaña.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCampaign();
  }, [id]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-zinc-900 rounded-xl w-48" />
        <div className="h-64 bg-zinc-900/40 rounded-3xl border border-white/5" />
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="text-center py-20">
        <Megaphone className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-400">Campaña no encontrada</h3>
        <p className="text-gray-500 mt-2">{error || "La campaña solicitada no existe."}</p>
        <Link href="/campaigns" className="inline-block mt-6 text-tad-yellow hover:underline font-bold text-sm uppercase tracking-widest">
          ← Volver a Campañas
        </Link>
      </div>
    );
  }

  const isActive = campaign.active;
  
  // MERGE V1 (mediaAssets) and V2 (media) records for display
  const v1Assets = campaign.mediaAssets || [];
  const v2Assets = (campaign.media || []).map((m: any) => ({
    id: m.id,
    type: 'VIDEO',
    filename: m.filename || m.originalFilename || 'video.mp4',
    url: m.url || m.cdnUrl,
    fileSize: Number(m.fileSize || 0),
    duration: m.durationSeconds || 15, // Default to 15s if unknown
    createdAt: m.createdAt
  }));
  
  const assets = [...v1Assets, ...v2Assets];

  const startDate = new Date(campaign.startDate || campaign.start_date);
  const endDate = new Date(campaign.endDate || campaign.end_date);
  const now = new Date();
  const isLive = isActive && now >= startDate && now <= endDate;
  const totalDuration = assets.reduce((sum: number, a: any) => sum + (a.duration || 0), 0);
  const targetCities = (() => {
    try { const parsed = JSON.parse(campaign.targetCities || '[]'); return Array.isArray(parsed) ? parsed : []; }
    catch { return []; }
  })();

  /** Extract the clean video URL (remove mock hash fragment) */
  const getCleanUrl = (url: string) => url?.split('#')[0] || url;

  return (
    <div className="animate-in fade-in duration-700 pb-20">
      {/* Back Navigation */}
      <div className="mb-8">
        <Link href="/campaigns" className="group flex items-center gap-2 text-zinc-500 hover:text-white transition-colors w-fit">
          <div className="p-2 bg-zinc-900 rounded-lg group-hover:bg-zinc-800 transition-colors border border-white/5">
            <ArrowLeft className="w-4 h-4" />
          </div>
          <span className="text-sm font-bold uppercase tracking-widest">Volver a la Red</span>
        </Link>
      </div>

      {/* Campaign Header */}
      <div className="bg-zinc-950/50 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl mb-8">
        <div className="p-8 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className={clsx(
              "p-4 rounded-2xl shadow-xl",
              isLive ? "bg-tad-yellow shadow-tad-yellow/20" : "bg-zinc-800"
            )}>
              <Megaphone className={clsx("w-7 h-7", isLive ? "text-black" : "text-zinc-400")} />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white uppercase tracking-tighter italic">{campaign.name}</h1>
              <p className="text-zinc-400 text-sm font-medium mt-1">
                by <span className="text-white font-bold">{campaign.advertiser}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={async () => {
                if (!confirm(`¿Eliminar la campaña "${campaign.name}" permanentemente?`)) return;
                try {
                  await (await import('../../services/api')).deleteCampaign(campaign.id);
                  router.push('/campaigns');
                } catch (err) {
                  alert('Error al eliminar: ' + (err as any).message);
                }
              }}
              className="bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white px-4 py-2 rounded-xl text-[10px] font-black tracking-widest uppercase border border-red-500/20 transition-all mr-2"
            >
              Eliminar Campaña
            </button>
            <span className={clsx(
              "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black tracking-widest uppercase border",
              isLive 
                ? "bg-tad-yellow/10 text-tad-yellow border-tad-yellow/20" 
                : isActive 
                  ? "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
                  : "bg-red-500/10 text-red-400 border-red-500/20"
            )}>
              <span className={clsx("w-2 h-2 rounded-full", isLive ? "bg-tad-yellow animate-pulse" : isActive ? "bg-zinc-500" : "bg-red-500")} />
              {isLive ? 'Transmisión en Vivo' : isActive ? 'Programada' : 'Pausada'}
            </span>
          </div>
        </div>

        {/* Campaign Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-white/5">
          <div className="p-6 text-center">
            <div className="flex items-center justify-center gap-2 text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-2">
              <Calendar className="w-3 h-3" /> Fecha Inicio
            </div>
            <p className="text-white font-bold text-sm font-mono">{format(startDate, 'dd MMM, yyyy')}</p>
          </div>
          <div className="p-6 text-center">
            <div className="flex items-center justify-center gap-2 text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-2">
              <Calendar className="w-3 h-3" /> Fecha Fin
            </div>
            <p className="text-white font-bold text-sm font-mono">{format(endDate, 'dd MMM, yyyy')}</p>
          </div>
          <div className="p-6 text-center">
            <div className="flex items-center justify-center gap-2 text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-2">
              <Film className="w-3 h-3" /> Archivos
            </div>
            <p className="text-tad-yellow font-black text-2xl">{assets.length}</p>
          </div>
          <div className="p-6 text-center">
            <div className="flex items-center justify-center gap-2 text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-2">
              <Clock className="w-3 h-3" /> Ciclo Total
            </div>
            <p className="text-white font-bold text-sm">{totalDuration}s</p>
          </div>
        </div>
      </div>

      {/* Media Assets Section */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-black text-white uppercase tracking-tighter italic">
          Cargas <span className="text-tad-yellow">Multimedia</span>
        </h2>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-tad-yellow hover:bg-yellow-400 text-black font-black text-[10px] uppercase tracking-widest px-6 py-3 rounded-xl transition-all shadow-[0_0_20px_rgba(250,212,0,0.2)]"
        >
          <Zap className="w-4 h-4" /> Gestionar Despliegue
        </button>
      </div>

      {assets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assets.map((asset: any) => {
            const cleanUrl = getCleanUrl(asset.url);
            return (
              <div key={asset.id} className="group bg-zinc-950/50 border border-white/10 rounded-2xl overflow-hidden hover:border-tad-yellow/30 transition-all">
                {/* Video Preview */}
                <div className="aspect-video bg-black relative overflow-hidden">
                  <video 
                    src={cleanUrl}
                    className="w-full h-full object-cover"
                    preload="metadata"
                    muted
                    playsInline
                    onMouseOver={e => (e.target as HTMLVideoElement).play().catch(() => {})}
                    onMouseOut={e => { const v = e.target as HTMLVideoElement; v.pause(); v.currentTime = 0; }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                  <div className="absolute bottom-3 left-3 flex items-center gap-2">
                    <span className="bg-black/60 backdrop-blur px-2 py-1 rounded-md text-[10px] text-gray-300 font-mono">
                      {asset.duration || '?'}s
                    </span>
                    <span className="bg-black/60 backdrop-blur px-2 py-1 rounded-md text-[10px] text-gray-300 font-mono uppercase">
                      {asset.type}
                    </span>
                  </div>
                </div>

                <div className="p-5">
                  <h4 className="text-white font-bold truncate">{asset.filename}</h4>
                  <p className="text-[10px] text-zinc-500 font-mono mt-1">
                    {(asset.fileSize / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5">
                    <span className="text-[10px] text-zinc-600">
                      {asset.createdAt ? format(new Date(asset.createdAt), 'd MMM, yyyy HH:mm') : 'Recientemente'}
                    </span>
                    <a 
                      href={cleanUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-[10px] text-tad-yellow font-bold uppercase tracking-widest hover:underline flex items-center gap-1"
                    >
                      <Play className="w-3 h-3" /> Vista Previa
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-16 bg-zinc-900/30 border border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center text-center">
          <Film className="w-12 h-12 text-zinc-700 mb-4" />
          <h3 className="text-lg font-bold text-gray-400">No hay archivos multimedia asignados</h3>
          <p className="text-gray-500 mt-2 text-sm max-w-sm">
            Ve a Contenido Multimedia para subir y asignar videos a esta campaña.
          </p>
          <Link href="/media" className="mt-4 text-tad-yellow text-sm font-bold uppercase tracking-widest hover:underline">
            Subir Multimedia →
          </Link>
        </div>
      )}

      {/* Campaign Info */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-zinc-950/50 border border-white/5 rounded-2xl p-6">
          <h3 className="text-sm font-black text-zinc-500 uppercase tracking-widest mb-4">Detalles de la Campaña</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-500">Estado</span>
              <span className="text-white font-bold">{campaign.status === 'active' ? 'Activo' : campaign.status}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Prioridad</span>
              <span className="text-white font-bold">{campaign.priority || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Versión</span>
              <span className="text-white font-bold">v{campaign.version}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Anuncios Solicitados</span>
              <span className="text-tad-yellow font-bold">{(campaign.targetImpressions || campaign.target_impressions || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Creado</span>
              <span className="text-white font-bold font-mono text-xs">
                {campaign.createdAt ? formatDistanceToNow(new Date(campaign.createdAt), { addSuffix: true }) : 'N/A'}
              </span>
            </div>
          </div>
        </div>
        <div className="bg-zinc-950/50 border border-white/5 rounded-2xl p-6">
          <h3 className="text-sm font-black text-zinc-500 uppercase tracking-widest mb-4">Distribución Objetivo</h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-tad-yellow" />
              <span className="text-zinc-500">Ciudades: </span>
              <span className="text-white font-bold">
                {targetCities.length > 0 ? targetCities.join(', ') : 'Todas (Global)'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-tad-yellow" />
              <span className="text-zinc-500">Flota: </span>
              <span className="text-white font-bold">Todos los Nodos Activos</span>
            </div>
          </div>
        </div>
      </div>

      <CampaignModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        campaignId={campaign.id}
        campaignName={campaign.name}
        onSuccess={() => fetchCampaign()}
      />
    </div>
  );
}
