import React, { useEffect, useState } from 'react';
import { AdvertiserLayout } from '@/components/layout/AdvertiserLayout';
import { useAuth } from '@tad/ui';
import { 
  getAdvertiserPortalRequests,
  createPortalRequest
} from "@tad/services";
import { 
  Plus, 
  MessageSquare, 
  Play, 
  Layers, 
  Calendar, 
  AlertCircle 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { useRouter } from 'next/router';

export default function AdvertiserRequests() {
  const { session } = useAuth();
  const router = useRouter();
  const { viewAsAdmin, advId } = router.query;
  const entityId = (viewAsAdmin === 'true' && advId) ? (advId as string) : session?.user?.app_metadata?.entityId;

  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestTitle, setRequestTitle] = useState('');
  const [requestDesc, setRequestDesc] = useState('');

  const loadRequests = () => {
    if (entityId) {
      getAdvertiserPortalRequests(entityId)
        .then(setRequests)
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [entityId]);

  return (
    <AdvertiserLayout title="Soporte & Peticiones" subtitle="Center of Help">
      <div className="flex justify-between items-center mb-8">
        <div>
           <h3 className="text-[10px] font-black text-[#FFD700] uppercase tracking-[0.4em] mb-1">Center of Help</h3>
           <h2 className="text-4xl font-black uppercase italic tracking-tighter text-white">Peticiones <span className="text-zinc-500">de Cuenta</span></h2>
        </div>
        <button 
          onClick={() => setIsRequestModalOpen(true)}
          className="flex items-center gap-3 px-6 py-3 bg-[#FFD700] text-black rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-[0_10px_30px_rgba(255,215,0,0.2)]"
        >
          <Plus className="w-4 h-4" /> Nueva Solicitud
        </button>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="py-20 flex justify-center">
            <div className="w-8 h-8 border-2 border-[#FFD700] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : requests.length === 0 ? (
          <div className="py-20 text-center space-y-6 border border-white/5 bg-zinc-900/30 backdrop-blur-xl rounded-[2.5rem]">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto text-zinc-700">
               <MessageSquare className="w-8 h-8" />
            </div>
            <div className="space-y-2">
               <h3 className="text-lg font-black uppercase italic text-white">Sin solicitudes pendientes</h3>
               <p className="text-zinc-500 text-sm max-w-xs mx-auto">Cuando pidas más espacios o actualizaciones de contenido, aparecerán aquí.</p>
            </div>
          </div>
        ) : (
          requests.map((req: any) => (
            <div key={req.id} className="bg-zinc-900/40 backdrop-blur-xl border border-white/5 rounded-[2rem] p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 group hover:border-[#FFD700]/30 transition-all">
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
                      <h4 className="text-lg font-black uppercase italic tracking-tight text-white">{req.title}</h4>
                      <span className={clsx(
                        "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border",
                        req.status === 'PENDING' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                        req.status === 'APPROVED' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                        "bg-zinc-800 text-zinc-500 border-zinc-700"
                      )}>
                        {req.status === 'PENDING' ? 'Pendiente' : req.status === 'APPROVED' ? 'Aprobado' : 'Rechazado'}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 font-medium leading-relaxed max-w-md">{req.description}</p>
                    <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/5">
                       <div className="flex items-center gap-1.5 text-[9px] font-black text-zinc-500 uppercase tracking-widest">
                          <Calendar className="w-3 h-3" /> {new Date(req.createdAt).toLocaleDateString()}
                       </div>
                       {req.adminNotes && (
                         <div className="flex items-center gap-1.5 text-[9px] font-black text-[#FFD700] uppercase tracking-widest bg-[#FFD700]/10 px-3 py-1 rounded-full border border-[#FFD700]/20">
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

      <AnimatePresence>
        {isRequestModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl">
             <motion.div 
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.9 }}
               className="bg-zinc-950 border border-white/10 rounded-[2.5rem] w-full max-w-lg p-10 space-y-8 shadow-[0_30px_100px_rgba(0,0,0,0.8)] relative overflow-hidden"
             >
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFD700]/5 blur-[80px] rounded-full -translate-y-1/2 translate-x-1/4 pointer-events-none" />

                <div className="space-y-2 text-center relative z-10">
                   <h2 className="text-3xl font-black uppercase italic tracking-tighter text-white">Nueva Solicitud</h2>
                   <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Pide más espacios o cambios específicos</p>
                </div>

                <div className="space-y-4 relative z-10">
                   <div className="space-y-1">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-4">Asunto de la petición</label>
                      <select 
                        value={requestTitle}
                        onChange={(e) => setRequestTitle(e.target.value)}
                        className="w-full bg-black/50 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold text-white outline-none focus:border-[#FFD700]/50 transition-all appearance-none"
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
                        className="w-full bg-black/50 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold text-white outline-none focus:border-[#FFD700]/50 transition-all min-h-[120px] resize-none"
                      />
                   </div>
                </div>

                <div className="flex gap-4 relative z-10">
                   <button 
                     onClick={() => setIsRequestModalOpen(false)}
                     className="flex-1 py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
                   >
                     Cancelar
                   </button>
                   <button 
                     disabled={!requestTitle || !requestDesc}
                     onClick={async () => {
                        if (!entityId) return;
                        await createPortalRequest({
                          advertiserId: entityId,
                          type: 'SPACE_REQUEST',
                          title: requestTitle,
                          description: requestDesc
                        });
                        setIsRequestModalOpen(false);
                        setRequestTitle('');
                        setRequestDesc('');
                        loadRequests();
                     }}
                     className="flex-1 py-4 bg-[#FFD700] text-black rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-yellow-400 transition-all disabled:opacity-30"
                   >
                     Enviar Solicitud
                   </button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AdvertiserLayout>
  );
}
