import { useEffect, useState, useMemo, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { 
  BarChart3, 
  Play, 
  Upload, 
  Activity, 
  TrendingUp, 
  Users, 
  Calendar,
  ChevronRight,
  Sparkles,
  Layers,
  Zap,
  CheckCircle2,
  Clock,
  ExternalLink,
  Plus,
  LogOut,
  Mail,
  Phone,
  Globe,
  Settings,
  Download,
  Image as ImageIcon,
  MessageSquare,
  LifeBuoy,
  FileText,
  AlertCircle
} from 'lucide-react';
import { 
  getAdvertiserPortalData, 
  uploadMedia, 
  addVideoToCampaign, 
  downloadWeeklyCampaignPdf,
  getAdvertiserPortalRequests,
  createPortalRequest
} from '../../../services/api';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdvertiserPortal() {
  const router = useRouter();
  const { id } = router.query;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'analytics' | 'content' | 'requests'>('analytics');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [requests, setRequests] = useState<any[]>([]);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestTitle, setRequestTitle] = useState('');
  const [requestDesc, setRequestDesc] = useState('');

  const loadData = () => {
    if (id) {
      getAdvertiserPortalData(id as string)
        .then(setData)
        .catch(() => {
          // Fallback logic
        })
        .finally(() => setLoading(false));
      
      loadRequests();
    }
  };

  const loadRequests = () => {
    if (id) {
      getAdvertiserPortalRequests(id as string)
        .then(setRequests)
        .catch(console.error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('tad_advertiser_token');
    localStorage.removeItem('tad_advertiser_id');
    router.push('/p/advertiser/login');
  };

  useEffect(() => {
    // SECURITY: Ensure only authorized admins or the specific advertiser can view this portal
    if (typeof window !== 'undefined') {
      const adminToken = localStorage.getItem('tad_admin_token');
      const advToken = localStorage.getItem('tad_advertiser_token');
      const advId = localStorage.getItem('tad_advertiser_id');

      if (!adminToken) {
        if (!advToken || advId !== id) {
          router.replace('/p/advertiser/login');
          return;
        }
      }

      if (id) {
        getAdvertiserPortalData(id as string)
          .then(setData)
          .catch(() => {
            // Failed to load data, maybe token expired or ID invalid
            if (!adminToken) {
              localStorage.removeItem('tad_advertiser_token');
              localStorage.removeItem('tad_advertiser_id');
              router.replace('/p/advertiser/login');
            }
          })
          .finally(() => setLoading(false));
      }
    }
  }, [id, router]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'video/mp4' && file.type !== 'video/webm' && !file.type.startsWith('image/')) {
      alert('Solo se permiten archivos MP4, WEBM o Imágenes.');
      return;
    }
    if (!data?.campaigns?.[0]?.id) {
      alert('No tienes una campaña activa para vincular este archivo.');
      return;
    }

    setUploading(true);
    setUploadProgress(10);
    try {
      const campaignId = data.campaigns[0].id;
      const uploadedData = await uploadMedia(file, campaignId);
      setUploadProgress(70);

      await createPortalRequest({
        advertiserId: id as string,
        campaignId: campaignId,
        type: 'CONTENT_UPDATE',
        title: `Actualización de Contenido: ${file.name}`,
        description: `Solicitud de nuevo contenido multimedia para la campaña.`,
        data: {
          type: file.type.startsWith('image/') ? 'image' : 'video',
          filename: file.name,
          url: uploadedData.url,
          fileSize: file.size,
          checksum: uploadedData.id,
          duration: 30
        }
      });
      setUploadProgress(100);
      
      setTimeout(() => {
        alert('Solicitud enviada correctamente. Un administrador revisará tu nuevo contenido antes de activarlo.');
        loadData();
        setUploading(false);
      }, 1000);
    } catch (err: any) {
      console.error(err);
      alert('Error al subir el archivo: ' + (err.message || 'Intente nuevamente'));
      setUploading(false);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (loading) return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 text-center">
      <div className="relative">
        <div className="w-16 h-16 border-r-2 border-tad-yellow rounded-full animate-spin" />
        <Activity className="absolute inset-0 m-auto w-6 h-6 text-tad-yellow/40 animate-pulse" />
      </div>
      <p className="mt-8 text-[10px] font-black uppercase tracking-[0.5em] text-zinc-600 animate-pulse">Sincronizando Nexus...</p>
    </div>
  );

  if (!data) return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 text-center">
      <div className="bg-zinc-900/50 border border-white/5 p-12 rounded-[2.5rem] space-y-4">
        <h1 className="text-2xl font-black uppercase italic">Enlace No Válido</h1>
        <p className="text-zinc-500 text-sm">El acceso a este portal ha caducado o es incorrecto.</p>
        <button onClick={() => { localStorage.removeItem('tad_advertiser_token'); router.push('/p/advertiser/login'); }} className="px-8 py-3 bg-tad-yellow text-black font-black uppercase text-[10px] tracking-widest rounded-2xl">Volver al Inicio</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-tad-yellow selection:text-black pb-20 overflow-x-hidden">
      <Head>
        <title>{data.brand.name} | TAD Advertiser Portal</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>

      {/* Hero Header */}
      <header className="relative pt-16 pb-12 px-6 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[400px] bg-tad-yellow/10 blur-[150px] rounded-full -z-10" />
        
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                <div className="w-1.5 h-1.5 rounded-full bg-tad-yellow animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-tad-yellow">Advertiser Nexus v4.5</span>
              </div>
              <h1 className="text-5xl md:text-7xl font-black tracking-tighter uppercase italic leading-[0.85]">
                {data.brand.name.split(' ')[0]} <br />
                <span className="text-tad-yellow">{data.brand.name.split(' ').slice(1).join(' ') || 'Partner'}</span>
              </h1>
              <p className="text-zinc-500 text-xs font-bold uppercase tracking-[0.4em]">{data.brand.category || 'General'} &middot; Dominando la Ciudad</p>
            </div>

            <div className="flex gap-2">
               <button 
                 onClick={() => setActiveTab('analytics')}
                 className={clsx(
                   "flex-1 md:flex-none px-8 py-4 rounded-3xl text-[10px] font-black uppercase tracking-widest transition-all",
                   activeTab === 'analytics' ? "bg-white text-black shadow-[0_20px_40px_rgba(255,255,255,0.1)]" : "bg-white/5 border border-white/10 text-zinc-400 hover:bg-white/10"
                 )}
               >
                 Métricas
               </button>
               <button 
                 onClick={() => setActiveTab('content')}
                 className={clsx(
                   "flex-1 md:flex-none px-8 py-4 rounded-3xl text-[10px] font-black uppercase tracking-widest transition-all",
                   activeTab === 'content' ? "bg-tad-yellow text-black shadow-[0_20px_40px_rgba(250,212,0,0.15)]" : "bg-white/5 border border-white/10 text-zinc-400 hover:bg-white/10"
                 )}
               >
                 Contenido
               </button>
               <button 
                 onClick={() => setActiveTab('requests')}
                 className={clsx(
                   "flex-1 md:flex-none px-8 py-4 rounded-3xl text-[10px] font-black uppercase tracking-widest transition-all",
                   activeTab === 'requests' ? "bg-white text-black shadow-[0_20px_40px_rgba(255,255,255,0.1)]" : "bg-white/5 border border-white/10 text-zinc-400 hover:bg-white/10"
                 )}
               >
                 Solicitudes
               </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6">
        <AnimatePresence mode="wait">
          {activeTab === 'analytics' ? (
            <motion.div 
              key="analytics"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Stats Bento Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard 
                  label="Alcance Impactado" 
                  value={data.stats.totalImpressions.toLocaleString()} 
                  sub="Impresiones Totales" 
                  icon={<Users className="w-5 h-5" />} 
                  color="text-tad-yellow"
                />
                <StatCard 
                  label="Fidelidad Visual" 
                  value={`${((data.stats.totalCompletions / (data.stats.totalImpressions || 1)) * 100).toFixed(1)}%`} 
                  sub="Completion Rate" 
                  icon={<Play className="w-5 h-5" />} 
                  color="text-emerald-400"
                />
                <StatCard 
                  label="Conexión QR" 
                  value={data.stats.totalScans || 0} 
                  sub="Escaneos Reales" 
                  icon={<Zap className="w-5 h-5" />} 
                  color="text-rose-400"
                />
                <StatCard 
                  label="Flota Asignada" 
                  value={data.stats.activeCampaigns} 
                  sub="Campañas Activas" 
                  icon={<Layers className="w-5 h-5" />} 
                  color="text-white"
                />
              </div>

               {/* Insights & Brand Card */}
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <div className="md:col-span-2 bg-zinc-900/40 border border-white/5 rounded-[2.5rem] p-10 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8">
                       <TrendingUp className="w-12 h-12 text-zinc-800 transition-transform group-hover:scale-125 duration-1000" />
                    </div>
                    <h3 className="text-[10px] font-black text-tad-yellow uppercase tracking-[0.4em] mb-4">Performance Insights</h3>
                    <h2 className="text-3xl font-black uppercase italic tracking-tighter mb-8 max-w-sm">Tu marca está <span className="text-tad-yellow underline decoration-white/20 underline-offset-8">impactando</span> la ciudad.</h2>
                    
                    <div className="flex items-end gap-1.5 h-32 md:h-48 mb-6">
                      {[40, 65, 45, 85, 95, 75, 80].map((h, i) => (
                        <div key={i} className="flex-1 space-y-2">
                          <div 
                             className={clsx(
                               "w-full bg-white/5 border-t border-tad-yellow/30 relative group/bar transition-all duration-1000",
                               h === 40 && "h-[40%]",
                               h === 65 && "h-[65%]",
                               h === 45 && "h-[45%]",
                               h === 85 && "h-[85%]",
                               h === 95 && "h-[95%]",
                               h === 75 && "h-[75%]",
                               h === 80 && "h-[80%]"
                             )}
                          >
                             <div className="absolute inset-x-0 bottom-0 bg-tad-yellow/20 h-0 transition-all group-hover/bar:h-full" />
                          </div>
                          <p className="text-[8px] font-black text-zinc-600 text-center uppercase tracking-widest">{['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'][i]}</p>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-4">
                       <button 
                         onClick={() => downloadWeeklyCampaignPdf(data.campaigns[0]?.id, data.brand.name)}
                         className="flex items-center gap-2 px-6 py-3 bg-white text-black text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-tad-yellow transition-all shadow-xl shadow-white/5"
                       >
                         <Download className="w-3 h-3" /> Descargar Reporte PDF
                       </button>
                       <button 
                         onClick={() => setActiveTab('requests')}
                         className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 text-white text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-white/10 transition-all"
                       >
                         <LifeBuoy className="w-3 h-3 text-tad-yellow" /> Soporte & Expansión
                       </button>
                    </div>
                 </div>

                 <div className="bg-zinc-900/40 border border-white/5 rounded-[2.5rem] p-10 space-y-8">
                    <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.4em]">Brand Profile</h3>
                    
                    <div className="space-y-6">
                       <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                             <Mail className="w-4 h-4 text-tad-yellow" />
                          </div>
                          <div>
                             <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Email Comercial</p>
                             <p className="text-xs font-bold text-white truncate max-w-[150px]">{data.brand.email}</p>
                          </div>
                       </div>

                       <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                             <Phone className="w-4 h-4 text-tad-yellow" />
                          </div>
                          <div>
                             <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Contacto Directo</p>
                             <p className="text-xs font-bold text-white">{data.brand.phone || 'Pendiente'}</p>
                          </div>
                       </div>

                       <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                             <Globe className="w-4 h-4 text-tad-yellow" />
                          </div>
                          <div>
                             <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Industria</p>
                             <p className="text-xs font-bold text-white">{data.brand.category || 'Advertiser'}</p>
                          </div>
                       </div>
                    </div>

                    <div className="pt-4 border-t border-white/5">
                       <button className="w-full flex items-center justify-center gap-2 py-4 bg-white/5 border border-white/10 rounded-2xl text-[9px] font-black uppercase tracking-widest text-zinc-400 hover:text-white hover:bg-white/10 transition-all">
                          <Settings className="w-3 h-3" /> Editar Perfil QR
                       </button>
                    </div>
                 </div>
               </div>
            </motion.div>
          ) : activeTab === 'content' ? (
            <motion.div 
              key="content"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center mb-8">
                <div>
                   <h3 className="text-[10px] font-black text-tad-yellow uppercase tracking-[0.4em] mb-1">Media Management</h3>
                   <h2 className="text-2xl font-black uppercase italic">Playlist <span className="text-zinc-500">v4</span></h2>
                </div>
                <input type="file" title="Upload Media" ref={fileInputRef} className="hidden" accept="video/mp4, video/webm, image/*" onChange={handleFileSelect} />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-3 px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-tad-yellow hover:text-black transition-all disabled:opacity-50"
                >
                  {uploading ? (
                    <div className="flex items-center gap-2">
                       <Activity className="w-4 h-4 animate-spin" />
                       Subiendo... {uploadProgress}%
                    </div>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Actualizar Contenido
                    </>
                  )}
                </button>
              </div>

              <div className="space-y-4">
                {data.campaigns[0]?.media.map((item: any) => (
                  <div key={item.id} className="bg-zinc-900/60 border border-white/5 rounded-3xl p-6 flex items-center justify-between group hover:border-tad-yellow/20 transition-all">
                    <div className="flex items-center gap-6">
                       <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center border border-white/10 overflow-hidden relative">
                         {item.type?.includes('video') ? <Play className="w-6 h-6 text-tad-yellow" /> : <Layers className="w-6 h-6 text-tad-yellow" />}
                         <div className="absolute inset-0 bg-tad-yellow/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                       </div>
                       <div className="space-y-1">
                          <h4 className="text-sm font-black uppercase tracking-tight">{item.name || 'Anuncio TAD'}</h4>
                          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{item.type || 'MP4 1080p'} &middot; 15s</p>
                       </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                       <div className="hidden md:flex flex-col items-end">
                          <div className="flex items-center gap-2 text-emerald-400">
                             <CheckCircle2 className="w-3.5 h-3.5" />
                             <span className="text-[9px] font-black uppercase tracking-widest">Sincronizado</span>
                          </div>
                          <p className="text-[8px] text-zinc-600 font-bold uppercase tracking-widest mt-1">Fleet Sync OK</p>
                       </div>
                       <button title="Ver Detalles del Asset" aria-label="Ver Detalles del Asset" className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-zinc-600 hover:text-white hover:bg-white/10 transition-all">
                          <ChevronRight className="w-5 h-5" />
                       </button>
                    </div>
                  </div>
                ))}

                {/* Placeholder empty campaign */}
                {data.campaigns.length === 0 && (
                   <div className="py-20 text-center space-y-6 border-2 border-dashed border-white/5 rounded-[2.5rem]">
                      <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto">
                         <Plus className="w-8 h-8 text-zinc-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-black uppercase italic">Sin Campañas Activas</h3>
                        <p className="text-zinc-500 text-sm max-w-xs mx-auto">Tus anuncios no se están transmitiendo. Contacta a soporte para activar tu plan.</p>
                      </div>
                   </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="requests"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center mb-8">
                <div>
                   <h3 className="text-[10px] font-black text-tad-yellow uppercase tracking-[0.4em] mb-1">Center of Help</h3>
                   <h2 className="text-2xl font-black uppercase italic">Peticiones <span className="text-zinc-500">al Admin</span></h2>
                </div>
                <button 
                  onClick={() => setIsRequestModalOpen(true)}
                  className="flex items-center gap-3 px-6 py-3 bg-tad-yellow text-black rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-tad-yellow/10"
                >
                  <Plus className="w-4 h-4" /> Nueva Solicitud
                </button>
              </div>

              <div className="space-y-4">
                {requests.length === 0 ? (
                  <div className="py-20 text-center space-y-6 border-2 border-dashed border-white/5 rounded-[2.5rem]">
                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto text-zinc-700">
                       <MessageSquare className="w-8 h-8" />
                    </div>
                    <div className="space-y-2">
                       <h3 className="text-lg font-black uppercase italic">Sin solicitudes pendientes</h3>
                       <p className="text-zinc-500 text-sm max-w-xs mx-auto">Cuando pidas más espacios o actualizaciones de contenido, aparecerán aquí.</p>
                    </div>
                  </div>
                ) : (
                  requests.map((req: any) => (
                    <div key={req.id} className="bg-zinc-900/60 border border-white/5 rounded-[2rem] p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 group hover:border-white/10 transition-all">
                      <div className="flex items-start gap-6">
                         <div className={clsx(
                           "w-14 h-14 rounded-2xl flex items-center justify-center border shrink-0",
                           req.status === 'PENDING' ? "bg-amber-500/10 border-amber-500/20 text-amber-500" :
                           req.status === 'APPROVED' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" :
                           "bg-zinc-800 border-zinc-700 text-zinc-500"
                         )}>
                           {req.type === 'CONTENT_UPDATE' ? <Play className="w-6 h-6" /> : <Layers className="w-6 h-6" />}
                         </div>
                         <div className="space-y-1">
                            <div className="flex items-center gap-3">
                              <h4 className="text-lg font-black uppercase italic tracking-tight">{req.title}</h4>
                              <span className={clsx(
                                "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest",
                                req.status === 'PENDING' ? "bg-amber-500/20 text-amber-500" :
                                req.status === 'APPROVED' ? "bg-emerald-500/20 text-emerald-500" :
                                "bg-zinc-800 text-zinc-500"
                              )}>
                                {req.status === 'PENDING' ? 'Pendiente' : req.status === 'APPROVED' ? 'Aprobado' : 'Rechazado'}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-500 font-medium leading-relaxed max-w-md">{req.description}</p>
                            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/5">
                               <div className="flex items-center gap-1.5 text-[9px] font-black text-zinc-600 uppercase tracking-widest">
                                  <Calendar className="w-3 h-3" /> {new Date(req.createdAt).toLocaleDateString()}
                               </div>
                               {req.adminNotes && (
                                 <div className="flex items-center gap-1.5 text-[9px] font-black text-tad-yellow uppercase tracking-widest">
                                    <AlertCircle className="w-3 h-3" /> Respueta del Admin: {req.adminNotes}
                                 </div>
                               )}
                            </div>
                         </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Request Modal */}
        {isRequestModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
             <motion.div 
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               className="bg-zinc-900 border border-white/10 rounded-[2.5rem] w-full max-w-lg p-10 space-y-8 shadow-2xl"
             >
                <div className="space-y-2 text-center">
                   <h2 className="text-3xl font-black uppercase italic tracking-tighter">Nueva Solicitud</h2>
                   <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Pide más espacios o cambios específicos</p>
                </div>

                <div className="space-y-4">
                   <div className="space-y-1">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-4">Asunto de la petición</label>
                      <select 
                        value={requestTitle}
                        onChange={(e) => setRequestTitle(e.target.value)}
                        className="w-full bg-black/50 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:border-tad-yellow/30 transition-all"
                      >
                         <option value="">Selecciona una opción...</option>
                         <option value="Solicitud de más espacios publicitarios">Pedir más espacios (Flota)</option>
                         <option value="Actualización de información de marca">Actualizar datos de marca</option>
                         <option value="Problema técnico con el contenido">Reportar error técnico</option>
                         <option value="Otro">Otro asunto...</option>
                      </select>
                   </div>

                   <div className="space-y-1">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-4">Detalles adicionales</label>
                      <textarea 
                        value={requestDesc}
                        onChange={(e) => setRequestDesc(e.target.value)}
                        placeholder="Explica qué necesitas con detalle..."
                        className="w-full bg-black/50 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:border-tad-yellow/30 transition-all min-h-[120px] resize-none"
                      />
                   </div>
                </div>

                <div className="flex gap-4">
                   <button 
                     onClick={() => setIsRequestModalOpen(false)}
                     className="flex-1 py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                   >
                     Cancelar
                   </button>
                   <button 
                     disabled={!requestTitle || !requestDesc}
                     onClick={async () => {
                        await createPortalRequest({
                          advertiserId: id as string,
                          type: 'SPACE_REQUEST',
                          title: requestTitle,
                          description: requestDesc
                        });
                        setIsRequestModalOpen(false);
                        setRequestTitle('');
                        setRequestDesc('');
                        loadRequests();
                     }}
                     className="flex-1 py-4 bg-tad-yellow text-black rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-yellow-400 transition-all disabled:opacity-30"
                   >
                     Enviar Solicitud
                   </button>
                </div>
             </motion.div>
          </div>
        )}
      </main>

      {/* Quick Actions Float */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
        <div className="bg-black/90 backdrop-blur-2xl border border-white/10 rounded-3xl p-2 flex gap-1 shadow-[0_30px_60px_rgba(0,0,0,0.8)]">
           <FloatButton icon={<BarChart3 className="w-4 h-4" />} active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')} />
           <FloatButton icon={<Upload className="w-4 h-4" />} active={activeTab === 'content'} onClick={() => setActiveTab('content')} />
           <FloatButton icon={<MessageSquare className="w-4 h-4" />} active={activeTab === 'requests'} onClick={() => setActiveTab('requests')} />
           <div className="w-px h-6 bg-white/10 mx-2 self-center" />
           <FloatButton icon={<ExternalLink className="w-4 h-4" />} onClick={() => window.open('https://tad.do', '_blank')} />
           <div className="w-px h-6 bg-white/10 mx-2 self-center" />
           <FloatButton icon={<LogOut className="w-4 h-4" />} onClick={handleLogout} />
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, icon, color }: any) {
  return (
    <div className="bg-zinc-900/40 border border-white/5 rounded-[2rem] p-6 space-y-4 hover:bg-zinc-950/60 transition-all group overflow-hidden relative">
      <div className={clsx("w-10 h-10 rounded-xl bg-black border border-white/5 flex items-center justify-center group-hover:scale-110 transition-transform", color)}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-1">{label}</p>
        <p className="text-2xl font-black tracking-tight">{value}</p>
        <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mt-1">{sub}</p>
      </div>
      <div className="absolute -bottom-1 -right-1 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity">
        {icon}
      </div>
    </div>
  );
}

function FloatButton({ icon, active, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={clsx(
        "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
        active ? "bg-tad-yellow text-black" : "text-zinc-500 hover:text-white"
      )}
    >
      {icon}
    </button>
  );
}
