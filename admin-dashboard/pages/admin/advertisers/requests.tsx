import { useEffect, useState } from 'react';
import Head from 'next/head';
import { 
  MessageSquare, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  User, 
  FileText,
  AlertCircle,
  ExternalLink,
  Search,
  Filter,
  Calendar,
  Layers,
  Play
} from 'lucide-react';
import { getPortalRequests, updatePortalRequest } from '@/services/api';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

export default function RequestsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = () => {
    setLoading(true);
    getPortalRequests()
      .then(setRequests)
      .finally(() => setLoading(false));
  };

  const handleAction = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    setProcessing(true);
    try {
      // NOTE: Content linking is now handled server-side in PortalRequestsService.update()
      // The backend activates the campaign, links media, and dispatches FORCE_SYNC on approval.
      await updatePortalRequest(id, { status, adminNotes });
      loadRequests();
      setSelectedRequest(null);
      setAdminNotes('');
      alert(`Petición ${status === 'APPROVED' ? '✅ Aprobada — Contenido desplegado en flota' : '❌ Rechazada'} correctamente.`);
    } catch (err: any) {
      alert('Error: ' + (err.message || 'No se pudo procesar'));
    } finally {
      setProcessing(false);
    }
  };

  const filteredRequests = requests.filter(r => {
    const matchesFilter = filter === 'ALL' || r.status === filter;
    const matchesSearch = r.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (r.advertiser?.companyName || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <>
      <Head>
        <title>Control de Peticiones | TAD Admin</title>
      </Head>

      <div className="space-y-8 pb-20">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
             <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-tad-yellow/10 border border-tad-yellow/20">
                <MessageSquare className="w-4 h-4 text-tad-yellow" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-tad-yellow">Nexus Feedback Hub</span>
             </div>
             <h1 className="text-4xl font-black uppercase italic tracking-tighter">Solicitudes de <span className="text-tad-yellow">Advertisers</span></h1>
          </div>

          <div className="flex bg-zinc-900 border border-white/5 rounded-2xl p-1 shrink-0">
             {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map(f => (
               <button 
                 key={f}
                 onClick={() => setFilter(f)}
                 className={clsx(
                   "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                   filter === f ? "bg-white text-black shadow-lg" : "text-zinc-500 hover:text-white"
                 )}
               >
                 {f === 'ALL' ? 'Todos' : f === 'PENDING' ? 'Pendientes' : f === 'APPROVED' ? 'Aprobados' : 'Rechazos'}
               </button>
             ))}
          </div>
        </header>

        {/* Search Bar */}
        <div className="relative">
           <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600" />
           <input 
             type="text" 
             placeholder="Buscar por marca o asunto..." 
             value={searchTerm}
             onChange={e => setSearchTerm(e.target.value)}
             className="w-full bg-zinc-900/50 border border-white/5 rounded-3xl pl-16 pr-8 py-5 text-sm font-bold placeholder:text-zinc-700 focus:border-tad-yellow/30 outline-none transition-all shadow-inner"
           />
        </div>

        {loading ? (
          <div className="py-40 text-center animate-pulse">
             <div className="w-16 h-16 border-r-2 border-tad-yellow rounded-full animate-spin mx-auto mb-6" />
             <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Sincronizando portal de peticiones...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
             {filteredRequests.map(req => (
               <motion.div 
                 layoutId={req.id}
                 key={req.id}
                 className="bg-zinc-900/40 border border-white/5 rounded-[2.5rem] p-10 flex flex-col md:flex-row md:items-center justify-between gap-10 hover:border-white/10 transition-all hover:bg-zinc-950/60 group"
               >
                 <div className="flex items-start gap-8 flex-1">
                    <div className={clsx(
                      "w-16 h-16 rounded-[1.5rem] flex items-center justify-center border shrink-0 text-2xl",
                      req.status === 'PENDING' ? "bg-amber-500/10 border-amber-500/20 text-amber-500" :
                      req.status === 'APPROVED' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" :
                      "bg-zinc-800 border-white/5 text-zinc-500"
                    )}>
                      {req.type === 'CONTENT_UPDATE' ? <Play className="w-7 h-7" /> : <Layers className="w-7 h-7" />}
                    </div>
                    <div className="space-y-2">
                       <div className="flex items-center gap-3">
                          <h3 className="text-xl font-black uppercase italic tracking-tighter">{req.title}</h3>
                          <span className={clsx(
                            "px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest",
                            req.status === 'PENDING' ? "bg-amber-500/20 text-amber-500" :
                            req.status === 'APPROVED' ? "bg-emerald-500/20 text-emerald-500" :
                            "bg-zinc-800 text-zinc-500"
                          )}>
                            {req.status}
                          </span>
                       </div>
                       <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2 text-zinc-400">
                             <User className="w-3.5 h-3.5 text-tad-yellow" />
                             <span className="text-[10px] font-black uppercase tracking-widest">{req.advertiser?.companyName || 'Marca Desconocida'}</span>
                          </div>
                          <div className="w-1 h-1 rounded-full bg-zinc-800" />
                          <p className="text-xs text-zinc-500 font-medium max-w-sm truncate">{req.description}</p>
                       </div>
                       <div className="flex items-center gap-4 text-[9px] font-black text-zinc-600 uppercase tracking-widest pt-4">
                          <Calendar className="w-3 h-3" /> Solicitado: {new Date(req.createdAt).toLocaleString()}
                       </div>
                    </div>
                 </div>

                 <div className="flex items-center gap-4">
                    <button 
                      onClick={() => setSelectedRequest(req)}
                      className="px-8 py-4 bg-white text-black rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-tad-yellow transition-all"
                    >
                      Revisar Detalles
                    </button>
                    {req.status === 'PENDING' && (
                      <>
                        <button 
                          onClick={() => handleAction(req.id, 'APPROVED')}
                          title="Aprobar Petición"
                          className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-2xl flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-all shadow-lg shadow-emerald-500/5 group-hover:scale-110"
                        >
                           <CheckCircle2 className="w-6 h-6" />
                        </button>
                        <button 
                          onClick={() => handleAction(req.id, 'REJECTED')}
                          title="Rechazar Petición"
                          className="w-14 h-14 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-2xl flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all shadow-lg shadow-rose-500/5"
                        >
                           <XCircle className="w-6 h-6" />
                        </button>
                      </>
                    )}
                 </div>
               </motion.div>
             ))}

             {filteredRequests.length === 0 && (
               <div className="py-40 text-center space-y-6 border-2 border-dashed border-white/5 rounded-[3rem]">
                  <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto text-zinc-800">
                     <Clock className="w-12 h-12" />
                  </div>
                  <div className="space-y-2">
                     <h2 className="text-2xl font-black uppercase italic tracking-tighter">Bandeja Vacía</h2>
                     <p className="text-zinc-600 text-sm max-w-xs mx-auto font-bold uppercase tracking-widest">No hay peticiones que coincidan con tu búsqueda actual.</p>
                  </div>
               </div>
             )}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedRequest && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl">
             <motion.div 
               initial={{ opacity: 0, y: 50 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.9 }}
               className="bg-zinc-900 border border-white/10 rounded-[3rem] w-full max-w-2xl p-12 space-y-10 shadow-[0_50px_100px_-20px_rgba(0,0,0,1)] relative overflow-hidden"
             >
                <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                   <MessageSquare className="w-64 h-64" />
                </div>

                <div className="flex justify-between items-start relative z-10">
                   <div className="space-y-4">
                      <div className="flex items-center gap-3 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 w-fit">
                         <div className="w-2 h-2 rounded-full bg-tad-yellow animate-pulse" />
                         <span className="text-[10px] font-black uppercase tracking-widest">Solicitud ID: {selectedRequest.id.substring(0,8)}</span>
                      </div>
                      <h2 className="text-4xl font-black uppercase italic tracking-tighter leading-none">{selectedRequest.title}</h2>
                      <div className="flex items-center gap-4 text-zinc-500">
                         <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black uppercase tracking-widest text-white">{selectedRequest.advertiser?.companyName}</span>
                         </div>
                         <div className="w-1 h-1 rounded-full bg-zinc-800" />
                         <span className="text-[9px] font-black uppercase tracking-widest leading-loose">{selectedRequest.advertiser?.email}</span>
                      </div>
                   </div>
                   <button onClick={() => setSelectedRequest(null)} className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-zinc-500 hover:text-white transition-all">
                      <XCircle className="w-6 h-6" />
                   </button>
                </div>

                <div className="space-y-8 relative z-10">
                   <div className="bg-black/50 border border-white/5 rounded-3xl p-8 space-y-4">
                      <h3 className="text-[10px] font-black text-tad-yellow uppercase tracking-widest">Descripción del Cliente</h3>
                      <p className="text-sm text-zinc-300 font-medium leading-relaxed">{selectedRequest.description || "Sin descripción proporcionada."}</p>
                   </div>

                   {selectedRequest.type === 'CONTENT_UPDATE' && selectedRequest.data && (
                     <div className="bg-tad-yellow/5 border border-tad-yellow/10 rounded-3xl p-8 flex items-center justify-between">
                        <div className="flex items-center gap-6">
                           <div className="w-14 h-14 bg-black rounded-2xl flex items-center justify-center border border-tad-yellow/20 text-tad-yellow">
                              <Play className="w-6 h-6" />
                           </div>
                           <div>
                              <h4 className="text-xs font-black uppercase tracking-widest text-white">Nuevo Media Asset</h4>
                              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em] mt-1">
                                {typeof selectedRequest.data === 'string' ? JSON.parse(selectedRequest.data).filename : selectedRequest.data.filename}
                              </p>
                           </div>
                        </div>
                        <button 
                          onClick={() => {
                            const url = typeof selectedRequest.data === 'string' ? JSON.parse(selectedRequest.data).url : selectedRequest.data.url;
                            window.open(url, '_blank')
                          }}
                          className="flex items-center gap-2 px-6 py-3 bg-white text-black text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-tad-yellow transition-all"
                        >
                           <ExternalLink className="w-3 h-3" /> Previsualizar
                        </button>
                     </div>
                   )}

                   <div className="space-y-4">
                      <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-4">Respuesta del Administrador (Opcional)</h3>
                      <textarea 
                        value={adminNotes}
                        onChange={e => setAdminNotes(e.target.value)}
                        placeholder="Escribe comentarios para el cliente aquí... (Ej: Espacios aprobados, se reflejarán mañana)"
                        className="w-full bg-black/50 border border-white/5 rounded-[2rem] px-8 py-6 text-sm font-bold text-white placeholder:text-zinc-800 outline-none focus:border-tad-yellow/30 transition-all min-h-[120px] resize-none"
                      />
                   </div>
                </div>

                <div className="flex gap-4 relative z-10 pt-4">
                   <button 
                     disabled={processing}
                     onClick={() => handleAction(selectedRequest.id, 'REJECTED')}
                     className="flex-1 py-5 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all disabled:opacity-30"
                   >
                     Rechazar Petición
                   </button>
                   <button 
                     disabled={processing}
                     onClick={() => handleAction(selectedRequest.id, 'APPROVED')}
                     className="flex-1 py-5 bg-tad-yellow text-black rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] transition-all shadow-xl shadow-tad-yellow/5 disabled:opacity-30"
                   >
                     Aprobar y Ejecutar
                   </button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

